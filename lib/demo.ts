/* Demo: η εφαρμογή τρέχει με δοκιμαστικά καταστήματα, χωρίς λογαριασμό και χωρίς βάση.
   Όσο είναι ενεργό, κάθε κλήση προς το Supabase απαντιέται από εδώ (μνήμη της συσκευής).
   Ενεργοποιείται από το κουμπί «Δες το demo» στη σύνδεση· φεύγει με την Αποσύνδεση. */

const DEMO_KEY = 'spoton.demo';
const ls = (): Storage | null => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
import AsyncStorage from '@react-native-async-storage/async-storage';
let on = ls()?.getItem(DEMO_KEY) === '1';
// Στο κινητό η σημαία διαβάζεται ασύγχρονα· οι κλήσεις περιμένουν να φορτώσει.
const ready = AsyncStorage.getItem(DEMO_KEY).then((v) => { if (v === '1') on = true; }).catch(() => {});
export const isDemo = () => on;
export function setDemo(v: boolean) {
  on = v;
  try { v ? ls()?.setItem(DEMO_KEY, '1') : ls()?.removeItem(DEMO_KEY); } catch {}
  (v ? AsyncStorage.setItem(DEMO_KEY, '1') : AsyncStorage.removeItem(DEMO_KEY)).catch(() => {});
}

