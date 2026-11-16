-- ============================================================
-- 005: η βάση κάνει ό,τι κάνει ήδη η εφαρμογή στο demo.
--  1) Ομάδα (staff) και άτομο σε κάθε κράτηση
--  2) Καρτέλα πελάτη: σημείωση/ετικέτα (client_cards), ιστορικό
--  3) Ώρα Αθήνας αντί για UTC στις μέρες
--  4) Λίστα αναμονής: έλεγχος ότι η εναλλακτική κράτηση είναι δική σου
--  5) Ατομική αποθήκευση καταστήματος (save_business)
-- Τρέχει με ασφάλεια πάνω στα 001–004. Μπορεί να ξανατρέξει.
-- ============================================================

-- ---------- Βοηθητικό: σημερινή μέρα στην Ελλάδα ----------
create or replace function athens_today() returns date language sql stable as
$$ select (now() at time zone 'Europe/Athens')::date $$;

-- ---------- 1) Ομάδα ----------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  user_id uuid references auth.users on delete set null, -- για την πρόσκληση υπαλλήλου (αργότερα)
  name text not null check (length(trim(name)) > 0),
  role text,
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  bio text,
  photo_url text,
  days smallint[] not null default '{1,2,3,4,5}',   -- 0=Κυρ … 6=Σαβ
  services uuid[] not null default '{}',             -- ποιες υπηρεσίες κάνει
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists staff_business on staff (business_id) where active;
alter table staff enable row level security;
drop policy if exists "staff public" on staff;
drop policy if exists "staff owner" on staff;
create policy "staff public" on staff for select using (active or is_owner(business_id));
create policy "staff owner" on staff for all using (is_owner(business_id)) with check (is_owner(business_id));

alter table bookings add column if not exists staff_id uuid references staff on delete set null;
create index if not exists bookings_staff_day on bookings (staff_id, date) where status <> 'cancelled';

-- Ποια άτομα της ομάδας κάνουν αυτή την υπηρεσία (μόνο ατομικά ραντεβού· τα μαθήματα δεν έχουν άτομο).
create or replace function service_team(p_service uuid) returns uuid[]
language sql stable security definer set search_path=public as $$
  select coalesce(array_agg(st.id order by st.created_at), '{}') from staff st join services s on s.id=p_service
  where st.business_id=s.business_id and st.active and s.capacity=1 and s.id = any(st.services) $$;

-- Ποια από αυτά είναι ελεύθερα μια ώρα (δουλεύουν εκείνη τη μέρα και δεν έχουν ραντεβού που να πέφτει πάνω).
create or replace function staff_free_at(p_service uuid, p_date date, p_time time) returns uuid[]
language sql stable security definer set search_path=public as $$
  select coalesce(array_agg(st.id order by st.created_at), '{}')
  from staff st, services s
  where s.id=p_service and st.id = any(service_team(p_service))
    and extract(dow from p_date)::smallint = any(st.days)
    and not exists (
      select 1 from bookings bk join services s2 on s2.id=bk.service_id
      where bk.staff_id=st.id and bk.date=p_date and bk.status<>'cancelled'
        and bk.time < p_time + make_interval(mins=>s.duration_min)
        and p_time < bk.time + make_interval(mins=>s2.duration_min)) $$;

