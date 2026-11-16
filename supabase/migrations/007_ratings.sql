-- ============================================================
-- 007: Βαθμολογίες, και προς τις δύο μεριές.
--  1) reviews: ο πελάτης βαθμολογεί το κατάστημα μετά από μια επίσκεψη (1–5 αστέρια + σχόλιο).
--     Φαίνονται σε όλους (κάρτες, αναζήτηση, σελίδα καταστήματος) με το μικρό όνομα + αρχικό επωνύμου.
--  2) client_ratings: η επιχείρηση βαθμολογεί τον πελάτη μετά από μια επίσκεψη.
--     Τις βλέπουν ΜΟΝΟ επιχειρήσεις, και μόνο για πελάτες που έχουν κλείσει σε αυτές.
--     Ο ίδιος ο πελάτης και οι άλλοι πελάτες δεν τις βλέπουν ποτέ (RLS + μόνο μέσω RPC).
--  3) Μέσος όρος καταστήματος στις στήλες businesses.rating_avg / rating_count (τις γράφει μόνο ο trigger).
-- Τρέχει πάνω στα 001–005 (ανεξάρτητο από το 006 της πρόσκλησης υπαλλήλων). Μπορεί να ξανατρέξει.
-- ============================================================

-- ---------- 1) Κριτικές καταστημάτων ----------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings on delete cascade,
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_business_idx on reviews (business_id, created_at desc);
create index if not exists reviews_user_idx on reviews (user_id);
alter table reviews enable row level security;
-- Απευθείας ανάγνωση: μόνο ο συντάκτης και ο ιδιοκτήτης. Το κοινό τις διαβάζει μέσω business_reviews() χωρίς user_id.
drop policy if exists "reviews own or owner" on reviews;
create policy "reviews own or owner" on reviews for select using (user_id = auth.uid() or is_owner(business_id));
-- Καμία πολιτική insert/update/delete: γράφονται μόνο από την rate_business().

-- ---------- 2) Βαθμολογίες πελατών (μόνο για επιχειρήσεις) ----------
create table if not exists client_ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings on delete cascade,
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,   -- ο πελάτης που βαθμολογείται
  rated_by uuid references auth.users on delete set null,          -- ποιος από την επιχείρηση τη έβαλε
  stars smallint not null check (stars between 1 and 5),
  note text check (note is null or char_length(note) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_ratings_user_idx on client_ratings (user_id);
create index if not exists client_ratings_business_idx on client_ratings (business_id, user_id);
alter table client_ratings enable row level security;
-- Ο ιδιοκτήτης βλέπει απευθείας μόνο όσες έβαλε η δική του επιχείρηση. Ο πελάτης ΔΕΝ έχει καμία πολιτική → δεν βλέπει τίποτα.
drop policy if exists "client ratings owner" on client_ratings;
create policy "client ratings owner" on client_ratings for select using (is_owner(business_id));
-- Καμία πολιτική insert/update/delete: γράφονται μόνο από την rate_client().
revoke all on client_ratings from anon;

-- ---------- 3) Μέσος όρος καταστήματος ----------
alter table businesses add column if not exists rating_avg numeric(2,1);
alter table businesses add column if not exists rating_count int not null default 0;

-- Ο ιδιοκτήτης δεν μπορεί να αλλάξει μόνος του τον μέσο όρο: κρατάμε τις παλιές τιμές εκτός αν γράφει ο trigger.
create or replace function guard_business_rating() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('spoton.rating', true), '') <> 'on' then
    if tg_op = 'INSERT' then new.rating_avg := null; new.rating_count := 0;
    else new.rating_avg := old.rating_avg; new.rating_count := old.rating_count; end if;
  end if;
  return new;
end $$;
drop trigger if exists businesses_rating_guard on businesses;
create trigger businesses_rating_guard before insert or update on businesses for each row execute function guard_business_rating();

