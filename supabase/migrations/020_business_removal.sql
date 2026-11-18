-- 020: Αίτηση αφαίρεσης επιχείρησης από τον ιδιοκτήτη (2026-11-18).
-- Ο ιδιοκτήτης στέλνει αίτηση (λόγος + προαιρετικό σχόλιο) από τις Ρυθμίσεις καταστήματος → Στοιχεία.
-- Η επιχείρηση αφαιρείται αυτόματα 7 μέρες μετά (όπως η διαγραφή λογαριασμού του 006). Ως τότε δουλεύει κανονικά
-- και ο ιδιοκτήτης μπορεί να ακυρώσει την αίτηση. Ο super admin τη βλέπει στις «Αιτήσεις διαγραφής» και μπορεί
-- να την ακυρώσει ή να αφαιρέσει την επιχείρηση αμέσως.
-- Στην αφαίρεση ενημερώνονται οι πελάτες με μελλοντικό ραντεβού (όπως στην admin_delete_business του 010).
-- Τρέχει μετά τα 001–019 και μπορεί να ξανατρέξει.

alter table businesses add column if not exists removal_requested_at timestamptz;
alter table businesses add column if not exists removal_reason text;
alter table businesses add column if not exists removal_note text;
do $$ begin
  alter table businesses add constraint businesses_removal_check
    check ((removal_reason is null or char_length(removal_reason) <= 80) and (removal_note is null or char_length(removal_note) <= 600));
exception when duplicate_object then null; end $$;

-- Οι στήλες της αίτησης γράφονται μόνο από τις συναρτήσεις εδώ (όχι με απευθείας update του ιδιοκτήτη ή μια παλιά αποθήκευση).
create or replace function guard_business_removal() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('spoton.removal', true), '') <> 'on' then
    if tg_op = 'INSERT' then new.removal_requested_at := null; new.removal_reason := null; new.removal_note := null;
    else new.removal_requested_at := old.removal_requested_at; new.removal_reason := old.removal_reason; new.removal_note := old.removal_note; end if;
  end if;
  return new;
end $$;
drop trigger if exists businesses_removal_guard on businesses;
create trigger businesses_removal_guard before insert or update on businesses for each row execute function guard_business_removal();

create or replace function set_business_removal(p_id uuid, p_at timestamptz, p_reason text, p_note text) returns void
language plpgsql security definer set search_path=public as $$
begin
  perform set_config('spoton.removal', 'on', true);
  update businesses set removal_requested_at = p_at, removal_reason = p_reason, removal_note = p_note where id = p_id;
  perform set_config('spoton.removal', 'off', true);
end $$;
revoke all on function set_business_removal(uuid, timestamptz, text, text) from public, anon, authenticated;

-- ---------- Ο ιδιοκτήτης ----------
create or replace function request_business_removal(p_business uuid, p_reason text, p_note text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare b businesses; at timestamptz; a uuid; why text := nullif(left(btrim(coalesce(p_reason, '')), 80), '');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Συνδέσου πρώτα'); end if;
  select * into b from businesses where id = p_business;
  if not found or b.owner_id <> auth.uid() then return jsonb_build_object('ok', false, 'error', 'Μόνο ο ιδιοκτήτης μπορεί να ζητήσει αφαίρεση'); end if;
  if why is null then return jsonb_build_object('ok', false, 'error', 'Διάλεξε έναν λόγο'); end if;
  at := coalesce(b.removal_requested_at, now());
  perform set_business_removal(b.id, at, why, nullif(left(btrim(coalesce(p_note, '')), 600), ''));
  if b.removal_requested_at is null then
    perform notify(b.owner_id, 'SpotOn', format('Λάβαμε την αίτηση αφαίρεσης για «%s». Η επιχείρηση αφαιρείται στις %s. Ως τότε μπορείς να την ακυρώσεις από τις Ρυθμίσεις καταστήματος.',
      b.name, to_char((at + interval '7 days') at time zone 'Europe/Athens', 'DD/MM')));
    for a in select user_id from platform_admins loop
      perform notify(a, 'SpotOn', format('Νέα αίτηση αφαίρεσης επιχείρησης: «%s» (%s).', b.name, why));
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'requested_at', at, 'remove_on', at + interval '7 days');
end $$;

create or replace function cancel_business_removal(p_business uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from businesses where id = p_business and owner_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Μόνο ο ιδιοκτήτης μπορεί να την ακυρώσει'); end if;
  perform set_business_removal(p_business, null, null, null);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Η αφαίρεση ----------
create or replace function remove_business_now(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare b businesses; u uuid;
begin
  select * into b from businesses where id = p_id;
  if not found then return; end if;
  for u in select distinct user_id from bookings where business_id = p_id and status = 'booked' and date >= athens_today() and user_id <> b.owner_id loop
    perform notify(u, b.name, 'Το κατάστημα έκλεισε στο SpotOn και τα επόμενα ραντεβού σου εκεί ακυρώθηκαν.');
  end loop;
  perform notify(b.owner_id, 'SpotOn', format('Η επιχείρηση «%s» αφαιρέθηκε από το SpotOn, όπως ζήτησες.', b.name));
  delete from businesses where id = p_id;
end $$;

create or replace function process_business_removals() returns void
language plpgsql security definer set search_path=public as $$
declare r record;
begin
  for r in select id from businesses where removal_requested_at is not null and removal_requested_at <= now() - interval '7 days' loop
    perform remove_business_now(r.id);
  end loop;
end $$;
revoke all on function remove_business_now(uuid), process_business_removals() from public, anon, authenticated;
select cron.schedule('business-removals', '25 1 * * *', 'select process_business_removals()');

-- ---------- Super admin ----------
create or replace function admin_business_removals() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  perform admin_guard();
  return (select coalesce(jsonb_agg(x order by x->>'requested_at'), '[]'::jsonb) from (
    select jsonb_build_object('id', b.id, 'name', b.name, 'category', b.category, 'city', b.city, 'logo_url', b.logo_url,
      'brand_color', b.brand_color, 'requested_at', b.removal_requested_at, 'remove_on', b.removal_requested_at + interval '7 days',
      'reason', b.removal_reason, 'note', b.removal_note, 'owner', admin_person(b.owner_id),
      'upcoming', (select count(*) from bookings bk where bk.business_id = b.id and bk.status = 'booked' and bk.date >= athens_today())) x
    from businesses b where b.removal_requested_at is not null) s);
end $$;

create or replace function admin_cancel_business_removal(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare b businesses;
begin
  perform admin_guard();
  select * into b from businesses where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Δεν βρέθηκε'); end if;
  perform set_business_removal(p_id, null, null, null);
  perform notify(b.owner_id, 'SpotOn', format('Η αίτηση αφαίρεσης για «%s» ακυρώθηκε. Η επιχείρηση μένει στο SpotOn.', b.name));
  perform admin_note('Ακύρωση αίτησης αφαίρεσης', 'business', p_id, b.name);
  return jsonb_build_object('ok', true);
end $$;

grant execute on function request_business_removal(uuid, text, text), cancel_business_removal(uuid) to authenticated;
grant execute on function admin_business_removals(), admin_cancel_business_removal(uuid) to authenticated;
