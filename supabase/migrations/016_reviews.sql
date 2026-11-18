-- 016: Βαθμολογίες καταστημάτων (2026-11-18).
-- Ο πελάτης βαθμολογεί το κατάστημα μετά από μια επίσκεψη (1–5 αστέρια + προαιρετικό σχόλιο), μία φορά ανά κράτηση
-- (μπορεί να την αλλάξει). Φαίνονται σε όλους με το μικρό όνομα + αρχικό επωνύμου, ποτέ με user_id.
-- Ο μέσος όρος μπαίνει στις businesses.rating_avg / rating_count και τον γράφει μόνο ο trigger.
-- Η σελίδα διαχείρισης (010) διαβάζει ήδη τον πίνακα reviews και τις στήλες rating_* όταν υπάρχουν.
-- Δεν αλλάζει καμία υπάρχουσα RPC: η δική μου βαθμολογία ανά κράτηση έρχεται από τη νέα my_reviews().
-- Τρέχει μετά τα 001–015 και μπορεί να ξανατρέξει.

-- ---------- Πίνακας ----------
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
-- Απευθείας ανάγνωση μόνο ο συντάκτης και ο ιδιοκτήτης. Το κοινό τις διαβάζει από την business_reviews(), χωρίς user_id.
drop policy if exists "reviews own or owner" on reviews;
create policy "reviews own or owner" on reviews for select using (user_id = auth.uid() or is_owner(business_id));
-- Καμία πολιτική insert/update/delete: γράφονται μόνο από την rate_business() (και σβήνονται από τον admin).
revoke all on reviews from anon;

-- ---------- Μέσος όρος καταστήματος ----------
alter table businesses add column if not exists rating_avg numeric(2,1);
alter table businesses add column if not exists rating_count int not null default 0;

-- Ο ιδιοκτήτης δεν μπορεί να αλλάξει μόνος του τον μέσο όρο: μένουν οι παλιές τιμές, εκτός αν γράφει η refresh_business_rating().
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

-- Όνομα για δημόσια προβολή: «Χριστίνα Α.»
create or replace function review_name(p_user uuid) returns text
language sql stable security definer set search_path=public as $$
  select coalesce((select nullif(btrim(coalesce(p.first_name, '') ||
      case when coalesce(p.last_name, '') <> '' then ' ' || left(p.last_name, 1) || '.' else '' end), '')
    from profiles p where p.id = p_user), 'Πελάτης') $$;
revoke all on function review_name(uuid) from public, anon, authenticated;

-- ---------- RPC ----------
-- Ο πελάτης βαθμολογεί μια κράτησή του: μόνο αφού έγινε (σημειώθηκε «Ήρθε» ή πέρασε η ώρα χωρίς ακύρωση),
-- και μέσα σε 60 μέρες. Ξανά για την ίδια κράτηση = αλλαγή.
create or replace function rate_business(p_booking uuid, p_stars int, p_comment text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bk bookings; done boolean;
begin
  select * into bk from bookings where id = p_booking;
  if bk.id is null or bk.user_id is distinct from auth.uid() then return jsonb_build_object('ok', false, 'error', 'Δεν βρέθηκε η κράτηση'); end if;
  done := bk.status = 'attended' or (bk.status = 'booked' and (bk.date < athens_today()
    or (bk.date = athens_today() and bk.time <= (now() at time zone 'Europe/Athens')::time)));
  if not done then return jsonb_build_object('ok', false, 'error', 'Βαθμολογείς μετά την επίσκεψη'); end if;
  if bk.date < athens_today() - 60 then return jsonb_build_object('ok', false, 'error', 'Πέρασαν πάνω από 60 μέρες από την επίσκεψη'); end if;
  if p_stars is null or p_stars not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'Διάλεξε 1 έως 5 αστέρια'); end if;
  insert into reviews(booking_id, business_id, user_id, stars, comment)
    values (bk.id, bk.business_id, bk.user_id, p_stars, nullif(left(btrim(coalesce(p_comment, '')), 600), ''))
    on conflict (booking_id) do update set stars = excluded.stars, comment = excluded.comment, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Οι βαθμολογίες μου, ανά κράτηση (για τα κουμπιά «Βαθμολόγησε» στο ιστορικό).
create or replace function my_reviews() returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_object_agg(r.booking_id, jsonb_build_object('stars', r.stars, 'comment', r.comment)), '{}'::jsonb)
  from reviews r where r.user_id = auth.uid() $$;

-- Οι κριτικές ενός καταστήματος (δημόσιες): μέσος όρος, κατανομή 1–5 και οι 50 πιο πρόσφατες.
create or replace function business_reviews(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not exists (select 1 from businesses where id = p_business and ((is_published and suspended_at is null) or owner_id = auth.uid())) then
    return jsonb_build_object('avg', null, 'count', 0, 'dist', '[0,0,0,0,0]'::jsonb, 'items', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'avg', (select round(avg(stars)::numeric, 1) from reviews where business_id = p_business),
    'count', (select count(*) from reviews where business_id = p_business),
    'dist', (select jsonb_agg((select count(*) from reviews where business_id = p_business and stars = k) order by k) from generate_series(1, 5) k),
    'items', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
      select jsonb_build_object('id', r.id, 'name', review_name(r.user_id), 'stars', r.stars, 'comment', r.comment,
        'date', bk.date, 'service', s.name, 'mine', r.user_id = auth.uid(), 'created_at', r.created_at) x
      from reviews r join bookings bk on bk.id = r.booking_id join services s on s.id = bk.service_id
      where r.business_id = p_business order by r.created_at desc limit 50) q), '[]'::jsonb));
end $$;

grant execute on function rate_business(uuid, int, text) to authenticated;
grant execute on function my_reviews() to authenticated;
grant execute on function business_reviews(uuid) to anon, authenticated;
