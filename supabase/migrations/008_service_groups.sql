-- 008: Υπηρεσίες ανά είδος καταστήματος.
-- Κάθε υπηρεσία μπαίνει σε ομάδα (Κούρεμα, Χρώμα…), μπορεί να έχει οδηγία προς τον πελάτη και τιμή «από».
-- Το save_business αποθηκεύει τα νέα πεδία και επιστρέφει τα ids των υπηρεσιών (για να δοθούν στα άτομα της ομάδας).
-- Ασφαλές να τρέξει ξανά.

alter table services add column if not exists grp text;
alter table services add column if not exists note text;
alter table services add column if not exists price_from boolean not null default false;

create or replace function save_business(p_biz jsonb, p_services jsonb, p_hours jsonb, p_removed uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); bid uuid := nullif(p_biz->>'id','')::uuid; x jsonb; sid uuid; ids jsonb := '{}';
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  if bid is not null and not is_owner(bid) then return jsonb_build_object('ok',false,'error','Δεν έχεις πρόσβαση'); end if;
  if coalesce(trim(p_biz->>'name'),'') = '' then return jsonb_build_object('ok',false,'error','Γράψε όνομα καταστήματος'); end if;

  if bid is null then
    insert into businesses(owner_id,name,category,city) values (uid, trim(p_biz->>'name'), (p_biz->>'category')::business_category, coalesce(p_biz->>'city',''))
      returning id into bid;
  end if;
  update businesses set
    name=trim(p_biz->>'name'), category=(p_biz->>'category')::business_category, city=coalesce(p_biz->>'city',''),
    address=p_biz->>'address', phone=p_biz->>'phone', description=p_biz->>'description',
    logo_url=p_biz->>'logo_url', cover_url=p_biz->>'cover_url', brand_color=p_biz->>'brand_color',
    layout=p_biz->>'layout', theme=p_biz->>'theme',
    max_days_ahead=coalesce(nullif(p_biz->>'max_days_ahead','')::int,14),
    cancel_before_min=coalesce(nullif(p_biz->>'cancel_before_min','')::int,0),
    requires_approval=coalesce((p_biz->>'requires_approval')::boolean,false),
    uses_credits=coalesce((p_biz->>'uses_credits')::boolean,false),
    package_days=coalesce(nullif(p_biz->>'package_days','')::int,30),
    is_published=coalesce((p_biz->>'is_published')::boolean,false)
  where id=bid;

  update services set active=false where business_id=bid and id = any(p_removed);
  for x in select * from jsonb_array_elements(coalesce(p_services,'[]')) loop
    continue when coalesce(trim(x->>'name'),'') = '';
    sid := nullif(x->>'id','')::uuid;
    if sid is not null then
      update services set name=trim(x->>'name'), duration_min=coalesce(nullif(x->>'duration_min','')::int,30),
        capacity=coalesce(nullif(x->>'capacity','')::int,1), price_cents=nullif(x->>'price_cents','')::int,
        grp=nullif(trim(x->>'grp'),''), note=nullif(trim(x->>'note'),''), price_from=coalesce((x->>'price_from')::boolean,false)
        where id=sid and business_id=bid;
    else
      insert into services(business_id,name,duration_min,capacity,price_cents,grp,note,price_from)
        values (bid, trim(x->>'name'), coalesce(nullif(x->>'duration_min','')::int,30), coalesce(nullif(x->>'capacity','')::int,1), nullif(x->>'price_cents','')::int,
          nullif(trim(x->>'grp'),''), nullif(trim(x->>'note'),''), coalesce((x->>'price_from')::boolean,false))
        returning id into sid;
    end if;
    ids := ids || jsonb_build_object(x->>'key', sid);
  end loop;

  delete from opening_hours where business_id=bid;
  insert into opening_hours(business_id,weekday,opens,closes,service_id)
    select bid, (h->>'weekday')::smallint, (h->>'opens')::time, (h->>'closes')::time, nullif(ids->>(h->>'svc'),'')::uuid
    from jsonb_array_elements(coalesce(p_hours,'[]')) h
    where h->>'svc' is null or ids ? (h->>'svc');

  return jsonb_build_object('ok',true,'id',bid,'ids',ids);
end $$;

grant execute on function save_business(jsonb,jsonb,jsonb,uuid[]) to authenticated;