-- ---------- Διαθεσιμότητα (με άτομο και ώρα Αθήνας) ----------
drop function if exists day_availability(uuid, date);
create or replace function day_availability(p_service uuid, p_date date, p_staff uuid default null)
returns table(slot_time time, capacity int, taken int, free int, staff_free uuid[])
language plpgsql stable security definer set search_path=public as $$
declare s services; b businesses; own boolean; team uuid[]; working int; today date := athens_today();
begin
  select * into s from services where id=p_service and active;
  if not found then return; end if;
  select * into b from businesses where id=s.business_id;
  if p_date < today or p_date > today + b.max_days_ahead then return; end if;
  if exists(select 1 from day_overrides where business_id=b.id and date=p_date and closed) then return; end if;
  own := exists(select 1 from opening_hours where service_id=s.id);
  team := service_team(s.id);
  select count(*) into working from staff where id = any(team) and extract(dow from p_date)::smallint = any(days);
  return query
    with slots as (
      select distinct gs::time as t from opening_hours h,
        generate_series(p_date + h.opens, p_date + h.closes - make_interval(mins=>s.duration_min),
                        make_interval(mins=>s.duration_min)) gs
      where h.business_id=b.id and h.weekday=extract(dow from p_date)
        and (case when own then h.service_id=s.id else h.service_id is null end)
    ), calc as (
      select t, case when cardinality(team) > 0 then staff_free_at(s.id,p_date,t) end as can from slots
      where p_date + t > (now() at time zone 'Europe/Athens')
    )
    select t,
      case when can is null then slot_capacity(s.id,p_date,t) when p_staff is null then working else 1 end,
      case when can is null then slot_taken(s.id,p_date,t)
           when p_staff is null then greatest(working - cardinality(can),0) else (not (p_staff = any(can)))::int end,
      case when can is null then greatest(slot_capacity(s.id,p_date,t)-slot_taken(s.id,p_date,t),0)
           when p_staff is null then cardinality(can) else (p_staff = any(can))::int end,
      can
    from calc order by t;
end $$;

-- ---------- Κράτηση (με άτομο) ----------
drop function if exists create_booking(uuid, date, time, uuid);
create or replace function create_booking(p_service uuid, p_date date, p_time time, p_backup_for uuid default null, p_staff uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s services; b businesses; m memberships; bid uuid; uid uuid := auth.uid(); sl record; st uuid; stname text;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  select * into s from services where id=p_service and active;
  if not found then return jsonb_build_object('ok',false,'error','Η υπηρεσία δεν υπάρχει'); end if;
  select * into b from businesses where id=s.business_id;
  select * into sl from day_availability(p_service,p_date,p_staff) a where a.slot_time=p_time;
  if not found then return jsonb_build_object('ok',false,'error','Η ώρα δεν είναι διαθέσιμη'); end if;

  select * into m from memberships where business_id=b.id and user_id=uid;
  if not found then
    insert into memberships(business_id,user_id,status)
      values (b.id,uid,case when b.requires_approval then 'pending' else 'approved' end) returning * into m;
  end if;
  if m.status='pending' then return jsonb_build_object('ok',false,'pending',true,'error','Η επιχείρηση πρέπει να σε εγκρίνει πρώτα'); end if;
  if m.status='blocked' then return jsonb_build_object('ok',false,'error','Δεν μπορείς να κλείσεις εδώ'); end if;

  perform expire_packages();
  if b.uses_credits then
    select * into m from memberships where business_id=b.id and user_id=uid for update;
    if m.credits <= 0 then return jsonb_build_object('ok',false,'no_credits',true,'error','Δεν έχεις διαθέσιμες κρατήσεις στο πακέτο σου'); end if;
  end if;

  if exists(select 1 from bookings where service_id=p_service and date=p_date and time=p_time and user_id=uid and status<>'cancelled') then
    return jsonb_build_object('ok',false,'error','Έχεις ήδη κράτηση σε αυτή την ώρα'); end if;

  if sl.staff_free is not null then
    -- Με ομάδα: το άτομο που διάλεξε, αλλιώς («Οποιοσδήποτε») το πρώτο ελεύθερο. Κλείδωμα ανά επιχείρηση και μέρα.
    perform pg_advisory_xact_lock(hashtext(b.id::text||p_date));
    st := coalesce(p_staff, (staff_free_at(p_service,p_date,p_time))[1]);
    if st is null or not (st = any(staff_free_at(p_service,p_date,p_time))) then
      return jsonb_build_object('ok',false,'full',true,'error','Η ώρα γέμισε'); end if;
  else
    perform pg_advisory_xact_lock(hashtext(p_service::text||p_date||p_time));
    if slot_taken(p_service,p_date,p_time) >= slot_capacity(p_service,p_date,p_time) then
      return jsonb_build_object('ok',false,'full',true,'error','Η ώρα γέμισε'); end if;
  end if;

  insert into bookings(business_id,service_id,user_id,date,time,staff_id) values (b.id,p_service,uid,p_date,p_time,st) returning id into bid;
  if b.uses_credits then
    update memberships set credits=credits-1 where business_id=b.id and user_id=uid;
    insert into credit_log(business_id,user_id,kind,delta) values (b.id,uid,'book',-1);
  end if;
  if p_backup_for is not null then
    update waitlist set backup_booking_id=bid where id=p_backup_for and user_id=uid;
  end if;
  delete from waitlist where service_id=p_service and date=p_date and time=p_time and user_id=uid;
  select name into stname from staff where id=st;
  return jsonb_build_object('ok',true,'booking_id',bid,'staff_id',st,'staff',stname);
end $$;

-- ---------- 4) Λίστα αναμονής: μόνο δικές σου εναλλακτικές, έγκυρη ώρα, έλεγχος μέλους ----------
create or replace function join_waitlist(p_service uuid, p_date date, p_time time, p_backup_booking uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); s services; m memberships; sl record;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  select * into s from services where id=p_service and active;
  if not found then return jsonb_build_object('ok',false,'error','Η υπηρεσία δεν υπάρχει'); end if;
  select * into m from memberships where business_id=s.business_id and user_id=uid;
  if found and m.status='blocked' then return jsonb_build_object('ok',false,'error','Δεν μπορείς να κλείσεις εδώ'); end if;
  if found and m.status='pending' then return jsonb_build_object('ok',false,'pending',true,'error','Η επιχείρηση πρέπει να σε εγκρίνει πρώτα'); end if;
  select * into sl from day_availability(p_service,p_date) a where a.slot_time=p_time;
  if not found then return jsonb_build_object('ok',false,'error','Η ώρα δεν είναι διαθέσιμη'); end if;
  if exists(select 1 from bookings where service_id=p_service and date=p_date and time=p_time and user_id=uid and status<>'cancelled') then
    return jsonb_build_object('ok',false,'error','Έχεις ήδη κράτηση σε αυτή την ώρα'); end if;
  if sl.free > 0 then return jsonb_build_object('ok',false,'error','Υπάρχει ελεύθερη θέση — κλείσ'' την κανονικά'); end if;
  if p_backup_booking is not null and not exists(
       select 1 from bookings where id=p_backup_booking and user_id=uid and status='booked') then
    return jsonb_build_object('ok',false,'error','Η εναλλακτική κράτηση δεν βρέθηκε'); end if;
  insert into waitlist(service_id,user_id,date,time,backup_booking_id)
    values (p_service,uid,p_date,p_time,p_backup_booking) on conflict do nothing;
  return jsonb_build_object('ok',true);
