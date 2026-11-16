-- ============================================================
-- 010: Super admin της πλατφόρμας (μόνο ο ιδιοκτήτης του SpotOn).
--  • platform_admins: ποιοι είναι super admin. Δεν διαβάζεται/γράφεται από την εφαρμογή·
--    ο πρώτος ορίζεται με το χέρι στο SQL Editor (δες το τέλος του αρχείου).
--  • Όλες οι ενέργειες γίνονται μόνο μέσω των admin_* συναρτήσεων, που ελέγχουν πρώτα is_super_admin().
--    Κανένα service key στην εφαρμογή.
--  • Αναστολή καταστήματος (κρύβεται, δεν δέχεται κρατήσεις) και αναστολή λογαριασμού (δεν κλείνει κρατήσεις).
--  • admin_log: ιστορικό κάθε ενέργειας του admin.
-- Τρέχει πάνω στα 001–006 (το 007 των βαθμολογιών είναι προαιρετικό: αν δεν υπάρχει, οι βαθμολογίες απλώς λείπουν).
-- Μπορεί να ξανατρέξει.
-- ============================================================

-- ---------- Ποιος είναι super admin ----------
create table if not exists platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table platform_admins enable row level security;  -- καμία πολιτική: μόνο οι συναρτήσεις τον διαβάζουν

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path=public as
$$ select auth.uid() is not null and exists(select 1 from platform_admins where user_id = auth.uid()) $$;

create or replace function admin_guard() returns void
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_super_admin() then raise exception 'Δεν επιτρέπεται' using errcode = '42501'; end if;
end $$;

