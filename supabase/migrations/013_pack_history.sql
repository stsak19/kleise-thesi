-- 013: Ιστορικό πακέτων του πελάτη. Κάθε φορά που ένα πακέτο αντικαθίσταται από νέο (ανανέωση, νέο πακέτο),
-- το παλιό αποθηκεύεται εδώ, ώστε να φαίνεται στις Κρατήσεις → Πακέτα → Ιστορικό.
-- Το γράφει μόνο ένα trigger της βάσης· ο πελάτης βλέπει τα δικά του, ο ιδιοκτήτης του καταστήματός του.
-- Ασφαλές να τρέξει ξανά.

create table if not exists pack_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  pack_name text,
  credits_total int,          -- null = χωρίς όριο επισκέψεων
  credits_left int not null default 0,
  started date not null,
  expires date,
  reason text not null check (reason in ('expired','used','renewed')),
  ended_at timestamptz not null default now()
);
create index if not exists pack_history_user on pack_history (user_id, ended_at desc);
create index if not exists pack_history_business on pack_history (business_id);

alter table pack_history enable row level security;
drop policy if exists pack_history_select on pack_history;
create policy pack_history_select on pack_history for select using (user_id = auth.uid() or is_owner(business_id));

-- Όταν αλλάζει η ημερομηνία έναρξης του πακέτου (credits_since), ξεκίνησε νέο πακέτο: το παλιό πάει στο ιστορικό.
create or replace function archive_pack() returns trigger
language plpgsql security definer set search_path=public as $$
declare days int; exp date; unlimited boolean;
begin
  if old.credits_since is null or new.credits_since is not distinct from old.credits_since then return new; end if;
  select coalesce(old.pack_days, b.package_days) into days from businesses b where b.id = old.business_id;
  exp := case when days is not null then old.credits_since + days end;
  unlimited := old.credits_total is null and old.credits >= 9000;
  insert into pack_history (business_id, user_id, pack_name, credits_total, credits_left, started, expires, reason)
  values (old.business_id, old.user_id, old.pack_name,
    case when unlimited then null else old.credits_total end,
    case when unlimited then 0 else greatest(old.credits, 0) end,
    old.credits_since, exp,
    case when exp is not null and exp <= athens_today() then 'expired'
         when not unlimited and old.credits <= 0 then 'used'
         else 'renewed' end);
  return new;
end $$;

drop trigger if exists memberships_archive_pack on memberships;
create trigger memberships_archive_pack before update of credits_since on memberships
  for each row execute function archive_pack();

-- my_bookings: ίδιο με το 005, και επιπλέον 'pack_history' (τα παλιά πακέτα, νεότερα πρώτα).
create or replace function my_bookings() returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('id',bk.id,'date',bk.date,'time',to_char(bk.time,'HH24:MI'),
        'status',bk.status,'service',s.name,'service_id',s.id,'business',b.name,'business_id',b.id,'address',b.address,
        'staff_id',bk.staff_id,'staff',st.name)
        order by bk.date,bk.time)
      from bookings bk join services s on s.id=bk.service_id join businesses b on b.id=bk.business_id left join staff st on st.id=bk.staff_id
      where bk.user_id=auth.uid() and bk.date >= athens_today() - 30), '[]'),
    'waitlist', coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'date',w.date,'time',to_char(w.time,'HH24:MI'),
        'service',s.name,'service_id',s.id,'business',b.name))
      from waitlist w join services s on s.id=w.service_id join businesses b on b.id=s.business_id
      where w.user_id=auth.uid() and w.date >= athens_today()), '[]'),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('business_id',m.business_id,'business',b.name,'status',m.status,
        'credits',m.credits,'total',m.credits_total,'pack',m.pack_name,'unlimited',(m.credits_total is null and m.credits >= 9000),
        'expires', case when b.uses_credits and m.credits_since is not null then m.credits_since + coalesce(m.pack_days, b.package_days) end,
        'pending_package', case when pk.id is not null then jsonb_build_object('id',pk.id,'name',pk.name) end))
      from memberships m join businesses b on b.id=m.business_id left join packages pk on pk.id=m.pending_package
      where m.user_id=auth.uid()), '[]'),
    'pack_history', coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'business_id',h.business_id,'business',b.name,
        'pack',h.pack_name,'total',h.credits_total,'credits',h.credits_left,'started',h.started,'expires',h.expires,'reason',h.reason)
        order by h.ended_at desc)
      from pack_history h join businesses b on b.id=h.business_id
      where h.user_id=auth.uid()), '[]')) $$;