end $$;

-- Προώθηση από την αναμονή: με ομάδα, η θέση πάει στο πρώτο ελεύθερο άτομο.
create or replace function promote_waitlist_slot(p_service uuid, p_date date, p_time time) returns void
language plpgsql security definer set search_path=public as $$
declare w waitlist; s services; b businesses; m memberships; team boolean; st uuid;
begin
  select * into s from services where id=p_service;
  select * into b from businesses where id=s.business_id;
  team := cardinality(service_team(p_service)) > 0;
  loop
    if team then
      st := (staff_free_at(p_service,p_date,p_time))[1];
      exit when st is null;
    else
      exit when slot_taken(p_service,p_date,p_time) >= slot_capacity(p_service,p_date,p_time);
    end if;
    select * into w from waitlist where service_id=p_service and date=p_date and time=p_time order by created_at limit 1 for update skip locked;
    exit when not found;
    delete from waitlist where id=w.id;
    continue when exists(select 1 from bookings where service_id=p_service and date=p_date and time=p_time and user_id=w.user_id and status<>'cancelled');
    if b.uses_credits and w.backup_booking_id is null then
      select * into m from memberships where business_id=b.id and user_id=w.user_id;
      continue when coalesce(m.credits,0) <= 0;
    end if;
    if w.backup_booking_id is not null then
      update bookings set status='cancelled', cancelled_at=now() where id=w.backup_booking_id and user_id=w.user_id and status='booked';
    elsif b.uses_credits then
      update memberships set credits=credits-1 where business_id=b.id and user_id=w.user_id;
    end if;
    insert into bookings(business_id,service_id,user_id,date,time,staff_id) values (b.id,p_service,w.user_id,p_date,p_time,st);
    perform notify(w.user_id,b.name,format('Ελευθερώθηκε θέση! Σου κλείστηκε %s %s · %s', to_char(p_date,'DD/MM'), to_char(p_time,'HH24:MI'), s.name));
  end loop;
