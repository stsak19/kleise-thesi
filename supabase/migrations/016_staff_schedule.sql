-- 016: «Το πρόγραμμά μου» για τον υπάλληλο (2026-11-18).
-- Όποιος δέχτηκε πρόσκληση (staff.user_id, migration 006) βλέπει τα επόμενα ραντεβού του
-- και τα μαθήματα που κάνει, με πόσοι έκλεισαν. Μόνο ανάγνωση. Τρέχει ΜΕΤΑ το 005 και το 006.

create or replace function staff_my_schedule(p_from date default null, p_days int default 14) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare uid uuid := auth.uid(); d0 date := coalesce(p_from, athens_today()); d1 date; res jsonb;
begin
  if uid is null then raise exception 'forbidden'; end if;
  d1 := d0 + least(greatest(coalesce(p_days, 14), 1), 60);
  select coalesce(jsonb_agg(x order by x->>'business'), '[]'::jsonb) into res from (
    select jsonb_build_object(
      'business_id', b.id, 'business', b.name, 'category', b.category, 'brand_color', b.brand_color, 'logo_url', b.logo_url,
      'staff_id', st.id, 'staff', st.name, 'access', st.access,
      'items', coalesce((
        select jsonb_agg(q.i order by q.i->>'date', q.i->>'time') from (
          -- τα ραντεβού που ανήκουν σε μένα
          select jsonb_build_object('kind', 'one', 'id', bk.id, 'date', bk.date, 'time', to_char(bk.time, 'HH24:MI'),
                   'service', sv.name, 'duration', sv.duration_min,
                   'client', nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), 'phone', p.phone) as i
            from bookings bk join services sv on sv.id = bk.service_id left join profiles p on p.id = bk.user_id
           where bk.staff_id = st.id and bk.status = 'booked' and bk.date between d0 and d1
          union all
          -- τα μαθήματα που κάνω (ομαδικά, χωρίς άτομο ανά κράτηση): μία γραμμή ανά ώρα
          select jsonb_build_object('kind', 'class', 'date', bk.date, 'time', to_char(bk.time, 'HH24:MI'),
                   'service', sv.name, 'duration', sv.duration_min, 'count', count(*), 'capacity', sv.capacity) as i
            from bookings bk join services sv on sv.id = bk.service_id
           where sv.capacity > 1 and sv.id = any(st.services) and bk.business_id = st.business_id
             and bk.staff_id is null and bk.status = 'booked' and bk.date between d0 and d1
             and extract(dow from bk.date)::smallint = any(st.days)
           group by bk.date, bk.time, sv.name, sv.duration_min, sv.capacity
        ) q), '[]'::jsonb)
    ) as x
    from staff st join businesses b on b.id = st.business_id
    where st.user_id = uid and st.active
  ) s;
  return res;
end $$;

revoke all on function staff_my_schedule(date, int) from public, anon;
grant execute on function staff_my_schedule(date, int) to authenticated;
