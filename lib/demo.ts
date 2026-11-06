/* Demo: η εφαρμογή τρέχει με δοκιμαστικά καταστήματα, χωρίς λογαριασμό και χωρίς βάση.
   Όσο είναι ενεργό, κάθε κλήση προς το Supabase απαντιέται από εδώ (μνήμη της συσκευής).
   Ενεργοποιείται από το κουμπί «Συνέχεια χωρίς λογαριασμό» στη σύνδεση· φεύγει με την Αποσύνδεση. */

/* ΔΙΑΚΟΠΤΗΣ: όσο είναι true, ΟΛΗ η εφαρμογή (πελάτης, επισκέπτης στην ιστοσελίδα, επιχείρηση,
   κινητό και υπολογιστής) δείχνει τα δοκιμαστικά καταστήματα και επιχειρήσεις, όποιος κι αν συνδεθεί.
   Η «Συνέχεια χωρίς λογαριασμό» μπαίνει ως «Χριστίνα Αντωνίου» με γεμάτο ιστορικό· ένας νέος λογαριασμός
   (οποιοδήποτε email) ξεκινά καθαρός, χωρίς κρατήσεις/πακέτα/μηνύματα, και κρατά μόνο ό,τι κάνει ο ίδιος (κάθε email
   είναι δικός του λογαριασμός). Όταν το project είναι έτοιμο, γίνεται false και όλα πάνε στη βάση. */
export const DEMO_EVERYWHERE = true;

const DEMO_KEY = 'spoton.demo';
const ls = (): Storage | null => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NAMES, OWN } from './demoOwner';
let on = DEMO_EVERYWHERE || ls()?.getItem(DEMO_KEY) === '1';
// Στο κινητό η σημαία διαβάζεται ασύγχρονα· οι κλήσεις περιμένουν να φορτώσει.
const flagReady = AsyncStorage.getItem(DEMO_KEY).then((v) => { if (v === '1') on = true; }).catch(() => {});
export const isDemo = () => on;
export function setDemo(v: boolean) {
  on = v || DEMO_EVERYWHERE;
  try { v ? ls()?.setItem(DEMO_KEY, '1') : ls()?.removeItem(DEMO_KEY); } catch {}
  (v ? AsyncStorage.setItem(DEMO_KEY, '1') : AsyncStorage.removeItem(DEMO_KEY)).catch(() => {});
}

