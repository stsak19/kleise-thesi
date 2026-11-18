-- 018: Πληρωμή πακέτου μέσα στην εφαρμογή με Viva, με προμήθεια για την πλατφόρμα (2026-11-18).
-- Ροή: ο πελάτης πατά «Το θέλω» → ανοίγει η σελίδα πληρωμής της Viva → μόλις πληρώσει, το πακέτο
-- ενεργοποιείται αμέσως (χωρίς «Πληρώθηκε»). Η Viva στέλνει τα χρήματα στον λογαριασμό Viva του καταστήματος
-- και κρατά αυτόματα την προμήθεια της πλατφόρμας (isvAmount) για τον λογαριασμό ISV της πλατφόρμας.
-- Ο παλιός τρόπος μένει: πληρωμή στο κατάστημα και «Πληρώθηκε» / «Δώσε πακέτο» από τον ιδιοκτήτη.
-- Τις κλήσεις στη Viva τις κάνουν οι Edge Functions viva-pay και viva-webhook (supabase/functions/).
-- Τρέχει ΜΕΤΑ το 015 (χρειάζεται τα packages.service_ids / memberships.pack_services).

-- 1) Ρυθμίσεις πλατφόρμας: μία γραμμή. Το ποσοστό το αλλάζει ο super admin από το /admin → Πληρωμές.
create table if not exists platform_settings (
  id boolean primary key default true check (id),
  commission_pct numeric(5,2) not null default 5 check (commission_pct between 0 and 50),
  updated_at timestamptz not null default now()
);
insert into platform_settings(id) values (true) on conflict do nothing;
alter table platform_settings enable row level security;  -- καμία πολιτική: μόνο οι συναρτήσεις τον διαβάζουν

-- 2) Κατάστημα: αν δέχεται online πληρωμές (φαίνεται δημόσια) και ο κωδικός εμπόρου Viva (μόνο ο ιδιοκτήτης).
alter table businesses add column if not exists pay_online boolean not null default false;
create table if not exists business_payment_accounts (
  business_id uuid primary key references businesses on delete cascade,
  viva_merchant_id text check (viva_merchant_id is null or viva_merchant_id ~* '^[0-9a-f-]{32,36}$'),
  updated_at timestamptz not null default now()
);
alter table business_payment_accounts enable row level security;
drop policy if exists "pay account owner" on business_payment_accounts;
create policy "pay account owner" on business_payment_accounts for select using (is_owner(business_id));

-- 3) Οι πληρωμές. Γράφονται μόνο από τις Edge Functions (service role)· διαβάζονται από πελάτη/ιδιοκτήτη/admin.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  package_id uuid references packages on delete set null,
  package_name text not null,
  amount_cents int not null check (amount_cents > 0),
  fee_cents int not null check (fee_cents >= 0 and fee_cents <= amount_cents),
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  viva_order_code text unique,
  viva_transaction_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_business_idx on payments (business_id, created_at desc);
create index if not exists payments_user_idx on payments (user_id, created_at desc);
alter table payments enable row level security;
drop policy if exists "payments read" on payments;
create policy "payments read" on payments for select using (user_id = auth.uid() or is_owner(business_id) or is_super_admin());

