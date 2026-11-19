-- 019: Δοκιμαστική πληρωμή πακέτου (2026-11-19). Τρέχει ΜΕΤΑ το 018.
-- Μέχρι να μπει η πραγματική Viva (από τα τελευταία βήματα), η πληρωμή είναι αντιγραφή της διαδικασίας:
-- ο πελάτης πατά «Το θέλω» → οθόνη πληρωμής (κάρτα / Apple Pay / Google Pay) → «Πληρώθηκε» → το πακέτο ενεργοποιείται.
-- Δεν χρεώνεται τίποτα. Η πληρωμή γράφεται κανονικά στο payments (με test=true) και η προμήθεια υπολογίζεται,
-- ώστε το /admin → Πληρωμές να δείχνει πώς θα είναι. Όταν μπει η Viva: /admin → Πληρωμές → «Viva (πραγματικές)».

alter table platform_settings add column if not exists pay_mode text not null default 'test' check (pay_mode in ('test','viva'));
alter table payments add column if not exists test boolean not null default false;
alter table payments add column if not exists method text check (method is null or method in ('card','apple','google'));

-- Ποια πληρωμή ισχύει τώρα (το διαβάζει η εφαρμογή).
create or replace function pay_mode() returns text
language sql stable security definer set search_path=public as
$$ select coalesce((select pay_mode from platform_settings), 'test') $$;
grant execute on function pay_mode() to anon, authenticated;

-- Δοκιμαστική πληρωμή: γράφει την πληρωμή ως πληρωμένη και ενεργοποιεί το πακέτο αμέσως.
create or replace function test_pay_package(p_package uuid, p_method text default 'card') returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); pk packages; b businesses; m memberships; pct numeric; fee int; r jsonb; who text;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','Συνδέσου πρώτα'); end if;
  if pay_mode() <> 'test' then return jsonb_build_object('ok',false,'error','Η δοκιμαστική πληρωμή είναι κλειστή'); end if;
  select * into pk from packages where id=p_package and active;
  if not found then return jsonb_build_object('ok',false,'error','Το πακέτο δεν υπάρχει πια'); end if;
  if pk.price_cents <= 0 then return jsonb_build_object('ok',false,'error','Το πακέτο είναι δωρεάν'); end if;
  select * into b from businesses where id=pk.business_id and is_published;
  if not found then return jsonb_build_object('ok',false,'error','Το κατάστημα δεν δέχεται αγορές'); end if;
  select * into m from memberships where business_id=b.id and user_id=uid;
  if found and m.status='blocked' then return jsonb_build_object('ok',false,'error','Δεν μπορείς να αγοράσεις πακέτο εδώ'); end if;
  select commission_pct into pct from platform_settings;
  fee := least(pk.price_cents, round(pk.price_cents * coalesce(pct,0) / 100.0)::int);
  insert into payments(business_id,user_id,package_id,package_name,amount_cents,fee_cents,status,paid_at,test,method)
    values (b.id,uid,pk.id,pk.name,pk.price_cents,fee,'paid',now(),true,
      case when p_method in ('card','apple','google') then p_method else 'card' end);
  r := activate_package_core(b.id, uid, pk.id);
  select trim(coalesce(first_name,'')||' '||coalesce(last_name,'')) into who from profiles where id=uid;
  perform notify(b.owner_id, b.name || ' · Πληρωμή στην εφαρμογή', format('%s αγόρασε το «%s» (%s€). Το πακέτο ενεργοποιήθηκε.',
    coalesce(nullif(who,''),'Ένας πελάτης'), pk.name, replace(to_char(pk.price_cents/100.0,'FM999990.00'),'.',',')));
  return jsonb_build_object('ok',coalesce((r->>'ok')::boolean,false),'error',r->>'error','business_id',b.id,'package',pk.name);
end $$;
revoke all on function test_pay_package(uuid, text) from public, anon;
grant execute on function test_pay_package(uuid, text) to authenticated;

-- Super admin: διακόπτης δοκιμαστικές / Viva και η σύνοψη με τη σήμανση «δοκιμαστική».
create or replace function admin_set_pay_mode(p_mode text) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  perform admin_guard();
  if p_mode not in ('test','viva') then return jsonb_build_object('ok',false,'error','Άγνωστη επιλογή'); end if;
  update platform_settings set pay_mode=p_mode, updated_at=now();
  return jsonb_build_object('ok',true);
end $$;
revoke all on function admin_set_pay_mode(text) from public, anon;
grant execute on function admin_set_pay_mode(text) to authenticated;

create or replace function admin_payments() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare res jsonb;
begin
  perform admin_guard();
  select jsonb_build_object(
    'commission_pct', (select commission_pct from platform_settings),
    'pay_mode', pay_mode(),
    'month_total', coalesce((select sum(amount_cents) from payments where status='paid' and paid_at >= date_trunc('month', now())),0),
    'month_fee', coalesce((select sum(fee_cents) from payments where status='paid' and paid_at >= date_trunc('month', now())),0),
    'shops_online', (select count(*) from businesses where pay_online),
    'recent', coalesce((select jsonb_agg(x order by x->>'paid_at' desc) from (
      select jsonb_build_object('id',p.id,'business',b.name,'business_id',b.id,'package',p.package_name,'amount_cents',p.amount_cents,
        'fee_cents',p.fee_cents,'paid_at',p.paid_at,'test',p.test,'method',p.method,
        'name',trim(coalesce(pr.first_name,'')||' '||coalesce(pr.last_name,''))) x
      from payments p join businesses b on b.id=p.business_id left join profiles pr on pr.id=p.user_id
      where p.status='paid' order by p.paid_at desc limit 50) t), '[]'::jsonb)) into res;
  return res;
end $$;
