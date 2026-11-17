-- 012: Αγαπημένα καταστήματα του πελάτη (καρδιά στην κορυφή του καταστήματος → εμφανίζονται στην αρχική).
-- Ο καθένας βλέπει, προσθέτει και σβήνει μόνο τα δικά του. Σβήνονται μαζί με τον λογαριασμό ή το κατάστημα.
-- Ασφαλές να τρέξει ξανά.

create table if not exists favorites (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  business_id uuid not null references businesses on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);
create index if not exists favorites_business on favorites (business_id);

alter table favorites enable row level security;

drop policy if exists favorites_select on favorites;
create policy favorites_select on favorites for select using (user_id = auth.uid());
drop policy if exists favorites_insert on favorites;
create policy favorites_insert on favorites for insert with check (user_id = auth.uid());
drop policy if exists favorites_delete on favorites;
create policy favorites_delete on favorites for delete using (user_id = auth.uid());
