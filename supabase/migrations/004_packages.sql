-- 004: πακέτα που φτιάχνει ο ιδιοκτήτης και τα διαλέγει ο πελάτης.
-- Ροή: ο ιδιοκτήτης φτιάχνει πακέτα (όνομα, τιμή, επισκέψεις, μέρες) → ο πελάτης πατά «Το θέλω» στο κατάστημα →
-- ο ιδιοκτήτης το ενεργοποιεί όταν πληρωθεί (στο κατάστημα) → μπαίνουν οι επισκέψεις στον λογαριασμό του πελάτη
-- και αφαιρούνται μία μία στις κρατήσεις (όπως πριν, μέσω memberships.credits).
-- Συνδρομή χωρίς αριθμό επισκέψεων = απεριόριστες (credits 9999, credits_total κενό).

-- 1) Ο κατάλογος πακέτων της επιχείρησης.
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  kind text not null default 'pack' check (kind in ('pack','sub','card','deposit')),
  price_cents int not null default 0 check (price_cents >= 0),
  sessions int check (sessions is null or sessions between 1 and 999),
  days int check (days is null or days between 1 and 3650),
  note text check (note is null or length(note) <= 300),
  popular boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists packages_business_idx on packages (business_id);
alter table packages enable row level security;
drop policy if exists "packages public" on packages;
create policy "packages public" on packages for select
  using ((active and exists (select 1 from businesses b where b.id = business_id and b.is_published)) or is_owner(business_id));
drop policy if exists "packages owner" on packages;
create policy "packages owner" on packages for all using (is_owner(business_id)) with check (is_owner(business_id));

-- 2) Στο memberships: ποιο πακέτο έχει ο πελάτης, πόσες επισκέψεις είχε συνολικά, πόσες μέρες ισχύει,
--    και ποιο πακέτο ζήτησε (μέχρι να το ενεργοποιήσει ο ιδιοκτήτης).
alter table memberships add column if not exists pack_name text;
alter table memberships add column if not exists credits_total int;
alter table memberships add column if not exists pack_days int;
alter table memberships add column if not exists pending_package uuid references packages on delete set null;
alter table memberships add column if not exists pending_at timestamptz;

-- 3) Λήξη: με τις μέρες του πακέτου, αλλιώς με τις μέρες της επιχείρησης.
create or replace function expire_packages() returns void
language plpgsql security definer set search_path=public as $$
declare m record;
begin
  for m in select ms.*, b.name from memberships ms join businesses b on b.id=ms.business_id
           where b.uses_credits and ms.credits_since is not null
             and ms.credits_since + coalesce(ms.pack_days, b.package_days) <= current_date and ms.credits > 0 loop
    update memberships set credits_lost=credits, credits=0 where business_id=m.business_id and user_id=m.user_id;
    insert into credit_log(business_id,user_id,kind,delta,lost) values (m.business_id,m.user_id,'expire',-m.credits,m.credits);
    perform notify(m.user_id, m.name, 'Το πακέτο σου έληξε. Διάλεξε νέο πακέτο από τη σελίδα του καταστήματος.');
  end loop;
end $$;

-- 4) Ο πελάτης διαλέγει πακέτο (αίτημα· ένα τη φορά ανά κατάστημα).
create or replace function request_package(p_package uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pk packages; b businesses; m memberships; uid uuid := auth.uid(); who text;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  select * into pk from packages where id=p_package and active;
  if not found then return jsonb_build_object('ok',false,'error','Το πακέτο δεν υπάρχει πια'); end if;
  select * into b from businesses where id=pk.business_id and is_published;
  if not found then return jsonb_build_object('ok',false,'error','Το κατάστημα δεν δέχεται αιτήματα'); end if;
  select * into m from memberships where business_id=b.id and user_id=uid;
  if not found then
    insert into memberships(business_id,user_id,status)
      values (b.id,uid,case when b.requires_approval then 'pending' else 'approved' end) returning * into m;
  end if;
  if m.status='blocked' then return jsonb_build_object('ok',false,'error','Δεν μπορείς να ζητήσεις πακέτο εδώ'); end if;
  update memberships set pending_package=pk.id, pending_at=now() where business_id=b.id and user_id=uid;
  select trim(coalesce(first_name,'')||' '||coalesce(last_name,'')) into who from profiles where id=uid;
  perform notify(b.owner_id, b.name || ' · Αίτημα πακέτου', format('%s ζήτησε «%s». Ενεργοποίησέ το από το Πρόγραμμα όταν πληρωθεί.', coalesce(nullif(who,''),'Ένας πελάτης'), pk.name));
  return jsonb_build_object('ok',true);
end $$;

create or replace function cancel_package_request(p_business uuid) returns jsonb
language sql security definer set search_path=public as $$
  update memberships set pending_package=null, pending_at=null where business_id=p_business and user_id=auth.uid();
  select jsonb_build_object('ok',true) $$;

-- 5) Ο ιδιοκτήτης: τα αιτήματα, ενεργοποίηση (και απευθείας ανάθεση πακέτου), απόρριψη.
create or replace function owner_package_requests(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),
      'phone',p.phone,'package_id',pk.id,'package',pk.name,'price_cents',pk.price_cents,'sessions',pk.sessions,'days',pk.days,'kind',pk.kind,'at',m.pending_at)
      order by m.pending_at)
    from memberships m join packages pk on pk.id=m.pending_package left join profiles p on p.id=m.user_id
    where m.business_id=p_business), '[]');
