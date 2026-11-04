-- 003: διάταξη σελίδας και θέμα ανά κατάστημα, μηνύματα από τον ιδιοκτήτη στους πελάτες του.

-- 1) Διάταξη σελίδας κράτησης (classes / appointment / menu) και θέμα εμφάνισης (κλειδί από lib/presets.ts).
--    Αν μείνουν κενά, η εφαρμογή χρησιμοποιεί το πρότυπο του είδους της επιχείρησης.
alter table businesses add column if not exists layout text check (layout is null or layout in ('classes','appointment','menu'));
alter table businesses add column if not exists theme text check (theme is null or theme ~ '^[a-z_]{1,32}$');

-- 2) Ποιοι είναι πελάτες ενός καταστήματος: όσοι έχουν κάνει κράτηση ή έχουν συνδρομή/πακέτο εκεί.
create or replace function owner_clients(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', u.user_id, 'name', trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),
                                        'phone', p.phone, 'last', u.last) order by u.last desc nulls last)
    from (
      select user_id, max(date) as last from bookings where business_id=p_business group by user_id
      union
      select user_id, null from memberships m where m.business_id=p_business
        and not exists (select 1 from bookings b where b.business_id=p_business and b.user_id=m.user_id)
    ) u left join profiles p on p.id=u.user_id
  ), '[]');
end $$;

-- 3) Μήνυμα/ειδοποίηση σε έναν πελάτη (p_user) ή σε όλους (p_user = null).
--    Στέλνει μόνο σε πραγματικούς πελάτες του καταστήματος. Επιστρέφει πόσοι το έλαβαν.
create or replace function owner_notify(p_business uuid, p_user uuid, p_title text, p_body text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare bname text; n int;
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  if coalesce(trim(p_body),'') = '' then return jsonb_build_object('ok',false,'error','Γράψε μήνυμα'); end if;
  if length(p_body) > 1000 or length(coalesce(p_title,'')) > 120 then return jsonb_build_object('ok',false,'error','Πολύ μεγάλο μήνυμα'); end if;
  select name into bname from businesses where id=p_business;
  insert into notifications(user_id, title, body)
    select c.user_id, bname || coalesce(nullif(' · ' || trim(p_title), ' · '), ''), trim(p_body)
    from (select user_id from bookings where business_id=p_business
          union select user_id from memberships where business_id=p_business) c
    where p_user is null or c.user_id = p_user;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0, 'sent', n, 'error', case when n = 0 then 'Δεν βρέθηκε πελάτης' end);
end $$;

grant execute on function owner_clients(uuid), owner_notify(uuid, uuid, text, text) to authenticated;
