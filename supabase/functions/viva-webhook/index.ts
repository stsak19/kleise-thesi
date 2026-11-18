// viva-webhook: η Viva ειδοποιεί εδώ όταν πληρωθεί μια παραγγελία («Transaction Payment Created», 1796).
// Δεύτερη ασφάλεια: συνήθως το πακέτο έχει ήδη ενεργοποιηθεί από τη σελίδα …/paid (viva-pay confirm).
// Επικόλληση στο Supabase → Edge Functions → νέα function «viva-webhook», με ΚΛΕΙΣΤΟ το «Verify JWT»
// (η Viva δεν στέλνει κλειδί Supabase). Ίδια secrets με το viva-pay.
//
// GET  → επιστρέφει { key } (η Viva το ζητά μία φορά για να επιβεβαιώσει τη διεύθυνση).
// POST → ελέγχει τη συναλλαγή στη Viva (δεν εμπιστεύεται το σώμα του μηνύματος) και ενεργοποιεί το πακέτο.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const LIVE = Deno.env.get('VIVA_ENV') === 'live';
const ACCOUNTS = LIVE ? 'https://accounts.vivapayments.com' : 'https://demo-accounts.vivapayments.com';
const API = LIVE ? 'https://api.vivapayments.com' : 'https://demo-api.vivapayments.com';
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

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

Deno.serve(async (req) => {
  try {
    const token = await vivaToken();
    if (req.method === 'GET') {
      const r = await fetch(`${API}/isv/v1/webhooks/token`, { headers: { Authorization: `Bearer ${token}` } });
      const k = await r.json();
      return json({ key: k.key ?? k.Key });
    }
    if (req.method !== 'POST') return json({ ok: false }, 405);

    const ev = await req.json().catch(() => ({}));
    const d = ev.EventData ?? {};
    if (ev.EventTypeId !== 1796 || !d.OrderCode || !d.TransactionId) return json({ ok: true, ignored: true });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const orderCode = String(d.OrderCode);
    const { data: pay } = await admin.from('payments').select('status,business_id').eq('viva_order_code', orderCode).maybeSingle();
    if (!pay || pay.status === 'paid') return json({ ok: true }); // όχι δική μας ή ήδη έτοιμη
    const { data: acc } = await admin.from('business_payment_accounts').select('viva_merchant_id').eq('business_id', pay.business_id).maybeSingle();

    const r = await fetch(`${API}/checkout/v2/isv/transactions/${encodeURIComponent(d.TransactionId)}?merchantId=${acc?.viva_merchant_id ?? ''}`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return json({ ok: false }, 502); // η Viva θα ξαναστείλει σε μία ώρα
    const t = await r.json();
    if ((t.statusId ?? t.StatusId) !== 'F' || String(t.orderCode ?? t.OrderCode) !== orderCode) return json({ ok: true, ignored: true });
    const cents = Math.round(Number(t.amount ?? t.Amount) * 100);
    const { error } = await admin.rpc('payment_complete', { p_order: orderCode, p_transaction: String(d.TransactionId), p_amount_cents: cents });
    if (error) { console.error(error); return json({ ok: false }, 500); }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ ok: false }, 500);
  }
});