end $$;
revoke all on function promote_waitlist_slot(uuid,date,time) from public, anon, authenticated;

-- ---------- 3) Λήξη πακέτων με ημερομηνία Αθήνας (ίδια με 004, μόνο η μέρα αλλάζει) ----------
create or replace function expire_packages() returns void
language plpgsql security definer set search_path=public as $$
declare m record;
begin
  for m in select ms.*, b.name from memberships ms join businesses b on b.id=ms.business_id
           where b.uses_credits and ms.credits_since is not null
             and ms.credits_since + coalesce(ms.pack_days, b.package_days) <= athens_today() and ms.credits > 0 loop
    update memberships set credits_lost=credits, credits=0 where business_id=m.business_id and user_id=m.user_id;
    insert into credit_log(business_id,user_id,kind,delta,lost) values (m.business_id,m.user_id,'expire',-m.credits,m.credits);
    perform notify(m.user_id, m.name, 'Το πακέτο σου έληξε. Διάλεξε νέο πακέτο από τη σελίδα του καταστήματος.');
  end loop;
end $$;
revoke all on function expire_packages() from public, anon, authenticated;

-- ---------- Οι λίστες δείχνουν και το άτομο ----------
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
        'credits',m.credits,'total',m.credits_total,'pack',m.pack_name,'unlimited',(m.credits_total is null and m.credits >= 9000),
        'expires', case when b.uses_credits and m.credits_since is not null then m.credits_since + coalesce(m.pack_days, b.package_days) end,
        'pending_package', case when pk.id is not null then jsonb_build_object('id',pk.id,'name',pk.name) end))
      from memberships m join businesses b on b.id=m.business_id left join packages pk on pk.id=m.pending_package
      where m.user_id=auth.uid()), '[]')) $$;

create or replace function owner_day(p_business uuid, p_date date) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',bk.id,'time',to_char(bk.time,'HH24:MI'),'status',bk.status,
      'service',s.name,'service_id',s.id,'duration_min',s.duration_min,'capacity',s.capacity,'price_cents',s.price_cents,
      'client',trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),'phone',p.phone,'user_id',bk.user_id,
      'staff_id',st.id,'staff',st.name,'staff_color',st.color) order by bk.time)
    from bookings bk join services s on s.id=bk.service_id left join profiles p on p.id=bk.user_id left join staff st on st.id=bk.staff_id
    where bk.business_id=p_business and bk.date=p_date and bk.status<>'cancelled'),'[]');
end $$;

-- ---------- 2) Καρτέλα πελάτη ----------
create table if not exists client_cards (
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  tag text,
  note text,
  fields jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
alter table client_cards enable row level security;
drop policy if exists "client cards owner" on client_cards;
create policy "client cards owner" on client_cards for select using (is_owner(business_id));

create or replace function owner_set_note(p_business uuid, p_user uuid, p_note text) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  insert into client_cards(business_id,user_id,note) values (p_business,p_user,nullif(trim(p_note),''))
    on conflict (business_id,user_id) do update set note=excluded.note, updated_at=now();
  return jsonb_build_object('ok',true);
end $$;

create or replace function owner_client_history(p_business uuid, p_user uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(x order by x->>'date' desc, x->>'time' desc) from (
    select jsonb_build_object('id',bk.id,'date',bk.date,'time',to_char(bk.time,'HH24:MI'),'status',bk.status,
      'service',s.name,'staff',st.name,'price_cents',s.price_cents) x
    from bookings bk join services s on s.id=bk.service_id left join staff st on st.id=bk.staff_id
    where bk.business_id=p_business and bk.user_id=p_user order by bk.date desc, bk.time desc limit 30) q), '[]');
end $$;

