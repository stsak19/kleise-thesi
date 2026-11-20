-- 022: Υπενθύμιση ραντεβού (2026-11-20, Λεωνίδας).
-- Κάθε 15 λεπτά ένα pg_cron στέλνει ειδοποίηση (πίνακας notifications, φαίνεται στις Κρατήσεις) σε όποιον έχει
-- κράτηση που ξεκινά μέσα στο διάστημα που διάλεξε (προεπιλογή: 24 ώρες πριν, δηλαδή την προηγούμενη μέρα).
-- Ο πελάτης το αλλάζει ή το κλείνει στις Ρυθμίσεις → Ειδοποιήσεις → «Υπενθύμιση ραντεβού» (profiles.remind_min, null = όχι).
-- Κάθε κράτηση παίρνει μία υπενθύμιση (bookings.reminded_at). Κράτηση που έγινε λίγο πριν την ώρα της δεν παίρνει.
-- Όταν μπουν ειδοποιήσεις push (profiles.push_token), το ίδιο σημείο θα στέλνει και push.
-- Τρέχει μετά τα 001–021 και μπορεί να ξανατρέξει.

alter table profiles add column if not exists remind_min int default 1440;
do $$ begin
  alter table profiles add constraint profiles_remind_min_check check (remind_min is null or remind_min between 15 and 10080);
exception when duplicate_object then null; end $$;
alter table bookings add column if not exists reminded_at timestamptz;
create index if not exists bookings_to_remind on bookings (date) where status = 'booked' and reminded_at is null;

create or replace function send_booking_reminders() returns int
language plpgsql security definer set search_path=public as $$
declare r record; n int := 0; local_now timestamp := now() at time zone 'Europe/Athens'; starts timestamp;
begin
  for r in
    select bk.id, bk.user_id, bk.date, bk.time, bk.created_at, s.name as service, b.name as biz, b.address, coalesce(p.remind_min, 1440) as mins
    from bookings bk
    join services s on s.id = bk.service_id
    join businesses b on b.id = bk.business_id
    left join profiles p on p.id = bk.user_id
    where bk.status = 'booked' and bk.reminded_at is null
      and bk.date between local_now::date and (local_now + interval '7 days')::date
      and (p.id is null or p.remind_min is not null)
    for update of bk skip locked
  loop
    starts := r.date + r.time;
    continue when starts <= local_now or starts > local_now + make_interval(mins => r.mins);
    -- Κλείστηκε ήδη μέσα στο διάστημα της υπενθύμισης (π.χ. το πρωί για το απόγευμα): δεν χρειάζεται.
    if (r.created_at at time zone 'Europe/Athens') > starts - make_interval(mins => r.mins) then
      update bookings set reminded_at = now() where id = r.id;
      continue;
    end if;
    perform notify(r.user_id, 'Υπενθύμιση ραντεβού', format('%s · %s, %s στις %s%s',
      r.biz, r.service,
      case when r.date = local_now::date then 'σήμερα' when r.date = (local_now + interval '1 day')::date then 'αύριο' else to_char(r.date, 'DD/MM') end,
      to_char(r.time, 'HH24:MI'),
      case when coalesce(btrim(r.address), '') <> '' then ' · ' || r.address else '' end));
    update bookings set reminded_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function send_booking_reminders() from public, anon, authenticated;

-- Αν αλλάξει η ώρα ή η μέρα μιας κράτησης, ξαναστέλνεται υπενθύμιση για τη νέα.
create or replace function reset_booking_reminder() returns trigger language plpgsql as $$
begin
  if new.date is distinct from old.date or new.time is distinct from old.time then new.reminded_at := null; end if;
  return new;
end $$;
drop trigger if exists bookings_reset_reminder on bookings;
create trigger bookings_reset_reminder before update on bookings for each row execute function reset_booking_reminder();

select cron.schedule('booking-reminders', '*/15 * * * *', 'select send_booking_reminders()');
