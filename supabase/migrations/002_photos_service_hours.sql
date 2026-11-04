-- 1) Φωτογραφία εξωφύλλου (το logo_url υπάρχει ήδη)
alter table businesses add column if not exists cover_url text;

-- 2) Ωράριο ανά υπηρεσία: γραμμές με service_id ισχύουν μόνο για εκείνη την υπηρεσία.
--    Αν μια υπηρεσία δεν έχει δικό της ωράριο, ακολουθεί το γενικό (service_id null).
--    Διάλειμμα = δύο διαστήματα την ίδια μέρα (π.χ. 09–14 και 17–21).
alter table opening_hours add column if not exists service_id uuid references services on delete cascade;
create index if not exists opening_hours_service on opening_hours (service_id);

create or replace function day_availability(p_service uuid, p_date date) returns table(slot_time time, capacity int, taken int, free int)
language plpgsql stable security definer set search_path=public as $$
declare s services; b businesses; own boolean;
begin
  select * into s from services where id=p_service and active;
  if not found then return; end if;
  select * into b from businesses where id=s.business_id;
  if p_date < current_date or p_date > current_date + b.max_days_ahead then return; end if;
  if exists(select 1 from day_overrides where business_id=b.id and date=p_date and closed) then return; end if;
  own := exists(select 1 from opening_hours where service_id=s.id);
  return query
    with slots as (
      select distinct gs::time as t from opening_hours h,
        generate_series(p_date + h.opens, p_date + h.closes - make_interval(mins=>s.duration_min),
                        make_interval(mins=>s.duration_min)) gs
      where h.business_id=b.id and h.weekday=extract(dow from p_date)
        and (case when own then h.service_id=s.id else h.service_id is null end)
    )
    select t, slot_capacity(s.id,p_date,t), slot_taken(s.id,p_date,t),
           greatest(slot_capacity(s.id,p_date,t)-slot_taken(s.id,p_date,t),0)
    from slots
    where p_date + t > (now() at time zone 'Europe/Athens')
    order by t;
end $$;

-- 3) Χώρος για φωτογραφίες καταστημάτων (δημόσια ανάγνωση, ανέβασμα μόνο στον δικό σου φάκελο)
insert into storage.buckets (id, name, public) values ('business-media', 'business-media', true)
  on conflict (id) do nothing;
drop policy if exists "media read" on storage.objects;
drop policy if exists "media write own" on storage.objects;
drop policy if exists "media update own" on storage.objects;
drop policy if exists "media delete own" on storage.objects;
create policy "media read" on storage.objects for select using (bucket_id = 'business-media');
create policy "media write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media update own" on storage.objects for update to authenticated
  using (bucket_id = 'business-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'business-media' and (storage.foldername(name))[1] = auth.uid()::text);