-- ---------- Ιστορικό ενεργειών ----------
create table if not exists admin_log (
  id bigserial primary key,
  admin_id uuid references auth.users on delete set null,
  action text not null,
  target_kind text not null check (target_kind in ('user','business','booking','review')),
  target_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_target on admin_log (target_id, created_at desc);
alter table admin_log enable row level security;

create or replace function admin_note(p_action text, p_kind text, p_target uuid, p_note text default null) returns void
language sql security definer set search_path=public as
$$ insert into admin_log(admin_id, action, target_kind, target_id, note) values (auth.uid(), p_action, p_kind, p_target, p_note) $$;

-- ---------- Αναστολή ----------
alter table profiles   add column if not exists suspended_at timestamptz;
alter table profiles   add column if not exists suspend_reason text;
alter table businesses add column if not exists suspended_at timestamptz;
alter table businesses add column if not exists suspend_reason text;

-- Κατάστημα σε αναστολή: δεν φαίνεται στο κοινό (μόνο στον ιδιοκτήτη του).
drop policy if exists "public businesses" on businesses;
create policy "public businesses" on businesses for select
  using ((is_published and suspended_at is null) or owner_id = auth.uid());

-- Καμία νέα κράτηση/αναμονή από λογαριασμό σε αναστολή ή σε κατάστημα σε αναστολή.
create or replace function block_suspended() returns trigger
language plpgsql security definer set search_path=public as $$
declare biz uuid;
begin
  if exists(select 1 from profiles where id = new.user_id and suspended_at is not null) then
    raise exception 'Ο λογαριασμός σου είναι σε αναστολή. Επικοινώνησε με το SpotOn.';
  end if;
  if tg_table_name = 'bookings' then biz := new.business_id;
  else select business_id into biz from services where id = new.service_id; end if;
  if exists(select 1 from businesses where id = biz and suspended_at is not null) then
    raise exception 'Το κατάστημα δεν δέχεται κρατήσεις αυτή τη στιγμή.';
  end if;
  return new;
end $$;
drop trigger if exists bookings_block_suspended on bookings;
create trigger bookings_block_suspended before insert on bookings for each row execute function block_suspended();
drop trigger if exists waitlist_block_suspended on waitlist;
create trigger waitlist_block_suspended before insert on waitlist for each row execute function block_suspended();

-- ---------- Βοηθητικά ----------
create or replace function admin_person(p_user uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('id', u.id, 'email', u.email,
    'name', nullif(btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''),
    'phone', p.phone)
  from auth.users u left join profiles p on p.id = u.id where u.id = p_user $$;

-- Οι βαθμολογίες (007) μπορεί να μην υπάρχουν ακόμα.
create or replace function admin_has_reviews() returns boolean language sql stable as
$$ select to_regclass('public.reviews') is not null $$;

-- ---------- Επισκόπηση ----------
create or replace function admin_overview() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare today date := athens_today(); res jsonb; low jsonb := '[]'; avg_all numeric;
begin
  perform admin_guard();
  if admin_has_reviews() then
    execute $q$ select round(avg(stars)::numeric, 1) from reviews $q$ into avg_all;
    execute $q$
      select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
        select jsonb_build_object('kind','review','id', r.id, 'stars', r.stars, 'comment', r.comment, 'created_at', r.created_at,
          'business_id', b.id, 'business', b.name, 'user_id', r.user_id) x
        from reviews r join businesses b on b.id = r.business_id
        where r.stars <= 2 and r.created_at > now() - interval '30 days' order by r.created_at desc limit 5) s $q$ into low;
  end if;

  select jsonb_build_object(
    'businesses', (select count(*) from businesses),
    'published', (select count(*) from businesses where is_published and suspended_at is null),
    'businesses_week', (select count(*) from businesses where created_at > now() - interval '7 days'),
    'users', (select count(*) from auth.users),
    'users_week', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'bookings_today', (select count(*) from bookings where date = today and status <> 'cancelled'),
    'rating_avg', avg_all,
    'chart', (select coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'n',
                 (select count(*) from bookings where date = d::date and status <> 'cancelled')) order by d), '[]')
              from generate_series(today - 13, today, interval '1 day') d),
    'new_businesses', (select coalesce(jsonb_agg(x), '[]') from (
        select jsonb_build_object('id', b.id, 'name', b.name, 'category', b.category, 'city', b.city, 'logo_url', b.logo_url,
          'brand_color', b.brand_color, 'created_at', b.created_at, 'is_published', b.is_published,
          'suspended', b.suspended_at is not null,
          'services', (select count(*) from services s where s.business_id = b.id and s.active)) x
        from businesses b order by b.created_at desc limit 6) s),
    'deletions', (select coalesce(jsonb_agg(x), '[]') from (
        select admin_person(p.id) || jsonb_build_object('requested_at', p.delete_requested_at,
          'delete_on', p.delete_requested_at + interval '7 days',
          'owns', (select count(*) from businesses b where b.owner_id = p.id)) x
        from profiles p where p.delete_requested_at is not null order by p.delete_requested_at limit 6) s),
    'attention', low || (select coalesce(jsonb_agg(x), '[]') from (
        select admin_person(bk.user_id) || jsonb_build_object('kind','no_show','n', count(*),
          'shops', count(distinct bk.business_id)) x
        from bookings bk where bk.status = 'no_show' and bk.date > today - 60
        group by bk.user_id having count(*) >= 3 order by count(*) desc limit 5) s)
      || (select coalesce(jsonb_agg(x), '[]') from (
        select jsonb_build_object('kind','cancels','business_id', b.id, 'business', b.name,
          'rate', round(100.0 * count(*) filter (where bk.status = 'cancelled') / count(*)), 'n', count(*)) x
        from bookings bk join businesses b on b.id = bk.business_id
        where bk.date > today - 30 group by b.id, b.name
        having count(*) >= 10 and count(*) filter (where bk.status = 'cancelled') * 100 >= count(*) * 30
        order by count(*) filter (where bk.status = 'cancelled') desc limit 5) s)
  ) into res;
  return res;
end $$;