end $$;

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
      credits_since=current_date, credits_lost=0, pack_name=pk.name, pack_days=pk.days,
      pending_package=null, pending_at=null
      where business_id=p_business and user_id=p_user;
    insert into credit_log(business_id,user_id,kind,delta) values (p_business,p_user,'package',case when pk.sessions is null then 9999 else add_n end);
  else
    update memberships set status='approved', pending_package=null, pending_at=null where business_id=p_business and user_id=p_user;
  end if;
  perform notify(p_user, bname, format('Το πακέτο «%s» ενεργοποιήθηκε. Καλή αρχή!', pk.name));
  return jsonb_build_object('ok',true);
end $$;

create or replace function owner_decline_package(p_business uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bname text; pname text;
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  select pk.name into pname from memberships m join packages pk on pk.id=m.pending_package where m.business_id=p_business and m.user_id=p_user;
  update memberships set pending_package=null, pending_at=null where business_id=p_business and user_id=p_user;
  select name into bname from businesses where id=p_business;
  if pname is not null then perform notify(p_user, bname, format('Το αίτημα για «%s» δεν εγκρίθηκε. Επικοινώνησε με το κατάστημα.', pname)); end if;
  return jsonb_build_object('ok',true);
end $$;

-- Η παλιά χειροκίνητη ανανέωση: καθαρίζει το όνομα/σύνολο ώστε να μη δείχνει παλιό πακέτο.
create or replace function owner_renew(p_business uuid, p_user uuid, p_credits int) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  update memberships set credits=p_credits, credits_total=p_credits, credits_since=current_date, credits_lost=0, pack_name=null, pack_days=null
    where business_id=p_business and user_id=p_user;
  insert into credit_log(business_id,user_id,kind,delta) values (p_business,p_user,'renew',p_credits);
  return jsonb_build_object('ok',true);
end $$;

-- 6) Οι κρατήσεις του πελάτη: τα πακέτα με όνομα, σύνολο και αίτημα σε αναμονή.
create or replace function my_bookings() returns jsonb
language sql stable security definer set search_path=public as $$
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
        'credits',m.credits,'total',m.credits_total,'pack',m.pack_name,'unlimited',(m.credits_total is null and m.credits >= 9000),
        'expires', case when b.uses_credits and m.credits_since is not null then m.credits_since + coalesce(m.pack_days, b.package_days) end,
        'pending_package', case when pk.id is not null then jsonb_build_object('id',pk.id,'name',pk.name) end))
      from memberships m join businesses b on b.id=m.business_id left join packages pk on pk.id=m.pending_package
      where m.user_id=auth.uid()), '[]')) $$;

-- 7) Οι πελάτες του ιδιοκτήτη με το πακέτο τους.
create or replace function owner_clients(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', u.user_id, 'name', trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),
        'phone', p.phone, 'last', u.last,
        'pack', case when m.credits_since is not null and (m.credits > 0 or m.pack_name is not null) then jsonb_build_object(
          'name', coalesce(m.pack_name,'Πακέτο'), 'left', case when m.credits >= 9000 and m.credits_total is null then null else m.credits end,
          'total', m.credits_total, 'expires', m.credits_since + coalesce(m.pack_days, b.package_days)) end)
      order by u.last desc nulls last)
    from (
      select user_id, max(date) as last from bookings where business_id=p_business group by user_id
      union
      select user_id, null from memberships m where m.business_id=p_business
        and not exists (select 1 from bookings b where b.business_id=p_business and b.user_id=m.user_id)
    ) u left join profiles p on p.id=u.user_id
      left join memberships m on m.business_id=p_business and m.user_id=u.user_id
      left join businesses b on b.id=p_business
  ), '[]');
end $$;

grant execute on function request_package(uuid), cancel_package_request(uuid), owner_package_requests(uuid),
  owner_activate_package(uuid, uuid, uuid), owner_decline_package(uuid, uuid) to authenticated;
