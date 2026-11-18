// viva-pay: πληρωμή πακέτου με Viva (λογαριασμός ISV της πλατφόρμας). Ένα αρχείο, για επικόλληση στο
// Supabase → Edge Functions → Deploy a new function → Via Editor, με όνομα «viva-pay».
//
// POST { package_id }                       → φτιάχνει παραγγελία στη Viva και επιστρέφει { ok, url } για τη σελίδα πληρωμής.
// POST { action: 'confirm', order_code, transaction_id } → ελέγχει στη Viva ότι πληρώθηκε και ενεργοποιεί το πακέτο.
//
// Secrets (Supabase → Edge Functions → Secrets), τα βάζει ο ιδιοκτήτης της πλατφόρμας:
//   VIVA_ENV            demo ή live
//   VIVA_CLIENT_ID      ISV Client ID (Viva → Settings → API Access → ISV credentials)
//   VIVA_CLIENT_SECRET  ISV Client Secret
//   VIVA_SOURCE_CODE    (προαιρετικό) ο κωδικός πηγής πληρωμών ISV με Success/Failure URL τη σελίδα …/paid
// Τα SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY υπάρχουν ήδη σε κάθε Edge Function.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const LIVE = Deno.env.get('VIVA_ENV') === 'live';
const ACCOUNTS = LIVE ? 'https://accounts.vivapayments.com' : 'https://demo-accounts.vivapayments.com';
const API = LIVE ? 'https://api.vivapayments.com' : 'https://demo-api.vivapayments.com';
const CHECKOUT = LIVE ? 'https://www.vivapayments.com/web/checkout' : 'https://demo.vivapayments.com/web/checkout';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function vivaToken(): Promise<string> {
  const id = Deno.env.get('VIVA_CLIENT_ID'), secret = Deno.env.get('VIVA_CLIENT_SECRET');
  if (!id || !secret) throw new Error('Λείπουν τα VIVA_CLIENT_ID / VIVA_CLIENT_SECRET');
  const r = await fetch(`${ACCOUNTS}/connect/token`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${id}:${secret}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`Viva token ${r.status}`);
  return (await r.json()).access_token;
}

/* Ελέγχει τη συναλλαγή στη Viva και, αν πληρώθηκε, ενεργοποιεί το πακέτο. Κοινό με το viva-webhook. */
async function confirm(admin: any, orderCode: string, transactionId: string) {
  const { data: pay } = await admin.from('payments').select('id,status,business_id').eq('viva_order_code', orderCode).maybeSingle();
  if (!pay) return { ok: false, error: 'Άγνωστη πληρωμή' };
  if (pay.status === 'paid') return { ok: true, already: true, business_id: pay.business_id };
  const { data: acc } = await admin.from('business_payment_accounts').select('viva_merchant_id').eq('business_id', pay.business_id).maybeSingle();
  const token = await vivaToken();
  const r = await fetch(`${API}/checkout/v2/isv/transactions/${encodeURIComponent(transactionId)}?merchantId=${acc?.viva_merchant_id ?? ''}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { ok: false, error: `Η Viva δεν βρήκε τη συναλλαγή (${r.status})` };
  const t = await r.json();
  const status = t.statusId ?? t.StatusId;
  const code = String(t.orderCode ?? t.OrderCode ?? '');
  if (code !== orderCode) return { ok: false, error: 'Η συναλλαγή δεν ανήκει σε αυτή την πληρωμή' };
  if (status !== 'F') return { ok: false, pending: status === 'A', error: 'Η πληρωμή δεν ολοκληρώθηκε' };
  const cents = Math.round(Number(t.amount ?? t.Amount) * 100);
  const { data, error } = await admin.rpc('payment_complete', { p_order: orderCode, p_transaction: transactionId, p_amount_cents: cents });
  if (error) return { ok: false, error: error.message };
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ ok: false, error: 'POST μόνο' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === 'confirm') {
      if (!body.order_code || !body.transaction_id) return reply({ ok: false, error: 'Λείπουν στοιχεία πληρωμής' }, 400);
      return reply(await confirm(admin, String(body.order_code), String(body.transaction_id)));
    }

    // Νέα πληρωμή: μόνο συνδεδεμένος πελάτης.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, error: 'Συνδέσου πρώτα' }, 401);
    if (!body.package_id) return reply({ ok: false, error: 'Λείπει το πακέτο' }, 400);

    const { data: p, error } = await admin.rpc('payment_prepare', { p_user: u.user.id, p_package: body.package_id });
    if (error) return reply({ ok: false, error: error.message });
    if (!p?.ok) return reply(p);

    const token = await vivaToken();
    const order: Record<string, unknown> = {
      amount: p.amount,
      isvAmount: p.fee,
      customerTrns: `${p.package} · ${p.business}`.slice(0, 2048),
      merchantTrns: p.payment_id,
      customer: { email: p.email ?? undefined, fullName: p.name ?? undefined, requestLang: 'el-GR', countryCode: 'GR' },
      paymentTimeout: 1800,
    };
    const src = Deno.env.get('VIVA_SOURCE_CODE');
    if (src) order.resellerSourceCode = src;
    const r = await fetch(`${API}/checkout/v2/isv/orders?merchantId=${p.merchant_id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!r.ok) {
      console.error('viva order', r.status, await r.text());
      return reply({ ok: false, error: 'Η Viva δεν δέχτηκε την πληρωμή. Δοκίμασε ξανά ή πλήρωσε στο κατάστημα.' });
    }
    const o = await r.json();
    const code = String(o.orderCode ?? o.OrderCode);
    await admin.rpc('payment_set_order', { p_payment: p.payment_id, p_order: code });
    return reply({ ok: true, url: `${CHECKOUT}?ref=${code}&color=000000`, order_code: code });
  } catch (e) {
    console.error(e);
    return reply({ ok: false, error: 'Κάτι πήγε στραβά με την πληρωμή' }, 500);
  }
});