-- Οι πελάτες με επισκέψεις, έσοδα, επόμενο ραντεβού, πακέτο και σημείωση (όπως στο demo).
create or replace function owner_clients(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', u.user_id, 'name', trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),
        'phone', p.phone, 'last', coalesce(u.last, u.first), 'first', u.first,
        'visits', coalesce(u.visits,0), 'no_shows', coalesce(u.no_shows,0), 'spent_cents', coalesce(u.spent,0), 'next', u.next,
        'tag', c.tag, 'note', c.note, 'fields', coalesce(c.fields,'[]'),
        'pack', case when m.credits_since is not null and (m.credits > 0 or m.pack_name is not null) then jsonb_build_object(
          'name', coalesce(m.pack_name,'Πακέτο'), 'left', case when m.credits >= 9000 and m.credits_total is null then null else m.credits end,
          'total', m.credits_total, 'expires', m.credits_since + coalesce(m.pack_days, b.package_days)) end)
      order by coalesce(u.visits,0) desc, coalesce(u.last, u.first) desc nulls last)
    from (
      select bk.user_id, min(bk.date) as first,
        max(bk.date) filter (where bk.status='attended') as last,
        count(*) filter (where bk.status='attended') as visits,
        count(*) filter (where bk.status='no_show') as no_shows,
        sum(s.price_cents) filter (where bk.status='attended') as spent,
        min(to_char(bk.date,'YYYY-MM-DD')||' '||to_char(bk.time,'HH24:MI')) filter (where bk.status='booked' and bk.date >= athens_today()) as next
      from bookings bk join services s on s.id=bk.service_id where bk.business_id=p_business group by bk.user_id
      union all
      select m.user_id, null, null, 0, 0, 0, null from memberships m where m.business_id=p_business
        and not exists (select 1 from bookings b where b.business_id=p_business and b.user_id=m.user_id)
    ) u left join profiles p on p.id=u.user_id
      left join memberships m on m.business_id=p_business and m.user_id=u.user_id
      left join client_cards c on c.business_id=p_business and c.user_id=u.user_id
      left join businesses b on b.id=p_business
  ), '[]');
end $$;

-- ---------- 5) Ατομική αποθήκευση καταστήματος ----------
-- p_biz: τα πεδία του καταστήματος (με id αν υπάρχει). p_services: [{key,id?,name,duration_min,capacity,price_cents}].
-- p_hours: [{weekday,opens,closes,svc}] όπου svc = key υπηρεσίας ή null. p_removed: υπηρεσίες που φεύγουν.
-- Όλα γίνονται μαζί ή καθόλου: αν κάτι αποτύχει, το παλιό ωράριο μένει.
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
        capacity=coalesce(nullif(x->>'capacity','')::int,1), price_cents=nullif(x->>'price_cents','')::int
        where id=sid and business_id=bid;
    else
      insert into services(business_id,name,duration_min,capacity,price_cents)
        values (bid, trim(x->>'name'), coalesce(nullif(x->>'duration_min','')::int,30), coalesce(nullif(x->>'capacity','')::int,1), nullif(x->>'price_cents','')::int)
        returning id into sid;
    end if;
    ids := ids || jsonb_build_object(x->>'key', sid);
  end loop;

  delete from opening_hours where business_id=bid;
  insert into opening_hours(business_id,weekday,opens,closes,service_id)
    select bid, (h->>'weekday')::smallint, (h->>'opens')::time, (h->>'closes')::time, nullif(ids->>(h->>'svc'),'')::uuid
    from jsonb_array_elements(coalesce(p_hours,'[]')) h
    where h->>'svc' is null or ids ? (h->>'svc');

  return jsonb_build_object('ok',true,'id',bid);
end $$;

grant execute on function athens_today(), day_availability(uuid,date,uuid), create_booking(uuid,date,time,uuid,uuid),
  join_waitlist(uuid,date,time,uuid), my_bookings(), owner_day(uuid,date), owner_set_note(uuid,uuid,text),
  owner_client_history(uuid,uuid), owner_clients(uuid), save_business(jsonb,jsonb,jsonb,uuid[]) to authenticated;
grant execute on function day_availability(uuid,date,uuid) to anon;
revoke all on function service_team(uuid), staff_free_at(uuid,date,time) from public, anon;
