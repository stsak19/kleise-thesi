-- 025: Ποια migrations έχουν τρέξει στη βάση (2026-11-20, Λεωνίδας).
-- Πίνακας applied_migrations: μία γραμμή για κάθε αρχείο του supabase/migrations/ που έτρεξε εδώ.
-- Το `npm run allages` (scripts/allages.mjs) τον διαβάζει με το δημόσιο κλειδί (συνάρτηση applied_migrations_list)
-- και λέει «το 026 δεν έχει τρέξει ακόμα στη βάση».
--
-- ΚΑΝΟΝΑΣ από εδώ και πέρα: κάθε νέο migration τελειώνει με
--     select mark_migration(26, '026_<όνομα>');
-- (ο αριθμός και το όνομα του αρχείου χωρίς .sql). Δες docs/features/vasi.md.
--
-- Εδώ γράφονται όσα υπάρχουν ήδη: 001–021 (έτρεξαν όλα ως 2026-11-19, εκτός από το 007 που δεν υπάρχει)
-- και τα 022–024 μόνο αν η βάση έχει ήδη ό,τι φτιάχνουν. Τρέχει μετά τα 001–021 και μπορεί να ξανατρέξει.

create table if not exists applied_migrations (
  num int primary key check (num > 0),
  name text not null,
  applied_at timestamptz not null default now()
);
alter table applied_migrations enable row level security;
-- Καμία πολιτική: γράφεται μόνο από τη mark_migration, διαβάζεται από την applied_migrations_list.

create or replace function mark_migration(p_num int, p_name text) returns void
language sql security definer set search_path=public as $$
  insert into applied_migrations(num, name) values (p_num, p_name)
  on conflict (num) do update set name = excluded.name;
$$;
revoke all on function mark_migration(int, text) from public, anon, authenticated;

-- Μόνο αριθμοί, ονόματα αρχείων και ώρες: τίποτα ιδιωτικό, άρα ανοιχτό και στο δημόσιο κλειδί.
create or replace function applied_migrations_list() returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('num', num, 'name', name, 'applied_at', applied_at) order by num), '[]'::jsonb)
  from applied_migrations;
$$;
grant execute on function applied_migrations_list() to anon, authenticated;

-- Όσα έτρεξαν πριν υπάρξει ο πίνακας (η ώρα τους δεν είναι γνωστή· μπαίνει η τωρινή).
insert into applied_migrations(num, name) values
  (1, '001_brand_color'), (2, '002_photos_service_hours'), (3, '003_layout_theme_messages'), (4, '004_packages'),
  (5, '005_team_notes_fixes'), (6, '006_invites_delete_account'), (8, '008_service_groups'), (9, '009_signup_name'),
  (10, '010_super_admin'), (11, '011_show_phone'), (12, '012_favorites'), (13, '013_pack_history'), (14, '014_show_seats'),
  (15, '015_pack_services'), (16, '016_reviews'), (17, '017_staff_schedule'), (18, '018_online_payments'),
  (19, '019_test_payments'), (20, '020_store_slug'), (21, '021_business_removal')
on conflict (num) do nothing;

-- 022–024 (PR του Λεωνίδα της ίδιας μέρας): γράφονται μόνο αν έχουν τρέξει. Αν τρέξουν μετά, γράφονται μόνα τους.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'reminded_at')
    then perform mark_migration(22, '022_booking_reminders'); end if;
  if to_regprocedure('public.business_stats(uuid, integer)') is not null then perform mark_migration(23, '023_business_stats'); end if;
  if to_regclass('public.client_errors') is not null then perform mark_migration(24, '024_client_errors'); end if;
end $$;

select mark_migration(25, '025_applied_migrations');
