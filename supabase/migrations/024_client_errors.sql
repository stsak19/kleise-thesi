-- 024: Σφάλματα από τις συσκευές των χρηστών (2026-11-20, Λεωνίδας).
-- Όταν η εφαρμογή ή η ιστοσελίδα «σκάσει» στο κινητό κάποιου, το lib/errors.ts στέλνει το μήνυμα εδώ, ώστε ο super admin
-- να το βλέπει στο /admin/errors χωρίς να χρειάζεται λογαριασμός σε εξωτερική υπηρεσία (π.χ. Sentry).
-- Δεν κρατά προσωπικά στοιχεία πέρα από τον χρήστη (αν είναι συνδεδεμένος). Το ίδιο σφάλμα μέσα στην ίδια μέρα
-- γίνεται μία γραμμή με μετρητή. Όριο 500 νέες γραμμές τη μέρα, σβήσιμο μετά από 30 μέρες (cron).
-- Τρέχει μετά τα 001–023 (χρειάζεται το 010 για τον super admin) και μπορεί να ξανατρέξει.

create table if not exists client_errors (
  id bigserial primary key,
  day date not null default (now() at time zone 'Europe/Athens')::date,
  fingerprint text not null,
  message text not null,
  stack text,
  path text,
  platform text,
  version text,
  user_id uuid references auth.users on delete set null,
  count int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  unique (day, fingerprint)
);
create index if not exists client_errors_last on client_errors (last_at desc);
alter table client_errors enable row level security;
-- Καμία πολιτική: γράφεται μόνο από τη log_client_error, διαβάζεται μόνο από την admin_errors.

create or replace function log_client_error(p_message text, p_stack text default null, p_path text default null,
  p_platform text default null, p_version text default null) returns void
language plpgsql security definer set search_path=public as $$
declare msg text := left(btrim(coalesce(p_message, '')), 500); today date := (now() at time zone 'Europe/Athens')::date; fp text;
begin
  if msg = '' then return; end if;
  fp := md5(msg || '|' || coalesce(left(p_stack, 300), '') || '|' || coalesce(left(p_platform, 20), ''));
  update client_errors set count = count + 1, last_at = now(), user_id = coalesce(auth.uid(), user_id)
    where day = today and fingerprint = fp;
  if found then return; end if;
  if (select count(*) from client_errors where day = today) >= 500 then return; end if;
  insert into client_errors(day, fingerprint, message, stack, path, platform, version, user_id)
    values (today, fp, msg, left(p_stack, 4000), left(p_path, 300), left(p_platform, 20), left(p_version, 40), auth.uid())
    on conflict (day, fingerprint) do update set count = client_errors.count + 1, last_at = now();
end $$;
revoke all on function log_client_error(text, text, text, text, text) from public;
grant execute on function log_client_error(text, text, text, text, text) to anon, authenticated;

create or replace function admin_errors(p_days int default 7) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  perform admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.last_at desc) from (
    select e.id, e.day, e.message, e.stack, e.path, e.platform, e.version, e.count, e.first_at, e.last_at, e.user_id,
      nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') as user_name
    from client_errors e left join profiles p on p.id = e.user_id
    where e.day > (now() at time zone 'Europe/Athens')::date - least(greatest(coalesce(p_days, 7), 1), 30)
    order by e.last_at desc limit 300) t), '[]'::jsonb);
end $$;

create or replace function admin_clear_errors() returns void
language plpgsql security definer set search_path=public as $$
begin
  perform admin_guard();
  delete from client_errors;
end $$;

create or replace function cleanup_client_errors() returns void
language sql security definer set search_path=public as $$
  delete from client_errors where day < (now() at time zone 'Europe/Athens')::date - 30;
$$;
revoke all on function cleanup_client_errors() from public, anon, authenticated;
revoke all on function admin_errors(int), admin_clear_errors() from public, anon;
grant execute on function admin_errors(int), admin_clear_errors() to authenticated;
select cron.schedule('client-errors-cleanup', '40 1 * * *', 'select cleanup_client_errors()');