-- 4) Ενεργοποίηση πακέτου: ο κοινός κορμός. Τον καλούν ο ιδιοκτήτης («Πληρώθηκε») και η πληρωμή online.
create or replace function activate_package_core(p_business uuid, p_user uuid, p_package uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pk packages; m memberships; bname text; add_n int; left_n int;
begin
  select * into m from memberships where business_id=p_business and user_id=p_user for update;
  if not found then
    insert into memberships(business_id,user_id,status) values (p_business,p_user,'approved') returning * into m;
  end if;
  select * into pk from packages where id=coalesce(p_package, m.pending_package) and business_id=p_business;
  if not found then return jsonb_build_object('ok',false,'error','Δεν βρέθηκε το πακέτο'); end if;
  select name into bname from businesses where id=p_business;
  if pk.sessions is not null or pk.kind='sub' then
    -- Οι επισκέψεις που έμειναν από πριν κρατιούνται (εκτός αν ήταν απεριόριστες).
    left_n := case when m.credits_total is null and m.credits >= 9000 then 0 else greatest(m.credits,0) end;
    add_n := coalesce(pk.sessions, 9999);
    update memberships set status='approved', credits=case when pk.sessions is null then 9999 else left_n+add_n end,
      credits_total=case when pk.sessions is null then null else left_n+add_n end,
      credits_since=current_date, credits_lost=0, pack_name=pk.name, pack_days=pk.days, pack_services=pk.service_ids,
      pending_package=null, pending_at=null
      where business_id=p_business and user_id=p_user;
    insert into credit_log(business_id,user_id,kind,delta) values (p_business,p_user,'package',case when pk.sessions is null then 9999 else add_n end);
  else
    update memberships set status='approved', pending_package=null, pending_at=null, pack_services=pk.service_ids where business_id=p_business and user_id=p_user;
  end if;
  perform notify(p_user, bname, format('Το πακέτο «%s» ενεργοποιήθηκε. Καλή αρχή!', pk.name));
  return jsonb_build_object('ok',true);
end $$;
revoke all on function activate_package_core(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function owner_activate_package(p_business uuid, p_user uuid, p_package uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return activate_package_core(p_business, p_user, p_package);
end $$;

-- 5) Ο ιδιοκτήτης: διαβάζει / αλλάζει τον κωδικό εμπόρου Viva και τον διακόπτη «Πληρωμή μέσα στην εφαρμογή».
create or replace function owner_payment_settings(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'pay_online', (select pay_online from businesses where id=p_business),
    'viva_merchant_id', (select viva_merchant_id from business_payment_accounts where business_id=p_business),
    'commission_pct', (select commission_pct from platform_settings));
end $$;

create or replace function owner_set_payments(p_business uuid, p_merchant text, p_on boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
declare mid text := nullif(trim(coalesce(p_merchant,'')), '');
begin
  if not is_owner(p_business) then raise exception 'forbidden'; end if;
  if mid is not null and mid !~* '^[0-9a-f-]{32,36}$' then
    return jsonb_build_object('ok',false,'error','Ο κωδικός εμπόρου (Merchant ID) μοιάζει με 1a2b3c4d-…: τον βρίσκεις στη Viva → Ρυθμίσεις → API Access.');
  end if;
  if p_on and mid is null then return jsonb_build_object('ok',false,'error','Γράψε πρώτα τον κωδικό εμπόρου της Viva.'); end if;
  insert into business_payment_accounts(business_id, viva_merchant_id) values (p_business, lower(mid))
    on conflict (business_id) do update set viva_merchant_id=excluded.viva_merchant_id, updated_at=now();
  update businesses set pay_online = p_on and mid is not null where id=p_business;
  return jsonb_build_object('ok',true);
end $$;

-- 6) Η Edge Function viva-pay: ετοιμάζει πληρωμή για ένα πακέτο (ποσό, προμήθεια, κωδικός εμπόρου).
create or replace function payment_prepare(p_user uuid, p_package uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pk packages; b businesses; m memberships; mid text; pct numeric; fee int; pid uuid; who text; mail text;
begin
  select * into pk from packages where id=p_package and active;
  if not found then return jsonb_build_object('ok',false,'error','Το πακέτο δεν υπάρχει πια'); end if;
  if pk.price_cents <= 0 then return jsonb_build_object('ok',false,'error','Το πακέτο είναι δωρεάν'); end if;
  select * into b from businesses where id=pk.business_id and is_published;
  if not found or not b.pay_online then return jsonb_build_object('ok',false,'error','Το κατάστημα δεν δέχεται πληρωμή στην εφαρμογή'); end if;
  select viva_merchant_id into mid from business_payment_accounts where business_id=b.id;
  if mid is null then return jsonb_build_object('ok',false,'error','Το κατάστημα δεν δέχεται πληρωμή στην εφαρμογή'); end if;
  select * into m from memberships where business_id=b.id and user_id=p_user;
  if found and m.status='blocked' then return jsonb_build_object('ok',false,'error','Δεν μπορείς να αγοράσεις πακέτο εδώ'); end if;
  select commission_pct into pct from platform_settings;
  fee := least(pk.price_cents, round(pk.price_cents * coalesce(pct,0) / 100.0)::int);
  insert into payments(business_id,user_id,package_id,package_name,amount_cents,fee_cents)
    values (b.id,p_user,pk.id,pk.name,pk.price_cents,fee) returning id into pid;
  select trim(coalesce(first_name,'')||' '||coalesce(last_name,'')) into who from profiles where id=p_user;
  select email into mail from auth.users where id=p_user;
  return jsonb_build_object('ok',true,'payment_id',pid,'amount',pk.price_cents,'fee',fee,'merchant_id',mid,
    'business',b.name,'package',pk.name,'name',nullif(who,''),'email',mail);
end $$;

create or replace function payment_set_order(p_payment uuid, p_order text) returns void
language sql security definer set search_path=public as
$$ update payments set viva_order_code=p_order where id=p_payment and status='pending' $$;

-- 7) Η πληρωμή επιβεβαιώθηκε από τη Viva (επιστροφή στη σελίδα ή webhook). Τρέχει μία φορά ανά πληρωμή.
create or replace function payment_complete(p_order text, p_transaction text, p_amount_cents int) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p payments; r jsonb; who text; owner uuid; bname text;
begin
  select * into p from payments where viva_order_code=p_order for update;
  if not found then return jsonb_build_object('ok',false,'error','Άγνωστη πληρωμή'); end if;
  if p.status='paid' then return jsonb_build_object('ok',true,'already',true,'business_id',p.business_id,'package',p.package_name); end if;
  if p_amount_cents <> p.amount_cents then
    update payments set status='failed' where id=p.id;
    return jsonb_build_object('ok',false,'error','Το ποσό δεν ταιριάζει');
  end if;
  update payments set status='paid', paid_at=now(), viva_transaction_id=p_transaction where id=p.id;
  r := activate_package_core(p.business_id, p.user_id, p.package_id);
  select owner_id, name into owner, bname from businesses where id=p.business_id;
  select trim(coalesce(first_name,'')||' '||coalesce(last_name,'')) into who from profiles where id=p.user_id;
  perform notify(owner, bname || ' · Πληρωμή online', format('%s πλήρωσε online το «%s» (%s€). Το πακέτο ενεργοποιήθηκε.',
    coalesce(nullif(who,''),'Ένας πελάτης'), p.package_name, replace(to_char(p.amount_cents/100.0,'FM999990.00'),'.',',')));
  return jsonb_build_object('ok',coalesce((r->>'ok')::boolean,false),'business_id',p.business_id,'package',p.package_name,'error',r->>'error');
end $$;

revoke all on function payment_prepare(uuid, uuid), payment_set_order(uuid, text), payment_complete(text, text, int) from public, anon, authenticated;
grant execute on function payment_prepare(uuid, uuid), payment_set_order(uuid, text), payment_complete(text, text, int) to service_role;
grant execute on function owner_payment_settings(uuid), owner_set_payments(uuid, text, boolean) to authenticated;

-- 8) Super admin: ποσοστό προμήθειας και σύνοψη πληρωμών.
create or replace function admin_payments() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb;
begin
  perform admin_guard();
  select jsonb_build_object(
    'commission_pct', (select commission_pct from platform_settings),
    'month_total', coalesce((select sum(amount_cents) from payments where status='paid' and paid_at >= date_trunc('month', now())),0),
    'month_fee', coalesce((select sum(fee_cents) from payments where status='paid' and paid_at >= date_trunc('month', now())),0),
    'shops_online', (select count(*) from businesses where pay_online),
    'recent', coalesce((select jsonb_agg(x order by x->>'paid_at' desc) from (
      select jsonb_build_object('id',p.id,'business',b.name,'business_id',b.id,'package',p.package_name,'amount_cents',p.amount_cents,
        'fee_cents',p.fee_cents,'paid_at',p.paid_at,'name',trim(coalesce(pr.first_name,'')||' '||coalesce(pr.last_name,''))) x
      from payments p join businesses b on b.id=p.business_id left join profiles pr on pr.id=p.user_id
      where p.status='paid' order by p.paid_at desc limit 50) t), '[]'::jsonb)) into res;
  return res;
end $$;

create or replace function admin_set_commission(p_pct numeric) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform admin_guard();
  if p_pct is null or p_pct < 0 or p_pct > 50 then return jsonb_build_object('ok',false,'error','Το ποσοστό πρέπει να είναι από 0 έως 50'); end if;
  update platform_settings set commission_pct=round(p_pct,2), updated_at=now();
  return jsonb_build_object('ok',true);
end $$;
revoke all on function admin_payments(), admin_set_commission(numeric) from public, anon;
grant execute on function admin_payments(), admin_set_commission(numeric) to authenticated;