-- ---------- Καταστήματα ----------
create or replace function admin_businesses(p_q text default null) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare q text := '%' || lower(btrim(coalesce(p_q, ''))) || '%';
begin
  perform admin_guard();
  return (select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
    select jsonb_build_object('id', b.id, 'name', b.name, 'category', b.category, 'city', b.city, 'address', b.address,
      'logo_url', b.logo_url, 'brand_color', b.brand_color, 'created_at', b.created_at, 'is_published', b.is_published,
      'suspended', b.suspended_at is not null, 'suspend_reason', b.suspend_reason,
      'rating_avg', to_jsonb(b)->'rating_avg', 'rating_count', to_jsonb(b)->'rating_count',
      'owner', admin_person(b.owner_id),
      'services', (select count(*) from services s where s.business_id = b.id and s.active),
      'staff', (select count(*) from staff st where st.business_id = b.id and st.active),
      'clients', (select count(distinct bk.user_id) from bookings bk where bk.business_id = b.id),
      'bookings_30', (select count(*) from bookings bk where bk.business_id = b.id and bk.status <> 'cancelled' and bk.date > athens_today() - 30),
      'cancelled_30', (select count(*) from bookings bk where bk.business_id = b.id and bk.status = 'cancelled' and bk.date > athens_today() - 30)) x
    from businesses b left join auth.users u on u.id = b.owner_id left join profiles p on p.id = b.owner_id
    where q = '%%' or lower(b.name) like q or lower(b.city) like q or lower(coalesce(u.email,'')) like q
       or lower(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) like q
    limit 500) s);
end $$;

-- ---------- Πελάτες / λογαριασμοί ----------
create or replace function admin_users(p_q text default null) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare q text := '%' || lower(btrim(coalesce(p_q, ''))) || '%';
begin
  perform admin_guard();
  return (select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
    select admin_person(u.id) || jsonb_build_object('created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
      'suspended', p.suspended_at is not null, 'suspend_reason', p.suspend_reason,
      'delete_requested_at', p.delete_requested_at,
      'is_admin', exists(select 1 from platform_admins a where a.user_id = u.id),
      'owns', (select count(*) from businesses b where b.owner_id = u.id),
      'bookings', (select count(*) from bookings bk where bk.user_id = u.id and bk.status <> 'cancelled'),
      'no_shows', (select count(*) from bookings bk where bk.user_id = u.id and bk.status = 'no_show')) x
    from auth.users u left join profiles p on p.id = u.id
    where q = '%%' or lower(coalesce(u.email,'')) like q or lower(coalesce(p.phone,'')) like q
       or lower(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) like q
    limit 500) s);
end $$;

-- Όλα για έναν λογαριασμό: κρατήσεις, πακέτα, καταστήματα που έχει, κριτικές, ιστορικό admin.
create or replace function admin_user(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb; revs jsonb := '[]'; rated jsonb := '[]';
begin
  perform admin_guard();
  if admin_has_reviews() then
    execute $q$ select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'stars', r.stars, 'comment', r.comment,
        'created_at', r.created_at, 'business_id', b.id, 'business', b.name) order by r.created_at desc), '[]')
      from reviews r join businesses b on b.id = r.business_id where r.user_id = $1 $q$ into revs using p_user;
    if to_regclass('public.client_ratings') is not null then
      execute $q$ select coalesce(jsonb_agg(jsonb_build_object('stars', c.stars, 'note', c.note,
          'created_at', c.created_at, 'business', b.name) order by c.created_at desc), '[]')
        from client_ratings c join businesses b on b.id = c.business_id where c.user_id = $1 $q$ into rated using p_user;
    end if;
  end if;
  select admin_person(u.id) || jsonb_build_object('created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
      'suspended', p.suspended_at is not null, 'suspend_reason', p.suspend_reason, 'delete_requested_at', p.delete_requested_at,
      'is_admin', exists(select 1 from platform_admins a where a.user_id = u.id),
      'bookings', (select coalesce(jsonb_agg(x order by x->>'date' desc, x->>'time' desc), '[]') from (
          select jsonb_build_object('id', bk.id, 'date', bk.date, 'time', bk.time, 'status', bk.status,
            'business_id', b.id, 'business', b.name, 'brand_color', b.brand_color, 'service', s.name) x
          from bookings bk join businesses b on b.id = bk.business_id join services s on s.id = bk.service_id
          where bk.user_id = u.id order by bk.date desc, bk.time desc limit 100) s),
      'packages', (select coalesce(jsonb_agg(jsonb_build_object('business_id', b.id, 'business', b.name,
          'credits', m.credits, 'status', m.status, 'pack_name', m.pack_name)), '[]')
          from memberships m join businesses b on b.id = m.business_id where m.user_id = u.id),
      'businesses', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'city', b.city,
          'is_published', b.is_published, 'suspended', b.suspended_at is not null)), '[]')
          from businesses b where b.owner_id = u.id),
      'reviews', revs, 'rated', rated,
      'log', (select coalesce(jsonb_agg(jsonb_build_object('action', l.action, 'note', l.note, 'created_at', l.created_at,
          'by', admin_person(l.admin_id)->>'name') order by l.created_at desc), '[]')
          from admin_log l where l.target_id = u.id))
    into res
  from auth.users u left join profiles p on p.id = u.id where u.id = p_user;
  return res;
