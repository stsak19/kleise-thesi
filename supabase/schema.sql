-- ============================================================
-- SpotOn — multi-tenant σχήμα κρατήσεων (Supabase / Postgres)
-- Μεταφέρει τη λογική του Gym_Schedule (κράτηση, ακύρωση, δήλωση
-- ενδιαφέροντος με αυτόματη προώθηση, πακέτα με λήξη, έγκριση πελατών)
-- σε ΠΟΛΛΕΣ επιχειρήσεις: γυμναστήρια, personal, νυχάδικα, κομμωτήρια,
-- κουρεία, φυσιοθεραπευτήρια, spa, γιόγκα/πιλάτες, ιατρεία κ.λπ.
-- Login: Supabase Auth (email + κωδικός) αντί για κινητό + PIN.
-- ============================================================

create extension if not exists pg_cron;

create type business_category as enum (
  'gym','personal_training','pilates_yoga','nails','hair','barber',
  'beauty','massage_spa','physio','medical','dental','tattoo','other');

create type booking_status as enum ('booked','cancelled','attended','no_show');

-- ---------- Πίνακες ----------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text not null default '',
  last_name  text not null default '',
  phone      text,
  push_token text,
  created_at timestamptz not null default now()
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users,
  name text not null,
  category business_category not null,
  city text not null,
  address text,
  phone text,
  description text,
  logo_url text,
  cover_url text, -- φωτογραφία εξωφύλλου
  brand_color text check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$'), -- χρώμα καταστήματος
  -- ρυθμίσεις κρατήσεων (αντίστοιχα του settings του γυμναστηρίου)
  max_days_ahead int not null default 14 check (max_days_ahead between 0 and 90),
  cancel_before_min int not null default 120,  -- ως πότε ακυρώνει ο πελάτης
  requires_approval boolean not null default false, -- νέοι πελάτες περιμένουν έγκριση
  uses_credits boolean not null default false,     -- πακέτα/καρνέ (γυμναστήρια)
  package_days int not null default 30,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index on businesses (category, city) where is_published;

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  name text not null,                 -- «Μανικιούρ ημιμόνιμο», «Group class», «Κούρεμα»
  duration_min int not null check (duration_min > 0),
  price_cents int,
  capacity int not null default 1 check (capacity > 0), -- 1 = ατομικό ραντεβού
  active boolean not null default true
);
create index on services (business_id);

-- Εβδομαδιαίο ωράριο: ώρες έναρξης ανά μέρα (0=Κυρ … 6=Σαβ)
create table opening_hours (
  id bigserial primary key,
  business_id uuid not null references businesses on delete cascade,
  service_id uuid references services on delete cascade, -- null = γενικό ωράριο· αλλιώς μόνο γι' αυτή την υπηρεσία
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null check (closes > opens)
);
create index on opening_hours (business_id, weekday);

-- Κλειστές μέρες / αργίες και σημείωμα ημέρας
create table day_overrides (
  business_id uuid not null references businesses on delete cascade,
  date date not null,
  closed boolean not null default false,
  note text,
  primary key (business_id, date)
);

-- Αλλαγή θέσεων για συγκεκριμένη ώρα
create table capacity_overrides (
  service_id uuid not null references services on delete cascade,
  date date not null,
  time time not null,
  capacity int not null check (capacity >= 0),
  primary key (service_id, date, time)
);

-- Σχέση πελάτη ↔ επιχείρηση (έγκριση, πακέτο)
create table memberships (
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  status text not null default 'approved' check (status in ('pending','approved','blocked')),
  credits int not null default 0,
  credits_since date,
  credits_lost int not null default 0,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  service_id uuid not null references services on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  time time not null,
  status booking_status not null default 'booked',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index bookings_one_per_slot on bookings (service_id, date, time, user_id) where status <> 'cancelled';
create index on bookings (business_id, date);
create index on bookings (user_id, date);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  time time not null,
  backup_booking_id uuid references bookings on delete set null, -- εναλλακτική που ακυρώνεται
  created_at timestamptz not null default now(),
  unique (service_id, date, time, user_id)
);

create table credit_log (
  id bigserial primary key,
  business_id uuid not null, user_id uuid not null,
  kind text not null, delta int not null default 0, lost int not null default 0,
  created_at timestamptz not null default now()
);

create table notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null, body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- RLS: ανάγνωση ανοιχτή όπου πρέπει, εγγραφές μόνο μέσω RPC ----------
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table services enable row level security;
alter table opening_hours enable row level security;
alter table day_overrides enable row level security;
alter table capacity_overrides enable row level security;
alter table memberships enable row level security;
alter table bookings enable row level security;
alter table waitlist enable row level security;
alter table credit_log enable row level security;
alter table notifications enable row level security;