create or replace function refresh_business_rating(p_business uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform set_config('spoton.rating', 'on', true);
  update businesses b set rating_avg = r.avg, rating_count = r.n
    from (select round(avg(stars)::numeric, 1) as avg, count(*)::int as n from reviews where business_id = p_business) r
    where b.id = p_business;
  perform set_config('spoton.rating', 'off', true);
end $$;
revoke all on function refresh_business_rating(uuid) from public, anon, authenticated;

create or replace function reviews_changed() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform refresh_business_rating(coalesce(new.business_id, old.business_id));
  return null;
end $$;
drop trigger if exists reviews_refresh on reviews;
create trigger reviews_refresh after insert or update or delete on reviews for each row execute function reviews_changed();

-- Συντομογραφία ονόματος για δημόσια προβολή: «Χριστίνα Α.»
create or replace function short_name(p_user uuid) returns text
language sql stable security definer set search_path=public as $$
  select coalesce((select nullif(trim(p.first_name || case when p.last_name <> '' then ' ' || left(p.last_name, 1) || '.' else '' end), '')
    from profiles p where p.id = p_user), 'Πελάτης') $$;

-- Η επίσκεψη έγινε; (σημειώθηκε «Ήρθε», ή η ώρα της πέρασε χωρίς ακύρωση)
create or replace function booking_done(p_date date, p_time time, p_status booking_status) returns boolean
language sql stable as $$
  select p_status = 'attended' or (p_status = 'booked' and (p_date < athens_today()
    or (p_date = athens_today() and p_time <= (now() at time zone 'Europe/Athens')::time))) $$;

-- ---------- RPC: πελάτης ----------
create or replace function rate_business(p_booking uuid, p_stars int, p_comment text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bk bookings;
begin
  select * into bk from bookings where id = p_booking;
  if bk.id is null or bk.user_id is distinct from auth.uid() then return jsonb_build_object('ok',false,'error','Δεν βρέθηκε η κράτηση'); end if;
  if not booking_done(bk.date, bk.time, bk.status) then return jsonb_build_object('ok',false,'error','Βαθμολογείς μετά την επίσκεψη'); end if;
  if bk.date < athens_today() - 60 then return jsonb_build_object('ok',false,'error','Πέρασαν πάνω από 60 μέρες από την επίσκεψη'); end if;
  if p_stars is null or p_stars not between 1 and 5 then return jsonb_build_object('ok',false,'error','Διάλεξε 1 έως 5 αστέρια'); end if;
  insert into reviews(booking_id, business_id, user_id, stars, comment)
    values (bk.id, bk.business_id, bk.user_id, p_stars, nullif(left(trim(p_comment), 600), ''))
    on conflict (booking_id) do update set stars = excluded.stars, comment = excluded.comment, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Οι κριτικές ενός καταστήματος (δημόσιες). Χωρίς user_id· μόνο συντομευμένο όνομα.
create or replace function business_reviews(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not exists (select 1 from businesses where id = p_business and (is_published or owner_id = auth.uid())) then
    return jsonb_build_object('avg', null, 'count', 0, 'dist', '[0,0,0,0,0]'::jsonb, 'items', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'avg', (select rating_avg from businesses where id = p_business),
    'count', (select count(*) from reviews where business_id = p_business),
    'dist', (select jsonb_agg((select count(*) from reviews where business_id = p_business and stars = k) order by k) from generate_series(1,5) k),
    'items', coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('id', r.id, 'name', short_name(r.user_id), 'stars', r.stars, 'comment', r.comment,
        'date', bk.date, 'service', s.name, 'mine', r.user_id = auth.uid()) x
      from reviews r join bookings bk on bk.id = r.booking_id join services s on s.id = bk.service_id
      where r.business_id = p_business order by r.created_at desc limit 50) q), '[]'));
end $$;

-- ---------- RPC: επιχείρηση ----------
create or replace function rate_client(p_booking uuid, p_stars int, p_note text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bk bookings;
begin
  select * into bk from bookings where id = p_booking;
  if bk.id is null or not is_owner(bk.business_id) then return jsonb_build_object('ok',false,'error','Δεν βρέθηκε η κράτηση'); end if;
  if not (bk.status = 'no_show' or booking_done(bk.date, bk.time, bk.status)) then
    return jsonb_build_object('ok',false,'error','Βαθμολογείς μετά το ραντεβού'); end if;
  if p_stars is null or p_stars not between 1 and 5 then return jsonb_build_object('ok',false,'error','Διάλεξε 1 έως 5 αστέρια'); end if;
  insert into client_ratings(booking_id, business_id, user_id, rated_by, stars, note)
    values (bk.id, bk.business_id, bk.user_id, auth.uid(), p_stars, nullif(left(trim(p_note), 600), ''))
    on conflict (booking_id) do update set stars = excluded.stars, note = excluded.note, rated_by = excluded.rated_by, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Μέσος όρος πελάτη από όλες τις επιχειρήσεις (εσωτερική: καλείται μόνο από τις RPC παρακάτω).
create or replace function client_score(p_user uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object('avg', round(avg(stars)::numeric, 1), 'count', count(*), 'businesses', count(distinct business_id))
  from client_ratings where user_id = p_user $$;
revoke all on function client_score(uuid) from public, anon, authenticated;

-- Η βαθμολογία ενός πελάτη για την καρτέλα του: μόνο αν είσαι ιδιοκτήτης ΚΑΙ ο πελάτης έχει κλείσει σε σένα.
-- Οι σημειώσεις άλλων επιχειρήσεων δεν φαίνονται· μόνο ο μέσος όρος και οι δικές σου.
create or replace function owner_client_rating(p_business uuid, p_user uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  if not exists (select 1 from bookings where business_id = p_business and user_id = p_user) then
    return jsonb_build_object('avg', null, 'count', 0, 'businesses', 0, 'mine', '[]'::jsonb);
  end if;
  return client_score(p_user) || jsonb_build_object('mine', coalesce((select jsonb_agg(jsonb_build_object(
      'booking_id', cr.booking_id, 'date', bk.date, 'time', to_char(bk.time,'HH24:MI'), 'service', s.name, 'stars', cr.stars, 'note', cr.note)
      order by bk.date desc, bk.time desc)
    from client_ratings cr join bookings bk on bk.id = cr.booking_id join services s on s.id = bk.service_id
    where cr.business_id = p_business and cr.user_id = p_user), '[]'));
end $$;

-- ---------- Ενημέρωση υπαρχουσών RPC (από το 005) με τα πεδία βαθμολογίας ----------
-- my_bookings: + my_stars / my_comment (η ΔΙΚΗ μου κριτική για το κατάστημα· ποτέ η βαθμολογία που πήρα εγώ)
create or replace function my_bookings() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('id',bk.id,'date',bk.date,'time',to_char(bk.time,'HH24:MI'),
        'status',bk.status,'service',s.name,'service_id',s.id,'business',b.name,'business_id',b.id,'address',b.address,
        'staff_id',bk.staff_id,'staff',st.name,'my_stars',rv.stars,'my_comment',rv.comment)
        order by bk.date,bk.time)
      from bookings bk join services s on s.id=bk.service_id join businesses b on b.id=bk.business_id left join staff st on st.id=bk.staff_id
        left join reviews rv on rv.booking_id=bk.id
      where bk.user_id=auth.uid() and bk.date >= athens_today() - 60), '[]'),
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

