-- 023: Στατιστικά επιχείρησης (2026-11-20, Λεωνίδας).
-- Μία συνάρτηση μόνο για ανάγνωση, που τη βλέπει μόνο ο ιδιοκτήτης (Κατάστημα → Στατιστικά, app/(biz)/owner/stats.tsx):
-- κρατήσεις ανά εβδομάδα, πιο γεμάτες ώρες και μέρες, «δεν ήρθε», ακυρώσεις, νέοι πελάτες, δημοφιλείς υπηρεσίες,
-- πακέτα που ενεργοποιήθηκαν και έσοδα από πληρωμές online (χωρίς τις δοκιμαστικές του 019).
-- Δεν φτιάχνει πίνακες· διαβάζει bookings, services, credit_log, payments. Τρέχει μετά τα 001–022 και μπορεί να ξανατρέξει.

create or replace function business_stats(p_business uuid, p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
  today date := (now() at time zone 'Europe/Athens')::date;
  d int := least(greatest(coalesce(p_days, 30), 7), 365);
  since date := today - d;
  since_ts timestamptz := (today - d + 1)::timestamp at time zone 'Europe/Athens';
  res jsonb;
  has_test boolean := exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payments' and column_name = 'test');
  paid_cents bigint := 0; paid_fee bigint := 0; paid_n int := 0;
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;

  -- Πληρωμές online (018). Οι δοκιμαστικές (019, payments.test) δεν μετράνε ως έσοδα.
  if to_regclass('public.payments') is not null then
    execute format($q$select coalesce(sum(amount_cents), 0), coalesce(sum(fee_cents), 0), count(*)::int from payments
      where business_id = $1 and status = 'paid' and paid_at >= $2 %s$q$,
      case when has_test then 'and not test' else '' end)
      into paid_cents, paid_fee, paid_n using p_business, since_ts;
  end if;

  with bk as (
    select b.*, s.name as service, s.price_cents
    from bookings b join services s on s.id = b.service_id
    where b.business_id = p_business and b.date > since and b.date <= today
  ), live as (select * from bk where status <> 'cancelled'),
  firsts as (
    select user_id, min(date) as first from bookings where business_id = p_business and status <> 'cancelled' group by user_id
  )
  select jsonb_build_object(
    'days', d,
    'since', since + 1,
    'total', (select count(*) from live),
    'attended', (select count(*) from bk where status = 'attended'),
    'no_show', (select count(*) from bk where status = 'no_show'),
    'cancelled', (select count(*) from bk where status = 'cancelled'),
    'clients', (select count(distinct user_id) from live),
    'new_clients', (select count(*) from firsts where first > since and first <= today),
    'upcoming', (select count(*) from bookings where business_id = p_business and status = 'booked' and date > today and date <= today + 7),
    'value_cents', (select coalesce(sum(price_cents), 0) from live where status <> 'no_show'),
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('week', w, 'n', n) order by w) from (
        select date_trunc('week', date)::date as w, count(*) as n from live group by 1) t), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h) from (
        select extract(hour from time)::int as h, count(*) as n from live group by 1) t), '[]'::jsonb),
    'weekdays', coalesce((select jsonb_agg(jsonb_build_object('wd', wd, 'n', n) order by wd) from (
        select extract(dow from date)::int as wd, count(*) as n from live group by 1) t), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(jsonb_build_object('name', service, 'n', n, 'no_show', ns, 'value_cents', v) order by n desc) from (
        select service, count(*) as n, count(*) filter (where status = 'no_show') as ns,
          coalesce(sum(price_cents) filter (where status <> 'no_show'), 0) as v
        from live group by service order by count(*) desc limit 8) t), '[]'::jsonb),
    'packs', (select count(*) from credit_log where business_id = p_business and kind = 'package'
                and created_at >= since_ts),
    'paid_cents', paid_cents, 'paid_fee_cents', paid_fee, 'paid_n', paid_n
  ) into res;
  return res;
end $$;
revoke all on function business_stats(uuid, int) from public, anon;
grant execute on function business_stats(uuid, int) to authenticated;

-- Αν υπάρχει ήδη ο πίνακας applied_migrations (025), γράψου εκεί.
do $$ begin
  if to_regprocedure('public.mark_migration(integer, text)') is not null then perform mark_migration(23, '023_business_stats'); end if;
end $$;