create function is_owner(b uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from businesses where id=b and owner_id=auth.uid()) $$;

create policy "own profile" on profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "public businesses" on businesses for select using (is_published or owner_id=auth.uid());
create policy "owner edits business" on businesses for update using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "owner creates business" on businesses for insert with check (owner_id=auth.uid());
create policy "read services" on services for select using (true);
create policy "owner services" on services for all using (is_owner(business_id)) with check (is_owner(business_id));
create policy "read hours" on opening_hours for select using (true);
create policy "owner hours" on opening_hours for all using (is_owner(business_id)) with check (is_owner(business_id));
create policy "read overrides" on day_overrides for select using (true);
create policy "owner overrides" on day_overrides for all using (is_owner(business_id)) with check (is_owner(business_id));
create policy "owner capacity" on capacity_overrides for all
  using (is_owner((select business_id from services s where s.id=service_id)))
  with check (is_owner((select business_id from services s where s.id=service_id)));
create policy "my memberships" on memberships for select using (user_id=auth.uid() or is_owner(business_id));
create policy "my bookings" on bookings for select using (user_id=auth.uid() or is_owner(business_id));
create policy "my waitlist" on waitlist for select using (user_id=auth.uid());
create policy "my notifications" on notifications for select using (user_id=auth.uid());
create policy "read my notifications" on notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());


-- Αυτόματο προφίλ για κάθε νέο χρήστη
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- Βοηθητικά ----------
create function notify(p_user uuid, p_title text, p_body text) returns void
language sql security definer set search_path=public as
$$ insert into notifications(user_id,title,body) values (p_user,p_title,p_body) $$;

create function slot_capacity(p_service uuid, p_date date, p_time time) returns int
language sql stable security definer set search_path=public as $$
  select coalesce((select capacity from capacity_overrides where service_id=p_service and date=p_date and time=p_time),
                  (select capacity from services where id=p_service)) $$;

create function slot_taken(p_service uuid, p_date date, p_time time) returns int
language sql stable security definer set search_path=public as $$
  select count(*)::int from bookings where service_id=p_service and date=p_date and time=p_time and status<>'cancelled' $$;

-- Λήξη πακέτων (όπως expire_packages του γυμναστηρίου)
create function expire_packages() returns void language plpgsql security definer set search_path=public as $$
declare m record;
begin
  for m in select ms.*, b.name, b.package_days from memberships ms join businesses b on b.id=ms.business_id
           where b.uses_credits and ms.credits_since is not null
             and ms.credits_since + b.package_days <= current_date and ms.credits > 0 loop
    update memberships set credits_lost=credits, credits=0 where business_id=m.business_id and user_id=m.user_id;
    insert into credit_log(business_id,user_id,kind,delta,lost) values (m.business_id,m.user_id,'expire',-m.credits,m.credits);
    perform notify(m.user_id, m.name, 'Το πακέτο σου έληξε. Επικοινώνησε για ανανέωση.');
  end loop;
end $$;
select cron.schedule('package-expiry','*/5 * * * *','select expire_packages()');

-- ---------- Πελάτης ----------
-- Διαθεσιμότητα ημέρας για μια υπηρεσία: λίστα ωρών με ελεύθερες θέσεις
create function day_availability(p_service uuid, p_date date) returns table(slot_time time, capacity int, taken int, free int)
language plpgsql stable security definer set search_path=public as $$
declare s services; b businesses; own boolean;
begin
  select * into s from services where id=p_service and active;
  if not found then return; end if;
  select * into b from businesses where id=s.business_id;
  if p_date < current_date or p_date > current_date + b.max_days_ahead then return; end if;
  if exists(select 1 from day_overrides where business_id=b.id and date=p_date and closed) then return; end if;
  own := exists(select 1 from opening_hours where service_id=s.id);
  return query
    with slots as (
      select distinct gs::time as t from opening_hours h,
        generate_series(p_date + h.opens, p_date + h.closes - make_interval(mins=>s.duration_min),
                        make_interval(mins=>s.duration_min)) gs
      where h.business_id=b.id and h.weekday=extract(dow from p_date)
        and (case when own then h.service_id=s.id else h.service_id is null end)
    )
    select t, slot_capacity(s.id,p_date,t), slot_taken(s.id,p_date,t),
           greatest(slot_capacity(s.id,p_date,t)-slot_taken(s.id,p_date,t),0)
    from slots
    where p_date + t > (now() at time zone 'Europe/Athens')
    order by t;
end $$;