export const DEMO_UID = '00000000-0000-4000-8000-00000000d3e0';
const user = { id: DEMO_UID, aud: 'authenticated', role: 'authenticated', email: 'demo@spoton.gr',
  app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const b64 = (o: object) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export function demoSession() {
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  return { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: DEMO_UID, exp, role: 'authenticated' })}.demo`,
    refresh_token: 'demo', token_type: 'bearer', expires_in: 7 * 86400, expires_at: exp, user };
}

/* ---------- δοκιμαστικά δεδομένα ---------- */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const biz = (id: string, name: string, category: string, city: string, address: string, brand_color: string, description: string, extra: object = {}) => ({
  id, owner_id: id === 'b-eleni' ? DEMO_UID : 'someone-else', name, category, city, address, phone: '2310 123456', description,
  logo_url: null, cover_url: null, brand_color, max_days_ahead: 14, cancel_before_min: 120, requires_approval: false,
  uses_credits: false, package_days: 30, is_published: true, created_at: '2026-01-01', ...extra });

const db: Record<string, any[]> = {
  businesses: [
    biz('b-eleni', 'Κομμωτήριο Ελένη', 'hair', 'Θεσσαλονίκη', 'Τσιμισκή 10', '#2563eb', 'Κούρεμα, βαφή και χτενίσματα στο κέντρο της πόλης.'),
    biz('b-fit', 'FitZone Gym', 'gym', 'Αθήνα', 'Πατησίων 45', '#1fa971', 'Ομαδικά προγράμματα όλη μέρα. Έως 12 άτομα ανά τμήμα.'),
    biz('b-niki', 'Nails by Νίκη', 'nails', 'Πάτρα', 'Μαιζώνος 22', '#ec4899', 'Μανικιούρ, πεντικιούρ και ημιμόνιμα.'),
    biz('b-barber', 'Old Town Barber', 'barber', 'Θεσσαλονίκη', 'Αγ. Σοφίας 3', '#16161a', 'Κλασικό κούρεμα και ξύρισμα με ζεστή πετσέτα.'),
    biz('b-zen', 'Zen Pilates Studio', 'pilates_yoga', 'Αθήνα', 'Κηφισίας 120', '#a855f7', 'Reformer pilates σε μικρά γκρουπ.'),
  ],
  services: [
    { id: 's-cut', business_id: 'b-eleni', name: 'Κούρεμα', duration_min: 30, price_cents: 1500, capacity: 1, active: true },
    { id: 's-color', business_id: 'b-eleni', name: 'Βαφή', duration_min: 90, price_cents: 4000, capacity: 1, active: true },
    { id: 's-cross', business_id: 'b-fit', name: 'Cross Training', duration_min: 60, price_cents: null, capacity: 12, active: true },
    { id: 's-spin', business_id: 'b-fit', name: 'Spinning', duration_min: 45, price_cents: null, capacity: 10, active: true },
    { id: 's-mani', business_id: 'b-niki', name: 'Μανικιούρ ημιμόνιμο', duration_min: 60, price_cents: 2000, capacity: 1, active: true },
    { id: 's-pedi', business_id: 'b-niki', name: 'Πεντικιούρ', duration_min: 60, price_cents: 2500, capacity: 1, active: true },
    { id: 's-barb', business_id: 'b-barber', name: 'Κούρεμα + γένια', duration_min: 45, price_cents: 1800, capacity: 1, active: true },
    { id: 's-ref', business_id: 'b-zen', name: 'Reformer', duration_min: 50, price_cents: 1500, capacity: 6, active: true },
  ],
  opening_hours: [] as any[],
  bookings: [] as any[],
  waitlist: [] as any[],
  day_overrides: [] as any[],
  notifications: [{ id: 'n1', user_id: DEMO_UID, title: 'Καλώς ήρθες στο demo 👋', body: 'Όλα εδώ είναι δοκιμαστικά. Κλείσε θέση, άλλαξε ρυθμίσεις — τίποτα δεν αποθηκεύεται πραγματικά.', read: false, created_at: new Date().toISOString() }],
  profiles: [{ id: DEMO_UID, first_name: 'Demo', last_name: 'Χρήστης', phone: '6900000000' }],
  memberships: [] as any[],
};
let seq = 1;
const hours = (business_id: string, days: number[], spans: [string, string][], service_id: string | null = null) =>
  days.forEach((weekday) => spans.forEach(([opens, closes]) => db.opening_hours.push({ id: seq++, business_id, service_id, weekday, opens: opens + ':00', closes: closes + ':00' })));
hours('b-eleni', [2, 3, 4, 5, 6], [['09:00', '14:00'], ['17:00', '21:00']]);           // με μεσημεριανό διάλειμμα
hours('b-eleni', [3, 5], [['10:00', '16:00']], 's-color');                             // η βαφή μόνο Τετ/Παρ
hours('b-fit', [1, 2, 3, 4, 5], [['07:00', '22:00']]); hours('b-fit', [6], [['09:00', '14:00']]);
hours('b-niki', [1, 2, 3, 4, 5, 6], [['10:00', '20:00']]);
hours('b-barber', [1, 2, 3, 4, 5, 6], [['09:00', '21:00']]);
hours('b-zen', [1, 2, 3, 4, 5], [['08:00', '13:00'], ['17:00', '21:00']]);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const svc = (id: string) => db.services.find((s) => s.id === id);
const bz = (id: string) => db.businesses.find((b) => b.id === id);
const addBooking = (service_id: string, date: string, time: string, user_id = DEMO_UID) =>
  db.bookings.push({ id: uid(), business_id: svc(service_id).business_id, service_id, user_id, date, time: time + ':00', status: 'booked', created_at: new Date().toISOString() });
// μερικές κρατήσεις ώστε να φαίνονται γεμάτες ώρες και η λίστα «Οι κρατήσεις μου»
for (let i = 1; i <= 14; i++) { addBooking('s-cut', plus(i), '18:00', 'other'); addBooking('s-cut', plus(i), '10:30', 'other'); }
for (let i = 0; i <= 14; i++) for (let k = 0; k < 12; k++) addBooking('s-cross', plus(i), '19:00', 'other' + k);
addBooking('s-cut', plus(2), '11:00'); addBooking('s-cross', plus(3), '09:00'); addBooking('s-mani', plus(5), '12:00');

/* ---------- «βάση»: διαθεσιμότητα και RPC ---------- */
const hm = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const taken = (service_id: string, date: string, t: string) => db.bookings.filter((b) => b.service_id === service_id && b.date === date && b.time.slice(0, 5) === t && b.status !== 'cancelled').length;

function availability(service_id: string, date: string) {
  const s = svc(service_id); if (!s) return [];
  const b = bz(s.business_id);
  if (date < iso(new Date()) || date > plus(b.max_days_ahead)) return [];
  if (db.day_overrides.some((o) => o.business_id === b.id && o.date === date && o.closed)) return [];
  const dow = new Date(date + 'T00:00').getDay();
  const own = db.opening_hours.some((h) => h.service_id === s.id);
  const set = new Set<number>();
  db.opening_hours.filter((h) => h.business_id === b.id && h.weekday === dow && (own ? h.service_id === s.id : !h.service_id))
    .forEach((h) => { for (let m = hm(h.opens); m + s.duration_min <= hm(h.closes); m += s.duration_min) set.add(m); });
  const now = new Date(), today = iso(now), nowM = now.getHours() * 60 + now.getMinutes();
  return [...set].sort((a, z) => a - z).filter((m) => date > today || m > nowM).map((m) => {
    const t = fm(m), tk = taken(s.id, date, t);
    return { slot_time: t + ':00', capacity: s.capacity, taken: tk, free: Math.max(s.capacity - tk, 0) };
  });
}

const RPC: Record<string, (a: any) => any> = {
  day_availability: (a) => availability(a.p_service, a.p_date),
  create_booking: (a) => {
    const t = String(a.p_time).slice(0, 5);
    const sl = availability(a.p_service, a.p_date).find((x) => x.slot_time.slice(0, 5) === t);
    if (!sl) return { ok: false, error: 'Η ώρα δεν είναι διαθέσιμη' };
    if (sl.free <= 0) return { ok: false, full: true, error: 'Η ώρα γέμισε' };
    if (db.bookings.some((b) => b.service_id === a.p_service && b.date === a.p_date && b.time.slice(0, 5) === t && b.user_id === DEMO_UID && b.status === 'booked'))
      return { ok: false, error: 'Έχεις ήδη κράτηση σε αυτή την ώρα' };
    addBooking(a.p_service, a.p_date, t);
    db.waitlist = db.waitlist.filter((w) => !(w.service_id === a.p_service && w.date === a.p_date && w.time.slice(0, 5) === t));
    return { ok: true };
  },
  cancel_booking: (a) => { const b = db.bookings.find((x) => x.id === a.p_booking); if (b) { b.status = 'cancelled'; b.cancelled_at = new Date().toISOString(); } return { ok: true }; },
  join_waitlist: (a) => { db.waitlist.push({ id: uid(), service_id: a.p_service, user_id: DEMO_UID, date: a.p_date, time: String(a.p_time).slice(0, 5) + ':00' }); return { ok: true }; },
  leave_waitlist: (a) => { db.waitlist = db.waitlist.filter((w) => !(w.service_id === a.p_service && w.date === a.p_date && w.time.slice(0, 5) === String(a.p_time).slice(0, 5))); return { ok: true }; },
  my_bookings: () => ({
    bookings: db.bookings.filter((b) => b.user_id === DEMO_UID).sort((a, z) => (a.date + a.time).localeCompare(z.date + z.time)).map((b) => {
      const s = svc(b.service_id), z = bz(b.business_id);
      return { id: b.id, date: b.date, time: b.time.slice(0, 5), status: b.status, service: s.name, service_id: s.id, business: z.name, business_id: z.id, address: z.address };
    }),
    waitlist: db.waitlist.filter((w) => w.user_id === DEMO_UID).map((w) => {
      const s = svc(w.service_id); return { id: w.id, date: w.date, time: w.time.slice(0, 5), service: s.name, service_id: s.id, business: bz(s.business_id).name };
    }),
    memberships: [],
  }),
  owner_day: (a) => db.bookings.filter((b) => b.business_id === a.p_business && b.date === a.p_date && b.status !== 'cancelled')
    .sort((x, y) => x.time.localeCompare(y.time)).map((b) => ({
      id: b.id, time: b.time.slice(0, 5), status: b.status, service: svc(b.service_id).name, user_id: b.user_id,
      client: b.user_id === DEMO_UID ? 'Demo Χρήστης' : ['Μαρία Π.', 'Γιώργος Κ.', 'Ελένη Δ.', 'Νίκος Α.'][b.id.charCodeAt(0) % 4], phone: '69########' })),
  owner_pending: () => [],
  owner_set_status: (a) => { const b = db.bookings.find((x) => x.id === a.p_booking); if (b) b.status = a.p_status; return { ok: true }; },
  owner_set_member: () => ({ ok: true }),
  owner_renew: () => ({ ok: true }),
};

/* ---------- μικρός «PostgREST» για select/insert/update/delete ---------- */
function filters(u: URL) {
  const out: ((r: any) => boolean)[] = [];
  u.searchParams.forEach((v, k) => {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) return;
    const i = v.indexOf('.'); const op = v.slice(0, i); const val = decodeURIComponent(v.slice(i + 1));
    if (op === 'eq') out.push((r) => String(r[k]) === val);
    else if (op === 'neq') out.push((r) => String(r[k]) !== val);
    else if (op === 'ilike') { const re = new RegExp('^' + val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*') + '$', 'i'); out.push((r) => re.test(String(r[k] ?? ''))); }
    else if (op === 'is') out.push((r) => (val === 'null' ? r[k] == null : String(r[k]) === val));
  });
  return (r: any) => out.every((f) => f(r));
}
function order(rows: any[], u: URL) {
  const o = u.searchParams.get('order'); if (!o) return rows;
  const [col, dir] = o.split('.');
  return [...rows].sort((a, z) => (String(a[col] ?? '').localeCompare(String(z[col] ?? ''), 'el')) * (dir === 'desc' ? -1 : 1));
}
const json = (body: any, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

function rest(method: string, u: URL, table: string, body: any, h: Headers) {
  if (!(table in db)) db[table] = [];
  const rows = db[table];
  const wantObj = (h.get('accept') || '').includes('vnd.pgrst.object');
  const back = (out: any[]) => {
    if (wantObj) return out.length === 1 ? json(out[0]) : json({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: null, hint: null }, 406);
    return (h.get('prefer') || '').includes('return=representation') || method === 'GET' ? json(out) : json(undefined, 201);
  };
  if (method === 'GET' || method === 'HEAD') {
    let out = order(rows.filter(filters(u)), u);
    const lim = u.searchParams.get('limit'); if (lim) out = out.slice(0, +lim);
    return back(out);
  }
  if (method === 'POST') {
    const list = (Array.isArray(body) ? body : [body]).map((r) => ({ ...r }));
    const upsert = (h.get('prefer') || '').includes('resolution=merge-duplicates');
    const out = list.map((r) => {
      if (table === 'storage') return r;
      const key = table === 'profiles' || table === 'businesses' || table === 'services' ? 'id' : null;
      const ex = upsert && key && r[key] ? rows.find((x) => x[key] === r[key]) : null;
      if (ex) { Object.assign(ex, r); return ex; }
      if (table === 'day_overrides') { const o = rows.find((x) => x.business_id === r.business_id && x.date === r.date); if (o) { Object.assign(o, r); return o; } }
      const n = { id: table === 'opening_hours' ? seq++ : uid(), created_at: new Date().toISOString(), active: table === 'services' ? true : undefined, ...r };
      if (table === 'opening_hours') { n.opens = String(n.opens).slice(0, 5) + ':00'; n.closes = String(n.closes).slice(0, 5) + ':00'; }
      rows.push(n); return n;
    });
    return back(out);
  }
  if (method === 'PATCH') { const out = rows.filter(filters(u)); out.forEach((r) => Object.assign(r, body)); return back(out); }
  if (method === 'DELETE') { const keep = filters(u); const out = rows.filter(keep); db[table] = rows.filter((r) => !keep(r)); return back(out); }
  return json({ message: 'demo: unsupported' }, 400);
}

/* Η fetch που δίνεται στο Supabase: σε demo απαντάει τοπικά, αλλιώς πάει κανονικά στο δίκτυο. */
export async function demoFetch(input: any, init: any = {}): Promise<Response> {
  await ready;
  if (!on) return fetch(input, init);
  const url = new URL(typeof input === 'string' ? input : input.url);
  const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
  const h = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
  let body: any = init.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const p = url.pathname;
  if (p.startsWith('/auth/v1/')) {
    if (p.endsWith('/logout')) return json(undefined, 204);
    if (p.endsWith('/user')) return json(user);
    return json(demoSession());
  }
  if (p.startsWith('/storage/v1/')) return json({ statusCode: '400', error: 'demo', message: 'Στο demo δεν ανεβαίνουν φωτογραφίες' }, 400);
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = RPC[p.split('/').pop()!];
    return fn ? json(fn(body || {})) : json({ message: 'demo: άγνωστη λειτουργία' }, 404);
  }
  if (p.startsWith('/rest/v1/')) return rest(method, url, p.slice('/rest/v1/'.length), body, h);
  return fetch(input, init);
}