export const DEMO_UID = '00000000-0000-4000-8000-00000000d3e0';
const DEMO_EMAIL = 'christina.antoniou@gmail.com';
const userOf = (id: string, email: string) => ({ id, aud: 'authenticated', role: 'authenticated', email,
  app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
const b64 = (o: object) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const unb64 = (t: string) => { try { return JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; } };
/* Η «σύνδεση» ενός λογαριασμού: χωρίς ορίσματα είναι η Χριστίνα της «Συνέχειας χωρίς λογαριασμό». */
export function demoSession(id = DEMO_UID, email = DEMO_EMAIL) {
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  return { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, email, exp, role: 'authenticated' })}.demo`,
    refresh_token: 'demo.' + b64({ id, email }), token_type: 'bearer', expires_in: 7 * 86400, expires_at: exp, user: userOf(id, email) };
}
/* Είναι συνεδρία που έφτιαξε αυτό το αρχείο (και όχι παλιός πραγματικός λογαριασμός); */
export const isDemoSession = (refresh: string | undefined) => !!refresh && refresh.startsWith('demo');

/* ---------- δοκιμαστικά δεδομένα ---------- */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const OWNED = new Set(OWN.map((o) => o.id));
const biz = (id: string, name: string, category: string, city: string, address: string, brand_color: string, description: string, extra: object = {}) => ({
  id, owner_id: OWNED.has(id) ? DEMO_UID : 'someone-else', name, category, city, address, phone: '2310 123456', description,
  logo_url: null, cover_url: null, brand_color, max_days_ahead: 14, cancel_before_min: 120, requires_approval: false,
  uses_credits: false, package_days: 30, is_published: true, created_at: '2026-01-01', ...extra });

const db: Record<string, any[]> = {
  businesses: [
    biz('b-eleni', 'Κομμωτήριο Ελένη', 'hair', 'Θεσσαλονίκη', 'Τσιμισκή 10', '#3a5a7a', 'Κούρεμα, βαφή και χτενίσματα στο κέντρο της πόλης. Τρεις κομμωτές, ραντεβού χωρίς αναμονή.', { logo_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000&h=560&fit=crop&q=70&auto=format', max_days_ahead: 30, cancel_before_min: 180 }),
    biz('b-fit', 'FitZone Gym', 'gym', 'Αθήνα', 'Πατησίων 45', '#2f5d50', 'Ομαδικά προγράμματα όλη μέρα. Έως 16 άτομα ανά τμήμα.', { logo_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1000&h=560&fit=crop&q=70&auto=format', max_days_ahead: 7 }),
    biz('b-niki', 'Nails by Νίκη', 'nails', 'Πάτρα', 'Μαιζώνος 22', '#8a5a64', 'Μανικιούρ, πεντικιούρ, ημιμόνιμα και nail art.', { logo_url: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1000&h=560&fit=crop&q=70&auto=format', max_days_ahead: 30, cancel_before_min: 240 }),
    biz('b-barber', 'Old Town Barber', 'barber', 'Θεσσαλονίκη', 'Αγ. Σοφίας 3', '#2b2b2e', 'Κλασικό κούρεμα και ξύρισμα με ζεστή πετσέτα.', { logo_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1000&h=560&fit=crop&q=70&auto=format', cancel_before_min: 60 }),
    biz('b-zen', 'Zen Pilates Studio', 'pilates_yoga', 'Αθήνα', 'Κηφισίας 120', '#6b5b73', 'Reformer pilates σε μικρά γκρουπ έως 6 ατόμων.', { logo_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1000&h=560&fit=crop&q=70&auto=format', uses_credits: true, cancel_before_min: 360 }),
    biz('b-pt', 'Κώστας Personal Training', 'personal_training', 'Θήβα', 'Επαμεινώνδα 8', '#7a5236', 'Ατομικές προπονήσεις με πρόγραμμα στα μέτρα σου.', { logo_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1000&h=560&fit=crop&q=70&auto=format', requires_approval: true, uses_credits: true, cancel_before_min: 720 }),
    biz('b-glow', 'Glow Αισθητική', 'beauty', 'Λάρισα', 'Κύπρου 14', '#8a6a5a', 'Καθαρισμός προσώπου, αποτρίχωση, περιποίηση.', { logo_url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1000&h=560&fit=crop&q=70&auto=format' }),
    biz('b-spa', 'Aqua Spa', 'massage_spa', 'Χαλκίδα', 'Αβάντων 5', '#3f6b6a', 'Χαλαρωτικό και θεραπευτικό μασάζ.', { logo_url: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1000&h=560&fit=crop&q=70&auto=format' }),
    biz('b-physio', 'PhysioCare', 'physio', 'Αθήνα', 'Λ. Αλεξάνδρας 70', '#3d5f78', 'Φυσικοθεραπεία και αποκατάσταση τραυματισμών.', { logo_url: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1000&h=560&fit=crop&q=70&auto=format', uses_credits: true, max_days_ahead: 21, cancel_before_min: 720 }),
    biz('b-dr', 'Ιατρείο Δρ. Παπαδόπουλου', 'medical', 'Θεσσαλονίκη', 'Εγνατίας 100', '#3e4a6b', 'Παθολόγος. Ραντεβού για εξέταση και συνταγές.', { logo_url: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1000&h=560&fit=crop&q=70&auto=format' }),
    biz('b-dent', 'Smile Οδοντιατρείο', 'dental', 'Ηράκλειο', '25ης Αυγούστου 30', '#3f6a52', 'Έλεγχος, καθαρισμός, σφραγίσματα.', { logo_url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1000&h=560&fit=crop&q=70&auto=format' }),
    biz('b-ink', 'Black Ink Tattoo', 'tattoo', 'Αθήνα', 'Ασκληπιού 17', '#33383f', 'Custom σχέδια, blackwork και fine line tattoo.', { logo_url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=240&h=240&fit=crop&q=70&auto=format', cover_url: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1000&h=560&fit=crop&q=70&auto=format', requires_approval: true, max_days_ahead: 60, cancel_before_min: 2880 }),
  ],
  services: [
    { id: 's-face', business_id: 'b-glow', name: 'Καθαρισμός προσώπου', duration_min: 60, price_cents: 3500, capacity: 1, active: true },
    { id: 's-wax', business_id: 'b-glow', name: 'Αποτρίχωση', duration_min: 30, price_cents: 1500, capacity: 1, active: true },
    { id: 's-mass', business_id: 'b-spa', name: 'Μασάζ σώματος', duration_min: 60, price_cents: 4500, capacity: 1, active: true },
    { id: 's-exam', business_id: 'b-dr', name: 'Εξέταση', duration_min: 20, price_cents: 4000, capacity: 1, active: true },
    { id: 's-clean', business_id: 'b-dent', name: 'Καθαρισμός δοντιών', duration_min: 40, price_cents: 5000, capacity: 1, active: true },
  ],
  opening_hours: [] as any[],
  bookings: [] as any[],
  waitlist: [] as any[],
  day_overrides: [] as any[],
  staff: [] as any[],
  packages: [] as any[],
  client_cards: [] as any[],
  notifications: [{ id: 'n1', user_id: DEMO_UID, title: 'Καλώς ήρθες στο SpotOn 👋', body: 'Βρες το κατάστημα που θέλεις, κλείσε θέση σε λίγα δευτερόλεπτα και θα σου θυμίσουμε το ραντεβού σου.', read: false, created_at: new Date().toISOString() }],
  profiles: [{ id: DEMO_UID, first_name: 'Χριστίνα', last_name: 'Αντωνίου', phone: '6945812304' }],
  memberships: [] as any[],
};
let seq = 1;
const hours = (business_id: string, days: number[], spans: [string, string][], service_id: string | null = null) =>
  days.forEach((weekday) => spans.forEach(([opens, closes]) => db.opening_hours.push({ id: seq++, business_id, service_id, weekday, opens: opens + ':00', closes: closes + ':00' })));
hours('b-glow', [2, 3, 4, 5, 6], [['10:00', '19:00']]);
hours('b-spa', [0, 1, 2, 3, 4, 5, 6], [['11:00', '21:00']]);
hours('b-dr', [1, 2, 3, 4, 5], [['09:00', '13:00'], ['18:00', '20:00']]);
hours('b-dent', [1, 2, 3, 4, 5], [['09:00', '15:00']]);

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const svc = (id: string) => db.services.find((s) => s.id === id);
const bz = (id: string) => db.businesses.find((b) => b.id === id);
const staffOf = (id?: string | null) => (id ? db.staff.find((x) => x.id === id) : null);
const addBooking = (service_id: string, date: string, time: string, user_id: string = DEMO_UID, status = 'booked', staff_id: string | null = null) =>
  db.bookings.push({ id: uid(), business_id: svc(service_id).business_id, service_id, user_id, date, time: time + ':00', status, staff_id, created_at: new Date().toISOString() });

/* Οι πελάτες: ένα κοινό «βιβλίο» ονομάτων· κάθε επιχείρηση έχει το δικό της κομμάτι. */
const CLIENTS: Record<string, { name: string; phone: string }> = {};
NAMES.forEach((name, i) => { CLIENTS['u' + i] = { name, phone: '69' + String(40000000 + ((i * 7919 + 1234567) % 9999999)).padStart(8, '0') }; });

/* Σταθερό «τυχαίο», ώστε τα δεδομένα να είναι ίδια σε κάθε άνοιγμα. */
let rs = 7;
const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
const hmm = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const tf = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const nowM = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();
const statusFor = (d: number, t: number) => {
  if (d < 0 || (d === 0 && t + 30 < nowM)) { const r = rnd(); return r < 0.06 ? 'no_show' : r < 0.1 ? 'cancelled' : 'attended'; }
  return rnd() < 0.05 ? 'cancelled' : 'booked';
};

OWN.forEach((o, bi) => {
  o.staff.forEach((st) => db.staff.push({ id: st.id, business_id: o.id, name: st.name, role: st.role, color: st.color, days: st.days, bio: st.bio, photo_url: st.photo ?? null,
    services: o.services.filter((s) => !s.staff || s.staff.includes(st.id)).map((s) => s.id) }));
  o.services.forEach((s) => db.services.push({ id: s.id, business_id: o.id, name: s.name, duration_min: s.dur, price_cents: s.price == null ? null : s.price * 100, capacity: s.cap ?? 1, active: true }));
  o.hours.forEach(([days, spans]) => hours(o.id, days, spans));
  (o.classes ?? []).forEach((c) => { const s = o.services.find((x) => x.id === c.service)!; hours(o.id, c.days, [[c.time, tf(hmm(c.time) + s.dur)]], c.service); });
  o.packs.forEach((p) => db.packages.push({ id: p.id, business_id: o.id, name: p.name, kind: p.kind, sessions: p.sessions, days: p.days, price_cents: p.price * 100, note: p.note, popular: !!p.popular, active: true }));

  const pool = Array.from({ length: o.clients }, (_, i) => 'u' + ((bi * 7 + i) % NAMES.length));
  const pickClient = () => pool[Math.floor(Math.pow(rnd(), 1.6) * pool.length)]; // οι πρώτοι έρχονται πιο συχνά
  const busy = o.busy ?? 0.7;

  if (o.classes) {
    /* Τμήματα: κάθε μάθημα της μέρας γεμίζει ανάλογα με το πόσο κοντά είναι. */
    for (let d = -21; d <= 7; d++) {
      const dow = new Date(plus(d) + 'T00:00').getDay();
      o.classes.filter((c) => c.days.includes(dow)).forEach((c) => {
        const cap = o.services.find((x) => x.id === c.service)!.cap ?? 1;
        const fill = d <= 1 ? 0.55 + rnd() * 0.45 : Math.max(0.15, busy - d * 0.08 + rnd() * 0.2);
        const n = Math.min(cap, Math.round(cap * fill * (busy + 0.25)));
        const who = [...pool].sort(() => rnd() - 0.5).slice(0, n);
        who.forEach((u) => addBooking(c.service, plus(d), c.time, u, statusFor(d, hmm(c.time)), c.staff));
      });
    }
  } else {
    /* Ραντεβού: κάθε άτομο της ομάδας έχει το δικό του πρόγραμμα μέσα στο ωράριο. */
    for (let d = -21; d <= 13; d++) {
      const dow = new Date(plus(d) + 'T00:00').getDay();
      const spans = o.hours.filter(([days]) => days.includes(dow)).flatMap(([, sp]) => sp);
      o.staff.filter((st) => st.days.includes(dow)).forEach((st) => {
        const can = o.services.filter((s) => (!s.staff || s.staff.includes(st.id)) && s.price !== 0);
        const p = d <= 2 ? busy : Math.max(0.2, busy - (d - 2) * 0.05);
        spans.forEach(([a, z]) => {
          let t = hmm(a); const end = hmm(z);
          while (t < end) {
            const s = can[Math.floor(Math.pow(rnd(), 1.3) * can.length)];
            if (t + s.dur > end) break;
            if (rnd() < p) { addBooking(s.id, plus(d), tf(t), pickClient(), statusFor(d, t), st.id); t += s.dur; }
            else t += 30;
          }
        });
      });
    }
  }

  /* Η καρτέλα κάθε πελάτη: στοιχεία της δουλειάς, ετικέτα, σημείωση και πακέτο. */
  pool.forEach((u, i) => {
    const pk = o.packFor?.(i) ?? null;
    db.client_cards.push({ business_id: o.id, user_id: u, tag: o.tags?.[i] ?? null, note: o.notes?.[i] ?? null, fields: o.fields(i, o.staff),
      pack: pk ? { name: pk.pack, left: pk.left, total: pk.total, expires: plus(pk.days) } : null });
  });
});
// Το «Cross Training» των 19:00 γεμάτο τις επόμενες μέρες (για τη λίστα ενδιαφέροντος).
for (let d = 0; d <= 3; d++) {
  const have = db.bookings.filter((b) => b.service_id === 's-cross' && b.date === plus(d) && b.time === '19:00:00' && b.status !== 'cancelled').length;
  for (let k = have; k < 12 && db.opening_hours.some((h) => h.service_id === 's-cross' && h.weekday === new Date(plus(d) + 'T00:00').getDay() && h.opens === '19:00:00'); k++)
    addBooking('s-cross', plus(d), '19:00', 'u' + (40 + k), 'booked', 'st-alex');
}

// Ιστορικό του demo χρήστη (ως πελάτης)
addBooking('s-cut', plus(2), '11:00', DEMO_UID, 'booked', 'st-maria'); addBooking('s-cross', plus(3), '09:00', DEMO_UID, 'booked', 'st-alex');
addBooking('s-mani', plus(5), '12:00', DEMO_UID, 'booked', 'st-niki');
addBooking('s-barb', plus(-20), '18:00', DEMO_UID, 'attended', 'st-stathis'); addBooking('s-ref', plus(-12), '09:00', DEMO_UID, 'attended', 'st-anna');
addBooking('s-mass', plus(-7), '19:00', DEMO_UID, 'cancelled'); addBooking('s-exam', plus(-4), '10:00', DEMO_UID, 'no_show');
addBooking('s-barb', plus(-27), '17:30', DEMO_UID, 'attended', 'st-stathis'); addBooking('s-barb', plus(-6), '18:30', DEMO_UID, 'attended', 'st-giannis');
addBooking('s-ref', plus(-26), '09:00', DEMO_UID, 'attended', 'st-anna'); addBooking('s-ref', plus(-19), '09:00', DEMO_UID, 'cancelled', 'st-anna');
addBooking('s-ref', plus(-5), '18:00', DEMO_UID, 'attended', 'st-anna'); addBooking('s-mani', plus(-15), '12:00', DEMO_UID, 'attended', 'st-niki');
addBooking('s-ref', plus(1), '18:00', DEMO_UID, 'booked', 'st-anna'); addBooking('s-mani', plus(0), '18:00', DEMO_UID, 'booked', 'st-niki'); addBooking('s-phy', plus(4), '18:30', DEMO_UID, 'booked', 'st-petros');
// Λίστα ενδιαφέροντος: η γεμάτη ώρα του Cross Training
db.waitlist.push({ id: 'w1', service_id: 's-cross', user_id: DEMO_UID, date: plus(2), time: '19:00:00' });
// Ειδοποιήσεις
const ago = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
db.notifications.push(
  { id: 'n2', user_id: DEMO_UID, title: 'Υπενθύμιση ⏰', body: 'Αύριο έχεις Reformer στο Zen Pilates Studio στις 18:00.', read: false, created_at: ago(2) },
  { id: 'n3', user_id: DEMO_UID, title: 'Ελευθερώθηκε θέση 🎉', body: 'Σου κλείστηκε αυτόματα Spinning στο FitZone Gym.', read: true, created_at: ago(30) },
  { id: 'n4', user_id: DEMO_UID, title: 'Η κράτηση ακυρώθηκε', body: 'Ακύρωσες το μασάζ στο Aqua Spa.', read: true, created_at: ago(170) });
db.memberships.push({ business_id: 'b-zen', user_id: DEMO_UID, status: 'approved', credits: 6, expires: plus(18) });

/* Ώστε κάθε κατάστημα να έχει κάτι στις «Κρατήσεις», στα «Πακέτα» και στα «Μηνύματα» του πελάτη. */
addBooking('s-face', plus(-9), '12:00', DEMO_UID, 'attended'); addBooking('s-wax', plus(6), '11:00', DEMO_UID, 'booked');
addBooking('s-clean', plus(8), '10:20', DEMO_UID, 'booked'); addBooking('s-clean', plus(-180), '09:40', DEMO_UID, 'attended');
addBooking('s-mass', plus(-31), '19:00', DEMO_UID, 'attended'); addBooking('s-exam', plus(-45), '18:20', DEMO_UID, 'attended');
addBooking('s-color', plus(-18), '10:00', DEMO_UID, 'attended', 'st-eleni'); addBooking('s-blow', plus(-46), '17:00', DEMO_UID, 'attended', 'st-maria');
addBooking('s-spin', plus(-2), '19:00', DEMO_UID, 'attended', 'st-dora'); addBooking('s-cross', plus(-9), '09:00', DEMO_UID, 'attended', 'st-alex');
addBooking('s-eval', plus(-24), '18:00', DEMO_UID, 'attended', 'st-kostas'); addBooking('s-pt', plus(-10), '19:00', DEMO_UID, 'attended', 'st-kostas');
addBooking('s-pt', plus(-3), '19:00', DEMO_UID, 'attended', 'st-kostas'); addBooking('s-pt', plus(2), '19:00', DEMO_UID, 'booked', 'st-kostas');
addBooking('s-phyeval', plus(-17), '17:00', DEMO_UID, 'attended', 'st-petros'); addBooking('s-phy', plus(-8), '18:30', DEMO_UID, 'attended', 'st-petros');
addBooking('s-consult', plus(-14), '13:00', DEMO_UID, 'attended', 'st-sofia'); addBooking('s-tat', plus(9), '12:00', DEMO_UID, 'booked', 'st-sofia');
db.memberships.push(
  { business_id: 'b-fit', user_id: DEMO_UID, status: 'approved', credits: 9, expires: plus(11) },
  { business_id: 'b-pt', user_id: DEMO_UID, status: 'approved', credits: 4, expires: plus(23) },
  { business_id: 'b-physio', user_id: DEMO_UID, status: 'approved', credits: 3, expires: plus(40) },
  { business_id: 'b-ink', user_id: DEMO_UID, status: 'pending', credits: 0, expires: null });
/* Μηνύματα από τα καταστήματα: ο τίτλος είναι «Κατάστημα · θέμα», όπως τα στέλνει η επιχείρηση. */
const msg = (b: string, subject: string, body: string, h: number, read = true) =>
  db.notifications.push({ id: uid(), user_id: DEMO_UID, title: `${bz(b).name} · ${subject}`, body, read, created_at: ago(h) });
msg('b-zen', 'Νέα τμήματα', 'Ανοίξαμε Reformer προχωρημένο κάθε Τρίτη και Πέμπτη στις 20:00. Κλείσε θέση από την εφαρμογή!', 5, false);
msg('b-zen', 'Υπενθύμιση', 'Το πακέτο σου λήγει σε λίγες μέρες. Ανανέωσέ το στο studio για να κρατήσεις τις θέσεις σου.', 52);
msg('b-zen', 'Κλειστά', 'Την Κυριακή του Αγίου Δημητρίου το studio θα είναι κλειστό. Καλή γιορτή!', 220);
msg('b-fit', 'Αλλαγή ωραρίου', 'Από Δευτέρα το Spinning των 19:00 μεταφέρεται στις 19:30.', 9, false);
msg('b-fit', 'Προσφορά', 'Φέρε έναν φίλο τον Νοέμβριο και κερδίστε και οι δύο μία εβδομάδα δωρεάν.', 96);
msg('b-eleni', 'Προσφορά', 'Αυτή την εβδομάδα έκπτωση 20% στη θεραπεία κερατίνης.', 30);
msg('b-eleni', 'Ευχαριστούμε', 'Ευχαριστούμε που μας προτίμησες! Πες μας πώς σου φάνηκε η βαφή.', 410);
msg('b-niki', 'Νέα χρώματα', 'Ήρθαν τα φθινοπωρινά χρώματα: μπορντό, σοκολατί και chrome. Σε περιμένουμε!', 20, false);
msg('b-barber', 'Νέες ώρες', 'Ανοίξαμε ώρες και την Κυριακή 11:00–15:00 για τον Νοέμβριο.', 70);
msg('b-pt', 'Πρόγραμμα', 'Σου έστειλα το νέο πρόγραμμα διατροφής. Τα λέμε την Πέμπτη στις 19:00 💪', 26, false);
msg('b-physio', 'Ασκήσεις για το σπίτι', 'Κάνε τις διατάσεις 2 φορές τη μέρα, 10 επαναλήψεις. Στην επόμενη συνεδρία θα δούμε την πρόοδο.', 150);
msg('b-ink', 'Σχέδιο', 'Το σχέδιο είναι έτοιμο! Θα το δούμε μαζί πριν ξεκινήσουμε στο ραντεβού σου.', 40, false);
msg('b-glow', 'Υπενθύμιση', 'Σε περιμένουμε για την αποτρίχωση. Αν δεν μπορείς, ακύρωσε από την εφαρμογή.', 3, false);
msg('b-dent', 'Υπενθύμιση', 'Ήρθε η ώρα για τον εξαμηνιαίο καθαρισμό σου. Σε περιμένουμε!', 60);
msg('b-spa', 'Προσφορά', 'Μασάζ για δύο με 20% έκπτωση κάθε Τετάρτη.', 300);
msg('b-dr', 'Αποτελέσματα', 'Τα αποτελέσματα των εξετάσεών σου είναι φυσιολογικά. Επόμενος έλεγχος σε 6 μήνες.', 500);

/* ---------- λογαριασμοί ----------
   Κάθε email είναι δικός του λογαριασμός. Ό,τι κάνει (προφίλ, κρατήσεις, αναμονή, πακέτα, μηνύματα)
   μένει στη συσκευή, ώστε να το βρίσκει ξανά μετά από ανανέωση της σελίδας ή επανεκκίνηση. */
type Acc = { id: string; email: string };
let accounts: Acc[] = [{ id: DEMO_UID, email: DEMO_EMAIL }];
let me: string | null = null; // ο λογαριασμός της τρέχουσας κλήσης
const SAVE_KEY = 'spoton.demo.accounts.v1';
const MINE = ['profiles', 'bookings', 'waitlist', 'memberships', 'notifications'] as const;
const hex = (t: string) => { let a = 0x811c9dc5, b = 0x9747b28c; for (const ch of t) { a = Math.imul(a ^ ch.charCodeAt(0), 16777619) >>> 0; b = Math.imul(b ^ ch.charCodeAt(0), 2246822519) >>> 0; }
  return (a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')).slice(0, 12); };
const isAcc = (id: string) => id !== DEMO_UID && accounts.some((a) => a.id === id);
function persist() {
  const data: any = { accounts: accounts.filter((a) => a.id !== DEMO_UID) };
  MINE.forEach((t) => { data[t] = db[t].filter((r) => isAcc(r.user_id ?? r.id)); });
  const txt = JSON.stringify(data);
  try { ls()?.setItem(SAVE_KEY, txt); } catch {}
  AsyncStorage.setItem(SAVE_KEY, txt).catch(() => {});
}
function restore(txt: string | null | undefined) {
  if (!txt) return;
  try {
    const d = JSON.parse(txt);
    (d.accounts ?? []).forEach((a: Acc) => { if (!accounts.some((x) => x.id === a.id)) accounts.push(a); });
    MINE.forEach((t) => (d[t] ?? []).forEach((r: any) => {
      const dup = t === 'profiles' ? db[t].some((x) => x.id === r.id) : t === 'memberships' ? db[t].some((x) => x.user_id === r.user_id && x.business_id === r.business_id) : db[t].some((x) => x.id === r.id);
      if (!dup) db[t].push(r);
    }));
  } catch {}
}
restore(ls()?.getItem(SAVE_KEY));
const ready = Promise.all([flagReady, AsyncStorage.getItem(SAVE_KEY).then(restore).catch(() => {})]);

/* Βρίσκει ή φτιάχνει τον λογαριασμό ενός email. Ο νέος ξεκινά μόνο με ένα μήνυμα καλωσορίσματος. */
function account(email: string, id?: string): Acc {
  const e = email.trim().toLowerCase();
  let a = accounts.find((x) => x.email === e) ?? (id ? accounts.find((x) => x.id === id) : undefined);
  if (a) return a;
  a = { id: id ?? `00000000-0000-4000-8000-${hex(e)}`, email: e };
  accounts.push(a);
  db.notifications.push({ id: uid(), user_id: a.id, title: 'Καλώς ήρθες στο SpotOn 👋', body: 'Βρες το κατάστημα που θέλεις, κλείσε θέση σε λίγα δευτερόλεπτα και θα σου θυμίσουμε το ραντεβού σου.', read: false, created_at: new Date().toISOString() });
  persist();
  return a;
}
/* Ποιος κάνει την κλήση: από το token της συνεδρίας (ο επισκέπτης δεν έχει). */
function caller(h: Headers): { id: string; email: string } | null {
  const tok = (h.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const pl = unb64(tok.split('.')[1] ?? '');
  return pl?.sub ? { id: pl.sub, email: pl.email ?? '' } : null;
}
function auth(p: string, u: URL, body: any, h: Headers) {
  if (p.endsWith('/logout')) return json(undefined, 204);
  if (p.endsWith('/user')) { const c = caller(h); if (!c) return json({ msg: 'not signed in' }, 401); const a = account(c.email || c.id, c.id); return json(userOf(a.id, a.email)); }
  if (p.endsWith('/signup')) {
    const e = String(body?.email ?? '').trim().toLowerCase();
    if (accounts.some((x) => x.email === e)) return json({ code: 422, error_code: 'user_already_exists', msg: 'User already registered' }, 422);
    const a = account(e); return json(demoSession(a.id, a.email));
  }
  if (p.endsWith('/token')) {
    if (u.searchParams.get('grant_type') === 'refresh_token') {
      const r = String(body?.refresh_token ?? '');
      const d = r.startsWith('demo.') ? unb64(r.slice(5)) : null;
      return json(d?.id ? demoSession(d.id, d.email) : demoSession());
    }
    const a = account(String(body?.email ?? DEMO_EMAIL)); return json(demoSession(a.id, a.email));
  }
  return json({});
}

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

// Νέοι πελάτες που περιμένουν έγκριση, ανά επιχείρηση
const pending: Record<string, any[]> = {};
OWN.forEach((o) => { pending[o.id] = (o.pending ?? []).map((p, i) => ({ user_id: `p-${o.id}-${i}`, ...p })); });
const who = (u: string) => {
  if (u === DEMO_UID) return { name: 'Χριστίνα Αντωνίου', phone: '6945812304' };
  if (CLIENTS[u]) return CLIENTS[u];
  const pr = db.profiles.find((x) => x.id === u), acc = accounts.find((a) => a.id === u);
  const name = [pr?.first_name, pr?.last_name].filter(Boolean).join(' ') || acc?.email.split('@')[0] || 'Πελάτης';
  return { name, phone: pr?.phone || null };
};
const RPC: Record<string, (a: any) => any> = {
  day_availability: (a) => availability(a.p_service, a.p_date),
  create_booking: (a) => {
    const t = String(a.p_time).slice(0, 5);
    const sl = availability(a.p_service, a.p_date).find((x) => x.slot_time.slice(0, 5) === t);
    if (!sl) return { ok: false, error: 'Η ώρα δεν είναι διαθέσιμη' };
    if (sl.free <= 0) return { ok: false, full: true, error: 'Η ώρα γέμισε' };
    if (db.bookings.some((b) => b.service_id === a.p_service && b.date === a.p_date && b.time.slice(0, 5) === t && b.user_id === me && b.status === 'booked'))
      return { ok: false, error: 'Έχεις ήδη κράτηση σε αυτή την ώρα' };
    addBooking(a.p_service, a.p_date, t, me ?? DEMO_UID);
    db.waitlist = db.waitlist.filter((w) => !(w.service_id === a.p_service && w.date === a.p_date && w.time.slice(0, 5) === t && w.user_id === me));
    return { ok: true };
  },
  cancel_booking: (a) => { const b = db.bookings.find((x) => x.id === a.p_booking); if (b) { b.status = 'cancelled'; b.cancelled_at = new Date().toISOString(); } return { ok: true }; },
  join_waitlist: (a) => { db.waitlist.push({ id: uid(), service_id: a.p_service, user_id: me, date: a.p_date, time: String(a.p_time).slice(0, 5) + ':00' }); return { ok: true }; },
  leave_waitlist: (a) => { db.waitlist = db.waitlist.filter((w) => !(w.user_id === me && w.service_id === a.p_service && w.date === a.p_date && w.time.slice(0, 5) === String(a.p_time).slice(0, 5))); return { ok: true }; },
  my_bookings: () => ({
    bookings: db.bookings.filter((b) => b.user_id === me).sort((a, z) => (a.date + a.time).localeCompare(z.date + z.time)).map((b) => {
      const s = svc(b.service_id), z = bz(b.business_id);
      return { id: b.id, date: b.date, time: b.time.slice(0, 5), status: b.status, service: s.name, service_id: s.id, business: z.name, business_id: z.id, address: z.address };
    }),
    waitlist: db.waitlist.filter((w) => w.user_id === me).map((w) => {
      const s = svc(w.service_id); return { id: w.id, date: w.date, time: w.time.slice(0, 5), service: s.name, service_id: s.id, business: bz(s.business_id).name };
    }),
    memberships: db.memberships.filter((m) => m.user_id === me).map((m) => ({ ...m, business: bz(m.business_id).name })),
  }),
  owner_day: (a) => db.bookings.filter((b) => b.business_id === a.p_business && b.date === a.p_date && b.status !== 'cancelled')
    .sort((x, y) => x.time.localeCompare(y.time)).map((b) => {
      const s = svc(b.service_id), st = staffOf(b.staff_id);
      return { id: b.id, time: b.time.slice(0, 5), status: b.status, service: s.name, service_id: s.id, duration_min: s.duration_min, capacity: s.capacity,
        price_cents: s.price_cents, user_id: b.user_id, client: who(b.user_id).name, phone: who(b.user_id).phone,
        staff_id: st?.id ?? null, staff: st?.name ?? null, staff_color: st?.color ?? null };
    }),
  owner_pending: (a) => pending[a.p_business] ?? [],
  owner_set_status: (a) => { const b = db.bookings.find((x) => x.id === a.p_booking); if (b) b.status = a.p_status; return { ok: true }; },
  owner_set_member: (a) => { pending[a.p_business] = (pending[a.p_business] ?? []).filter((p) => p.user_id !== a.p_user); return { ok: true }; },
  owner_renew: (a) => {
    const c = db.client_cards.find((x) => x.business_id === a.p_business && x.user_id === a.p_user);
    if (c) c.pack = { name: c.pack?.name ?? 'Πακέτο', left: (c.pack?.left ?? 0) + a.p_credits, total: (c.pack?.left ?? 0) + a.p_credits, expires: plus(bz(a.p_business).package_days ?? 30) };
    return { ok: true };
  },
  /* Οι πελάτες της επιχείρησης με την καρτέλα τους: επισκέψεις, έσοδα, επόμενο ραντεβού, πακέτο και στοιχεία ανά επάγγελμα. */
  owner_clients: (a) => {
    const today = iso(new Date());
    const by: Record<string, any> = {};
    db.bookings.filter((b) => b.business_id === a.p_business).forEach((b) => {
      const c = (by[b.user_id] ??= { visits: 0, no_shows: 0, spent_cents: 0, last: null, next: null, first: b.date });
      if (b.date < c.first) c.first = b.date;
      if (b.status === 'attended') { c.visits++; c.spent_cents += svc(b.service_id).price_cents ?? 0; if (!c.last || b.date > c.last) c.last = b.date; }
      if (b.status === 'no_show') c.no_shows++;
      if (b.status === 'booked' && b.date >= today && (!c.next || b.date + b.time < c.next)) c.next = b.date + ' ' + b.time.slice(0, 5);
    });
    return Object.entries(by).filter(([u]) => u === DEMO_UID || CLIENTS[u] || accounts.some((x) => x.id === u))
      .map(([u, c]) => {
        const card = db.client_cards.find((x) => x.business_id === a.p_business && x.user_id === u);
        return { user_id: u, ...who(u), ...c, last: c.last ?? c.first, tag: card?.tag ?? null, note: card?.note ?? null, fields: card?.fields ?? [], pack: card?.pack ?? null };
      })
      .sort((x, y) => y.visits - x.visits || String(y.last).localeCompare(String(x.last)));
  },
  owner_client_history: (a) => db.bookings.filter((b) => b.business_id === a.p_business && b.user_id === a.p_user)
    .sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time)).slice(0, 30)
    .map((b) => ({ id: b.id, date: b.date, time: b.time.slice(0, 5), status: b.status, service: svc(b.service_id).name, staff: staffOf(b.staff_id)?.name ?? null, price_cents: svc(b.service_id).price_cents })),
  owner_set_note: (a) => {
    let c = db.client_cards.find((x) => x.business_id === a.p_business && x.user_id === a.p_user);
    if (!c) { c = { business_id: a.p_business, user_id: a.p_user, fields: [] }; db.client_cards.push(c); }
    c.note = String(a.p_note ?? '').trim() || null; return { ok: true };
  },
  owner_notify: (a) => {
    if (!String(a.p_body ?? '').trim()) return { ok: false, error: 'Γράψε μήνυμα' };
    const to = RPC.owner_clients(a).map((c: any) => c.user_id).filter((u: string) => !a.p_user || u === a.p_user);
    const title = bz(a.p_business).name + (String(a.p_title ?? '').trim() ? ' · ' + String(a.p_title).trim() : '');
    to.forEach((u: string) => db.notifications.push({ id: uid(), user_id: u, title, body: String(a.p_body).trim(), read: false, created_at: new Date().toISOString() }));
    return { ok: to.length > 0, sent: to.length, error: to.length ? undefined : 'Δεν βρέθηκε πελάτης' };
  },
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
    else if (op === 'in') { const set = val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')); out.push((r) => set.includes(String(r[k]))); }
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
    // Οι δοκιμαστικές επιχειρήσεις ανήκουν σε όποιον είναι συνδεδεμένος, ώστε η λειτουργία επιχείρησης να είναι πάντα γεμάτη.
    const src = table === 'businesses' && me ? rows.map((r) => (r.owner_id === DEMO_UID ? { ...r, owner_id: me } : r)) : rows;
    let out = order(src.filter(filters(u)), u);
    if (table === 'notifications') out = out.filter((r) => r.user_id === me); // όπως το RLS: βλέπεις μόνο τις δικές σου
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
  if (method === 'PATCH') { const f = filters(u); const out = rows.filter((r) => f(r) && (table !== 'notifications' || r.user_id === me)); out.forEach((r) => Object.assign(r, body)); return back(out); }
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
  if (p.startsWith('/auth/v1/')) return auth(p, url, body, h);
  me = caller(h)?.id ?? null;
  if (p.startsWith('/storage/v1/')) return json({ statusCode: '400', error: 'demo', message: 'Στο demo δεν ανεβαίνουν φωτογραφίες' }, 400);
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = RPC[p.split('/').pop()!];
    if (!fn) return json({ message: 'demo: άγνωστη λειτουργία' }, 404);
    const out = fn(body || {}); persist(); return json(out);
  }
  if (p.startsWith('/rest/v1/')) { const r = rest(method, url, p.slice('/rest/v1/'.length), body, h); if (method !== 'GET' && method !== 'HEAD') persist(); return r; }
  return fetch(input, init);
}