create function create_booking(p_service uuid, p_date date, p_time time, p_backup_for uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s services; b businesses; m memberships; bid uuid; uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  select * into s from services where id=p_service and active;
  if not found then return jsonb_build_object('ok',false,'error','Η υπηρεσία δεν υπάρχει'); end if;
  select * into b from businesses where id=s.business_id;
  if not exists(select 1 from day_availability(p_service,p_date) a where a.slot_time=p_time) then
    return jsonb_build_object('ok',false,'error','Η ώρα δεν είναι διαθέσιμη'); end if;

  -- membership / έγκριση
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

  -- κλείδωμα της ώρας για να μην περάσουν δύο ταυτόχρονα
  perform pg_advisory_xact_lock(hashtext(p_service::text||p_date||p_time));
  if slot_taken(p_service,p_date,p_time) >= slot_capacity(p_service,p_date,p_time) then
    return jsonb_build_object('ok',false,'full',true,'error','Η ώρα γέμισε'); end if;
  if exists(select 1 from bookings where service_id=p_service and date=p_date and time=p_time and user_id=uid and status<>'cancelled') then
    return jsonb_build_object('ok',false,'error','Έχεις ήδη κράτηση σε αυτή την ώρα'); end if;

  insert into bookings(business_id,service_id,user_id,date,time) values (b.id,p_service,uid,p_date,p_time) returning id into bid;
  if b.uses_credits then
    update memberships set credits=credits-1 where business_id=b.id and user_id=uid;
    insert into credit_log(business_id,user_id,kind,delta) values (b.id,uid,'book',-1);
  end if;
  if p_backup_for is not null then
    update waitlist set backup_booking_id=bid where id=p_backup_for and user_id=uid;
  end if;
  delete from waitlist where service_id=p_service and date=p_date and time=p_time and user_id=uid;
  return jsonb_build_object('ok',true,'booking_id',bid);
end $$;

-- Ακύρωση (από πελάτη, με όριο χρόνου) — επιστρέφει την κράτηση στο πακέτο
create function cancel_booking(p_booking uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bk bookings; b businesses;
begin
  select * into bk from bookings where id=p_booking and status='booked'
    and (user_id=auth.uid() or is_owner(business_id)) for update;
  if not found then return jsonb_build_object('ok',false,'error','Η κράτηση δεν βρέθηκε'); end if;
  select * into b from businesses where id=bk.business_id;
  if bk.user_id=auth.uid() and not is_owner(b.id)
     and (bk.date + bk.time) - make_interval(mins=>b.cancel_before_min) < (now() at time zone 'Europe/Athens') then
    return jsonb_build_object('ok',false,'error',format('Η ακύρωση γίνεται έως %s λεπτά πριν', b.cancel_before_min)); end if;
  update bookings set status='cancelled', cancelled_at=now() where id=bk.id;
  if b.uses_credits then
    update memberships set credits=credits+1 where business_id=b.id and user_id=bk.user_id;
    insert into credit_log(business_id,user_id,kind,delta) values (b.id,bk.user_id,'cancel',1);
  end if;
  if bk.user_id<>auth.uid() then
    perform notify(bk.user_id,b.name,format('Η κράτησή σου %s %s ακυρώθηκε από την επιχείρηση', to_char(bk.date,'DD/MM'), to_char(bk.time,'HH24:MI')));
  end if;
  return jsonb_build_object('ok',true);
end $$;

create function join_waitlist(p_service uuid, p_date date, p_time time, p_backup_booking uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  if slot_taken(p_service,p_date,p_time) < slot_capacity(p_service,p_date,p_time) then
    return jsonb_build_object('ok',false,'error','Υπάρχει ελεύθερη θέση — κλείσ'' την κανονικά'); end if;
  insert into waitlist(service_id,user_id,date,time,backup_booking_id)
    values (p_service,auth.uid(),p_date,p_time,p_backup_booking) on conflict do nothing;
  return jsonb_build_object('ok',true);
end $$;

create function leave_waitlist(p_service uuid, p_date date, p_time time) returns jsonb
language sql security definer set search_path=public as $$
  delete from waitlist where service_id=p_service and date=p_date and time=p_time and user_id=auth.uid();
  select jsonb_build_object('ok',true) $$;

-- Αυτόματη προώθηση από τη λίστα ενδιαφέροντος όταν ελευθερώνεται θέση
create function promote_waitlist_slot(p_service uuid, p_date date, p_time time) returns void
language plpgsql security definer set search_path=public as $$
declare w waitlist; s services; b businesses; m memberships;
begin
  select * into s from services where id=p_service;
  select * into b from businesses where id=s.business_id;
  loop
    exit when slot_taken(p_service,p_date,p_time) >= slot_capacity(p_service,p_date,p_time);
    select * into w from waitlist where service_id=p_service and date=p_date and time=p_time order by created_at limit 1 for update skip locked;
    exit when not found;
    delete from waitlist where id=w.id;
    if b.uses_credits and w.backup_booking_id is null then
      select * into m from memberships where business_id=b.id and user_id=w.user_id;
      continue when coalesce(m.credits,0) <= 0;
    end if;
    -- η εναλλακτική ακυρώνεται και η κράτηση «μεταφέρεται»
    if w.backup_booking_id is not null then
      update bookings set status='cancelled', cancelled_at=now() where id=w.backup_booking_id and status='booked';
    elsif b.uses_credits then
      update memberships set credits=credits-1 where business_id=b.id and user_id=w.user_id;
    end if;
    insert into bookings(business_id,service_id,user_id,date,time) values (b.id,p_service,w.user_id,p_date,p_time);
    perform notify(w.user_id,b.name,format('Ελευθερώθηκε θέση! Σου κλείστηκε %s %s · %s', to_char(p_date,'DD/MM'), to_char(p_time,'HH24:MI'), s.name));
  end loop;
end $$;

create function trg_bookings_promote() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='cancelled' and old.status<>'cancelled' then
    perform promote_waitlist_slot(new.service_id,new.date,new.time);
  end if;
  return new;
end $$;
create trigger bookings_promote after update of status on bookings for each row execute function trg_bookings_promote();

create function trg_capacity_promote() returns trigger language plpgsql security definer set search_path=public as $$
begin perform promote_waitlist_slot(new.service_id,new.date,new.time); return new; end $$;
create trigger capacity_promote after insert or update on capacity_overrides for each row execute function trg_capacity_promote();

create function my_bookings() returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('id',bk.id,'date',bk.date,'time',to_char(bk.time,'HH24:MI'),
        'status',bk.status,'service',s.name,'service_id',s.id,'business',b.name,'business_id',b.id,'address',b.address)
        order by bk.date,bk.time)
      from bookings bk join services s on s.id=bk.service_id join businesses b on b.id=bk.business_id
      where bk.user_id=auth.uid() and bk.date >= current_date - 30), '[]'),
    'waitlist', coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'date',w.date,'time',to_char(w.time,'HH24:MI'),
        'service',s.name,'service_id',s.id,'business',b.name))
      from waitlist w join services s on s.id=w.service_id join businesses b on b.id=s.business_id
      where w.user_id=auth.uid() and w.date >= current_date), '[]'),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('business_id',m.business_id,'business',b.name,'status',m.status,
        'credits',m.credits,'expires', case when b.uses_credits and m.credits_since is not null then m.credits_since + b.package_days end))
      from memberships m join businesses b on b.id=m.business_id where m.user_id=auth.uid()), '[]')) $$;

