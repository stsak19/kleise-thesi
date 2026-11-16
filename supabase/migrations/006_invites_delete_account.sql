-- ============================================================
-- 006: πρόσκληση υπαλλήλων και διαγραφή λογαριασμού. Θέλει πρώτα το 005.
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

-- ---------- Διαγραφή λογαριασμού ----------
-- Ακυρώνει τις μελλοντικές κρατήσεις του χρήστη (ενημερώνοντας τα καταστήματα), κλείνει τις επιχειρήσεις του
-- (ακυρώνοντας τα μελλοντικά τους ραντεβού με ειδοποίηση στους πελάτες) και σβήνει τον λογαριασμό.
create or replace function delete_my_account() returns jsonb
language plpgsql security definer set search_path=public, auth as $$
declare uid uuid := auth.uid(); r record; today date := athens_today();
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;

  -- 1) Τα ραντεβού του ως πελάτη: τα καταστήματα μαθαίνουν ότι ακυρώθηκαν.
  for r in select bk.id, bk.date, bk.time, b.owner_id, b.name from bookings bk join businesses b on b.id=bk.business_id
           where bk.user_id=uid and bk.status='booked' and bk.date >= today and b.owner_id<>uid loop
    update bookings set status='cancelled', cancelled_at=now() where id=r.id;
    perform notify(r.owner_id, r.name, format('Ακυρώθηκε η κράτηση %s %s (ο πελάτης διέγραψε τον λογαριασμό του).', to_char(r.date,'DD/MM'), to_char(r.time,'HH24:MI')));
  end loop;

  -- 2) Οι επιχειρήσεις του: οι πελάτες με μελλοντικό ραντεβού ενημερώνονται, μετά σβήνονται (μαζί με υπηρεσίες, ωράριο, κρατήσεις).
  for r in select distinct bk.user_id, b.name from bookings bk join businesses b on b.id=bk.business_id
           where b.owner_id=uid and bk.status='booked' and bk.date >= today and bk.user_id<>uid loop
    perform notify(r.user_id, r.name, 'Το κατάστημα έκλεισε στο SpotOn και τα επόμενα ραντεβού σου εκεί ακυρώθηκαν.');
  end loop;
  delete from waitlist where service_id in (select s.id from services s join businesses b on b.id=s.business_id where b.owner_id=uid);
  delete from businesses where owner_id=uid;

  -- 3) Ο λογαριασμός: τα υπόλοιπα (προφίλ, κρατήσεις, αναμονή, πακέτα, μηνύματα) σβήνονται μαζί του.
  update staff set user_id=null where user_id=uid;
  delete from credit_log where user_id=uid;
  delete from auth.users where id=uid;
  return jsonb_build_object('ok',true);
end $$;

grant execute on function staff_invite_info(text), accept_staff_invite(text), delete_my_account() to authenticated;
revoke all on function delete_my_account() from anon, public;
grant execute on function delete_my_account() to authenticated;
