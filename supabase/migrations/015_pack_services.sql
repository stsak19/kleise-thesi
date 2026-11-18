-- 015: Πακέτο για συγκεκριμένα μαθήματα (2026-11-18).
-- Ο ιδιοκτήτης διαλέγει σε ποια μαθήματα ισχύει ένα πακέτο (π.χ. «Crossfit 8»). Όταν ενεργοποιηθεί,
-- ο πελάτης βλέπει στο πρόγραμμα μόνο αυτά, και η κράτηση σε άλλο μάθημα δεν περνά.
-- Κενό service_ids = ισχύει για όλα (όπως πριν). Τρέχει ΜΕΤΑ το 013 (χρειάζεται τον πίνακα pack_history).

alter table packages add column if not exists service_ids uuid[];
alter table memberships add column if not exists pack_services uuid[];

create or replace function owner_activate_package(p_business uuid, p_user uuid, p_package uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pk packages; m memberships; bname text; add_n int; left_n int;
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  select * into m from memberships where business_id=p_business and user_id=p_user for update;
  if not found then
    insert into memberships(business_id,user_id,status) values (p_business,p_user,'approved') returning * into m;
  end if;
  select * into pk from packages where id=coalesce(p_package, m.pending_package) and business_id=p_business;
  if not found then return jsonb_build_object('ok',false,'error','Δεν βρέθηκε το πακέτο'); end if;
  select name into bname from businesses where id=p_business;
  if pk.sessions is not null or pk.kind='sub' then
    -- Οι επισκέψεις που έμειναν από πριν κρατιούνται (εκτός αν ήταν απεριόριστες).
    left_n := case when m.credits_total is null and m.credits >= 9000 then 0 else greatest(m.credits,0) end;
    add_n := coalesce(pk.sessions, 9999);
    update memberships set status='approved', credits=case when pk.sessions is null then 9999 else left_n+add_n end,
      credits_total=case when pk.sessions is null then null else left_n+add_n end,
      credits_since=current_date, credits_lost=0, pack_name=pk.name, pack_days=pk.days, pack_services=pk.service_ids,
      pending_package=null, pending_at=null
      where business_id=p_business and user_id=p_user;
    insert into credit_log(business_id,user_id,kind,delta) values (p_business,p_user,'package',case when pk.sessions is null then 9999 else add_n end);
  else
    update memberships set status='approved', pending_package=null, pending_at=null, pack_services=pk.service_ids where business_id=p_business and user_id=p_user;
  end if;
  perform notify(p_user, bname, format('Το πακέτο «%s» ενεργοποιήθηκε. Καλή αρχή!', pk.name));
  return jsonb_build_object('ok',true);
end $$;


create or replace function owner_renew(p_business uuid, p_user uuid, p_credits int) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  update memberships set credits=p_credits, credits_total=p_credits, credits_since=current_date, credits_lost=0, pack_name=null, pack_days=null, pack_services=null
    where business_id=p_business and user_id=p_user;
  insert into credit_log(business_id,user_id,kind,delta) values (p_business,p_user,'renew',p_credits);
  return jsonb_build_object('ok',true);
end $$;

create or replace function my_bookings() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('id',bk.id,'date',bk.date,'time',to_char(bk.time,'HH24:MI'),
        'status',bk.status,'service',s.name,'service_id',s.id,'business',b.name,'business_id',b.id,'address',b.address,
        'staff_id',bk.staff_id,'staff',st.name)
        order by bk.date,bk.time)
      from bookings bk join services s on s.id=bk.service_id join businesses b on b.id=bk.business_id left join staff st on st.id=bk.staff_id
      where bk.user_id=auth.uid() and bk.date >= athens_today() - 30), '[]'),
    'waitlist', coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'date',w.date,'time',to_char(w.time,'HH24:MI'),
        'service',s.name,'service_id',s.id,'business',b.name))
      from waitlist w join services s on s.id=w.service_id join businesses b on b.id=s.business_id
      where w.user_id=auth.uid() and w.date >= athens_today()), '[]'),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('business_id',m.business_id,'business',b.name,'status',m.status,
        'credits',m.credits,'total',m.credits_total,'pack',m.pack_name,'services',m.pack_services,'unlimited',(m.credits_total is null and m.credits >= 9000),
        'expires', case when b.uses_credits and m.credits_since is not null then m.credits_since + coalesce(m.pack_days, b.package_days) end,
        'pending_package', case when pk.id is not null then jsonb_build_object('id',pk.id,'name',pk.name) end))
      from memberships m join businesses b on b.id=m.business_id left join packages pk on pk.id=m.pending_package
      where m.user_id=auth.uid()), '[]'),
    'pack_history', coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'business_id',h.business_id,'business',b.name,
        'pack',h.pack_name,'total',h.credits_total,'credits',h.credits_left,'started',h.started,'expires',h.expires,'reason',h.reason)
        order by h.ended_at desc)
      from pack_history h join businesses b on b.id=h.business_id
      where h.user_id=auth.uid()), '[]')) $$;

-- Ο πελάτης δεν κλείνει μάθημα που δεν καλύπτει το πακέτο του (μόνο όταν κλείνει ο ίδιος· ο ιδιοκτήτης μπορεί).
create or replace function check_pack_services() returns trigger
language plpgsql security definer set search_path=public as $$
declare ps uuid[];
begin
  if new.user_id is distinct from auth.uid() then return new; end if;
  select m.pack_services into ps from memberships m join businesses b on b.id=m.business_id
    where m.business_id=new.business_id and m.user_id=new.user_id and b.uses_credits;
  if ps is not null and array_length(ps,1) > 0 and not (new.service_id = any(ps)) then
    raise exception 'Το πακέτο σου δεν ισχύει για αυτό το μάθημα';
  end if;
  return new;
end $$;
drop trigger if exists bookings_pack_services on bookings;
create trigger bookings_pack_services before insert on bookings for each row execute function check_pack_services();