end $$;

-- Ένα κατάστημα με τις τελευταίες κρατήσεις και κριτικές του.
create or replace function admin_business(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb; revs jsonb := '[]';
begin
  perform admin_guard();
  if admin_has_reviews() then
    execute $q$ select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
        select jsonb_build_object('id', r.id, 'stars', r.stars, 'comment', r.comment, 'created_at', r.created_at,
          'user_id', r.user_id, 'user', admin_person(r.user_id)->>'name') x
        from reviews r where r.business_id = $1 order by r.created_at desc limit 50) s $q$ into revs using p_id;
  end if;
  select jsonb_build_object('id', b.id, 'name', b.name, 'category', b.category, 'city', b.city, 'address', b.address,
      'phone', b.phone, 'logo_url', b.logo_url, 'brand_color', b.brand_color, 'created_at', b.created_at,
      'is_published', b.is_published, 'suspended', b.suspended_at is not null, 'suspend_reason', b.suspend_reason,
      'rating_avg', to_jsonb(b)->'rating_avg', 'rating_count', to_jsonb(b)->'rating_count',
      'owner', admin_person(b.owner_id),
      'services', (select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'price_cents', s.price_cents,
          'duration_min', s.duration_min, 'active', s.active)), '[]') from services s where s.business_id = b.id),
      'staff', (select coalesce(jsonb_agg(jsonb_build_object('name', st.name, 'active', st.active)), '[]') from staff st where st.business_id = b.id),
      'clients', (select count(distinct bk.user_id) from bookings bk where bk.business_id = b.id),
      'bookings_30', (select count(*) from bookings bk where bk.business_id = b.id and bk.status <> 'cancelled' and bk.date > athens_today() - 30),
      'cancelled_30', (select count(*) from bookings bk where bk.business_id = b.id and bk.status = 'cancelled' and bk.date > athens_today() - 30),
      'bookings', (select coalesce(jsonb_agg(x order by x->>'date' desc, x->>'time' desc), '[]') from (
          select jsonb_build_object('id', bk.id, 'date', bk.date, 'time', bk.time, 'status', bk.status, 'service', s.name,
            'user_id', bk.user_id, 'user', admin_person(bk.user_id)->>'name') x
          from bookings bk join services s on s.id = bk.service_id
          where bk.business_id = b.id order by bk.date desc, bk.time desc limit 50) s),
      'reviews', revs,
      'log', (select coalesce(jsonb_agg(jsonb_build_object('action', l.action, 'note', l.note, 'created_at', l.created_at) order by l.created_at desc), '[]')
          from admin_log l where l.target_id = b.id))
    into res
  from businesses b where b.id = p_id;
  return res;
end $$;

-- ---------- Κρατήσεις μιας μέρας (όλα τα καταστήματα) ----------
create or replace function admin_bookings(p_date date default null) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  perform admin_guard();
  return (select coalesce(jsonb_agg(x order by x->>'time', x->>'business'), '[]') from (
    select jsonb_build_object('id', bk.id, 'date', bk.date, 'time', bk.time, 'status', bk.status,
      'business_id', b.id, 'business', b.name, 'brand_color', b.brand_color, 'service', s.name,
      'user_id', bk.user_id, 'user', admin_person(bk.user_id)->>'name', 'email', admin_person(bk.user_id)->>'email') x
    from bookings bk join businesses b on b.id = bk.business_id join services s on s.id = bk.service_id
    where bk.date = coalesce(p_date, athens_today()) limit 1000) s);