-- ---------- Επιχείρηση (αντίστοιχα του admin.html) ----------
create function owner_day(p_business uuid, p_date date) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',bk.id,'time',to_char(bk.time,'HH24:MI'),'status',bk.status,
      'service',s.name,'client',trim(p.first_name||' '||p.last_name),'phone',p.phone,'user_id',bk.user_id) order by bk.time)
    from bookings bk join services s on s.id=bk.service_id left join profiles p on p.id=bk.user_id
    where bk.business_id=p_business and bk.date=p_date and bk.status<>'cancelled'),'[]');
end $$;

create function owner_set_status(p_booking uuid, p_status booking_status) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if p_status='cancelled' then return cancel_booking(p_booking); end if;
  update bookings set status=p_status where id=p_booking and is_owner(business_id);
  return jsonb_build_object('ok',found);
end $$;

create function owner_pending(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',trim(p.first_name||' '||p.last_name),'phone',p.phone))
    from memberships m left join profiles p on p.id=m.user_id where m.business_id=p_business and m.status='pending'),'[]');
end $$;

create function owner_set_member(p_business uuid, p_user uuid, p_status text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bname text;
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  update memberships set status=p_status where business_id=p_business and user_id=p_user;
  select name into bname from businesses where id=p_business;
  if p_status='approved' then perform notify(p_user,bname,'Η εγγραφή σου εγκρίθηκε — μπορείς να κλείσεις θέση!'); end if;
  return jsonb_build_object('ok',true);
end $$;

-- Ανανέωση πακέτου (credits_since = σήμερα, μηδενίζει τα χαμένα)
create function owner_renew(p_business uuid, p_user uuid, p_credits int) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  update memberships set credits=p_credits, credits_since=current_date, credits_lost=0
    where business_id=p_business and user_id=p_user;
  insert into credit_log(business_id,user_id,kind,delta) values (p_business,p_user,'renew',p_credits);
  return jsonb_build_object('ok',true);
end $$;

revoke all on function expire_packages, promote_waitlist_slot, notify from public, anon, authenticated;
