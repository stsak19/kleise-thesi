-- ============================================================
-- 006: πρόσκληση υπαλλήλων και διαγραφή λογαριασμού με αίτηση (7 μέρες περιθώριο). Θέλει πρώτα το 005.
-- Μπορεί να ξανατρέξει.
-- ============================================================

-- ---------- Πρόσκληση υπαλλήλων ----------
alter table staff add column if not exists access text not null default 'staff' check (access in ('staff','manager'));
alter table staff add column if not exists invite_code text;
create unique index if not exists staff_invite_code on staff (invite_code) where invite_code is not null;
create unique index if not exists staff_one_user_per_business on staff (business_id, user_id) where user_id is not null;

-- Τι λέει ο σύνδεσμος (για την οθόνη «Πρόσκληση στην ομάδα»).
create or replace function staff_invite_info(p_code text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare st staff; b businesses;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  select * into st from staff where invite_code=upper(trim(p_code)) and active;
  if not found then return jsonb_build_object('ok',false,'error','Η πρόσκληση δεν ισχύει πια. Ζήτα νέα από την επιχείρηση.'); end if;
  select * into b from businesses where id=st.business_id;
  return jsonb_build_object('ok',true,'business',b.name,'business_id',b.id,'staff',st.name,'access',st.access);
end $$;

-- Ο συνδεδεμένος χρήστης γίνεται αυτό το μέλος της ομάδας. Ο κωδικός σβήνεται (μία χρήση).
create or replace function accept_staff_invite(p_code text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare st staff; uid uuid := auth.uid(); bname text; owner uuid;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  select * into st from staff where invite_code=upper(trim(p_code)) and active for update;
  if not found then return jsonb_build_object('ok',false,'error','Η πρόσκληση δεν ισχύει πια. Ζήτα νέα από την επιχείρηση.'); end if;
  if exists(select 1 from staff where business_id=st.business_id and user_id=uid and id<>st.id) then
    return jsonb_build_object('ok',false,'error','Είσαι ήδη στην ομάδα αυτής της επιχείρησης'); end if;
  update staff set user_id=uid, invite_code=null where id=st.id;
  select name, owner_id into bname, owner from businesses where id=st.business_id;
  perform notify(owner, bname, format('Ο/Η %s δέχτηκε την πρόσκληση και μπήκε στην ομάδα.', st.name));
  return jsonb_build_object('ok',true,'business_id',st.business_id);
end $$;

-- ---------- Διαγραφή λογαριασμού: με αίτηση ----------
-- Ο χρήστης κάνει αίτηση· ο λογαριασμός σβήνεται 7 μέρες μετά, ώστε να μη γίνει κατά λάθος.
-- Ως τότε μπορεί να την ακυρώσει (Προφίλ → Ρυθμίσεις → Διαγραφή λογαριασμού).
alter table profiles add column if not exists delete_requested_at timestamptz;

create or replace function request_account_deletion() returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); at timestamptz;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  insert into profiles(id) values (uid) on conflict do nothing;
  update profiles set delete_requested_at=coalesce(delete_requested_at, now()) where id=uid returning delete_requested_at into at;
  perform notify(uid, 'SpotOn', format('Λάβαμε την αίτηση διαγραφής. Ο λογαριασμός σου σβήνεται στις %s. Ως τότε μπορείς να την ακυρώσεις από τις Ρυθμίσεις.',
    to_char((at + interval '7 days') at time zone 'Europe/Athens','DD/MM')));
  return jsonb_build_object('ok',true,'requested_at',at,'delete_on',at + interval '7 days');
end $$;

create or replace function cancel_account_deletion() returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  update profiles set delete_requested_at=null where id=auth.uid();
  return jsonb_build_object('ok',true);
end $$;

-- Η πραγματική διαγραφή ενός χρήστη (μόνο από το προγραμματισμένο job, όχι από την εφαρμογή).
-- Ακυρώνει τις μελλοντικές κρατήσεις του (ενημερώνοντας τα καταστήματα), κλείνει τις επιχειρήσεις του
-- (ενημερώνοντας τους πελάτες με μελλοντικό ραντεβού) και σβήνει τον λογαριασμό.
drop function if exists delete_my_account();
create or replace function delete_account_now(p_user uuid) returns void
language plpgsql security definer set search_path=public, auth as $$
declare r record; today date := athens_today();
begin
  for r in select bk.id, bk.date, bk.time, b.owner_id, b.name from bookings bk join businesses b on b.id=bk.business_id
           where bk.user_id=p_user and bk.status='booked' and bk.date >= today and b.owner_id<>p_user loop
    update bookings set status='cancelled', cancelled_at=now() where id=r.id;
    perform notify(r.owner_id, r.name, format('Ακυρώθηκε η κράτηση %s %s (ο πελάτης διέγραψε τον λογαριασμό του).', to_char(r.date,'DD/MM'), to_char(r.time,'HH24:MI')));
  end loop;
  for r in select distinct bk.user_id, b.name from bookings bk join businesses b on b.id=bk.business_id
           where b.owner_id=p_user and bk.status='booked' and bk.date >= today and bk.user_id<>p_user loop
    perform notify(r.user_id, r.name, 'Το κατάστημα έκλεισε στο SpotOn και τα επόμενα ραντεβού σου εκεί ακυρώθηκαν.');
  end loop;
  delete from businesses where owner_id=p_user;
  update staff set user_id=null where user_id=p_user;
  delete from credit_log where user_id=p_user;
  delete from auth.users where id=p_user;
end $$;

create or replace function process_account_deletions() returns void
language plpgsql security definer set search_path=public as $$
declare u uuid;
begin
  for u in select id from profiles where delete_requested_at is not null and delete_requested_at <= now() - interval '7 days' loop
    perform delete_account_now(u);
  end loop;
end $$;
revoke all on function delete_account_now(uuid), process_account_deletions() from public, anon, authenticated;
select cron.schedule('account-deletions', '15 1 * * *', 'select process_account_deletions()');

grant execute on function staff_invite_info(text), accept_staff_invite(text), request_account_deletion(), cancel_account_deletion() to authenticated;