end $$;

-- ---------- Βαθμολογίες ----------
create or replace function admin_reviews() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb := '[]';
begin
  perform admin_guard();
  if admin_has_reviews() then
    execute $q$ select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
        select jsonb_build_object('id', r.id, 'stars', r.stars, 'comment', r.comment, 'created_at', r.created_at,
          'business_id', b.id, 'business', b.name, 'user_id', r.user_id, 'user', admin_person(r.user_id)->>'name') x
        from reviews r join businesses b on b.id = r.business_id order by r.created_at desc limit 300) s $q$ into res;
  end if;
  return res;
end $$;

-- ============================================================
-- Ενέργειες (όλες γράφονται στο admin_log)
-- ============================================================
create or replace function admin_suspend_business(p_id uuid, p_on boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare b businesses;
begin
  perform admin_guard();
  update businesses set suspended_at = case when p_on then coalesce(suspended_at, now()) end,
    suspend_reason = case when p_on then nullif(btrim(coalesce(p_reason,'')), '') end
  where id = p_id returning * into b;
  if not found then return jsonb_build_object('ok', false, 'error', 'Δεν βρέθηκε'); end if;
  perform notify(b.owner_id, b.name, case when p_on
    then 'Το κατάστημα τέθηκε σε αναστολή από το SpotOn και δεν φαίνεται στους πελάτες.' || coalesce(' Λόγος: ' || b.suspend_reason, '')
    else 'Το κατάστημα ενεργοποιήθηκε ξανά και φαίνεται στους πελάτες.' end);
  perform admin_note(case when p_on then 'Αναστολή καταστήματος' else 'Ενεργοποίηση καταστήματος' end, 'business', p_id, p_reason);
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_suspend_user(p_user uuid, p_on boolean, p_reason text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform admin_guard();
  if p_user = auth.uid() then return jsonb_build_object('ok', false, 'error', 'Δεν γίνεται για τον δικό σου λογαριασμό'); end if;
  insert into profiles(id) values (p_user) on conflict do nothing;
  update profiles set suspended_at = case when p_on then coalesce(suspended_at, now()) end,
    suspend_reason = case when p_on then nullif(btrim(coalesce(p_reason,'')), '') end where id = p_user;
  perform notify(p_user, 'SpotOn', case when p_on
    then 'Ο λογαριασμός σου τέθηκε σε αναστολή και δεν μπορείς να κλείνεις νέα ραντεβού.' || coalesce(' Λόγος: ' || nullif(btrim(coalesce(p_reason,'')), ''), '')
    else 'Ο λογαριασμός σου ενεργοποιήθηκε ξανά.' end);
  perform admin_note(case when p_on then 'Αναστολή λογαριασμού' else 'Άρση αναστολής' end, 'user', p_user, p_reason);
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_message(p_user uuid, p_text text) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform admin_guard();
  if btrim(coalesce(p_text, '')) = '' then return jsonb_build_object('ok', false, 'error', 'Γράψε μήνυμα'); end if;
  perform notify(p_user, 'SpotOn', btrim(p_text));
  perform admin_note('Μήνυμα', 'user', p_user, btrim(p_text));
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_cancel_booking(p_booking uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bk bookings; bname text; owner uuid;
begin
  perform admin_guard();
  update bookings set status = 'cancelled', cancelled_at = now() where id = p_booking and status = 'booked' returning * into bk;
  if not found then return jsonb_build_object('ok', false, 'error', 'Η κράτηση δεν είναι ενεργή'); end if;
  select name, owner_id into bname, owner from businesses where id = bk.business_id;
  perform notify(bk.user_id, bname, format('Η κράτησή σου %s %s ακυρώθηκε από το SpotOn.', to_char(bk.date,'DD/MM'), to_char(bk.time,'HH24:MI')));
  perform notify(owner, bname, format('Η κράτηση %s %s ακυρώθηκε από το SpotOn.', to_char(bk.date,'DD/MM'), to_char(bk.time,'HH24:MI')));
  perform admin_note('Ακύρωση κράτησης', 'booking', p_booking, bname);
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_delete_review(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform admin_guard();
  if not admin_has_reviews() then return jsonb_build_object('ok', false, 'error', 'Δεν υπάρχουν βαθμολογίες'); end if;
  execute 'delete from reviews where id = $1' using p_id;
  perform admin_note('Διαγραφή κριτικής', 'review', p_id);
  return jsonb_build_object('ok', true);
end $$;

-- Διαγραφή καταστήματος: ενημερώνει όσους έχουν μελλοντικό ραντεβού και το σβήνει.
create or replace function admin_delete_business(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare b businesses; u uuid;
begin
  perform admin_guard();
  select * into b from businesses where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Δεν βρέθηκε'); end if;
  for u in select distinct user_id from bookings where business_id = p_id and status = 'booked' and date >= athens_today() loop
    perform notify(u, b.name, 'Το κατάστημα έκλεισε στο SpotOn και τα επόμενα ραντεβού σου εκεί ακυρώθηκαν.');
  end loop;
  perform notify(b.owner_id, 'SpotOn', format('Το κατάστημα «%s» διαγράφηκε από το SpotOn.', b.name));
  delete from businesses where id = p_id;
  perform admin_note('Διαγραφή καταστήματος', 'business', p_id, b.name);
  return jsonb_build_object('ok', true);
end $$;

-- Διαγραφή λογαριασμού τώρα (ίδια διαδικασία με την αίτηση διαγραφής του 006).
create or replace function admin_delete_user(p_user uuid) returns jsonb
language plpgsql security definer set search_path=public, auth as $$
declare who text;
begin
  perform admin_guard();
  if p_user = auth.uid() then return jsonb_build_object('ok', false, 'error', 'Δεν γίνεται για τον δικό σου λογαριασμό'); end if;
  if exists(select 1 from platform_admins where user_id = p_user) then return jsonb_build_object('ok', false, 'error', 'Είναι super admin'); end if;
  who := coalesce(admin_person(p_user)->>'email', '');
  perform delete_account_now(p_user);
  perform admin_note('Διαγραφή λογαριασμού', 'user', p_user, who);
  return jsonb_build_object('ok', true);
end $$;

create or replace function admin_cancel_deletion(p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform admin_guard();
  update profiles set delete_requested_at = null where id = p_user;
  perform notify(p_user, 'SpotOn', 'Η αίτηση διαγραφής του λογαριασμού σου ακυρώθηκε.');
  perform admin_note('Ακύρωση αίτησης διαγραφής', 'user', p_user);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Δικαιώματα ----------
revoke all on function admin_guard(), admin_note(text, text, uuid, text), admin_person(uuid) from public, anon, authenticated;
grant execute on function is_super_admin() to authenticated;
do $$
declare f text;
begin
  foreach f in array array['admin_overview()', 'admin_businesses(text)', 'admin_users(text)', 'admin_user(uuid)',
    'admin_business(uuid)', 'admin_bookings(date)', 'admin_reviews()', 'admin_suspend_business(uuid, boolean, text)',
    'admin_suspend_user(uuid, boolean, text)', 'admin_message(uuid, text)', 'admin_cancel_booking(uuid)',
    'admin_delete_review(uuid)', 'admin_delete_business(uuid)', 'admin_delete_user(uuid)', 'admin_cancel_deletion(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ============================================================
-- ΓΙΝΕ SUPER ADMIN (μία φορά, στο SQL Editor, με το email που συνδέεσαι στο SpotOn):
--
--   insert into platform_admins(user_id)
--   select id from auth.users where email = 'TO-EMAIL-SOU@example.com'
--   on conflict do nothing;
-- ============================================================