-- owner_day: + my_stars / my_note (η βαθμολογία της επιχείρησης για την κράτηση) και client_rating / client_ratings (μέσος όρος πελάτη)
create or replace function owner_day(p_business uuid, p_date date) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',bk.id,'time',to_char(bk.time,'HH24:MI'),'status',bk.status,
      'service',s.name,'service_id',s.id,'duration_min',s.duration_min,'capacity',s.capacity,'price_cents',s.price_cents,
      'client',trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),'phone',p.phone,'user_id',bk.user_id,
      'staff_id',st.id,'staff',st.name,'staff_color',st.color,
      'my_stars',cr.stars,'my_note',cr.note,'client_rating',(client_score(bk.user_id)->>'avg')::numeric,'client_ratings',(client_score(bk.user_id)->>'count')::int) order by bk.time)
    from bookings bk join services s on s.id=bk.service_id left join profiles p on p.id=bk.user_id left join staff st on st.id=bk.staff_id
      left join client_ratings cr on cr.booking_id=bk.id
    where bk.business_id=p_business and bk.date=p_date and bk.status<>'cancelled'),'[]');
end $$;

-- owner_client_history: + my_stars / my_note
create or replace function owner_client_history(p_business uuid, p_user uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(x order by x->>'date' desc, x->>'time' desc) from (
    select jsonb_build_object('id',bk.id,'date',bk.date,'time',to_char(bk.time,'HH24:MI'),'status',bk.status,
      'service',s.name,'staff',st.name,'price_cents',s.price_cents,'my_stars',cr.stars,'my_note',cr.note) x
    from bookings bk join services s on s.id=bk.service_id left join staff st on st.id=bk.staff_id
      left join client_ratings cr on cr.booking_id=bk.id
    where bk.business_id=p_business and bk.user_id=p_user order by bk.date desc, bk.time desc limit 30) q), '[]');
end $$;

-- owner_clients: + rating / ratings (μέσος όρος πελάτη από όλες τις επιχειρήσεις)
create or replace function owner_clients(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', u.user_id, 'name', trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),
        'phone', p.phone, 'last', coalesce(u.last, u.first), 'first', u.first,
        'visits', coalesce(u.visits,0), 'no_shows', coalesce(u.no_shows,0), 'spent_cents', coalesce(u.spent,0), 'next', u.next,
        'tag', c.tag, 'note', c.note, 'fields', coalesce(c.fields,'[]'),
        'rating', (client_score(u.user_id)->>'avg')::numeric, 'ratings', (client_score(u.user_id)->>'count')::int,
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

-- Δικαιώματα κλήσης για τις νέες RPC (οι εσωτερικές έχουν αφαιρεθεί παραπάνω).
grant execute on function rate_business(uuid, int, text) to authenticated;
grant execute on function business_reviews(uuid) to anon, authenticated;
grant execute on function rate_client(uuid, int, text) to authenticated;
grant execute on function owner_client_rating(uuid, uuid) to authenticated;
