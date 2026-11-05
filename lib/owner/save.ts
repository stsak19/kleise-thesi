import { sb } from '../supabase';
import { DAYS } from '../ui';
import { presetFor } from '../presets';

/* Κοινά της ρύθμισης καταστήματος: τύποι, έλεγχοι και αποθήκευση.
   Τα χρησιμοποιούν οι «Ρυθμίσεις καταστήματος» και ο οδηγός «Νέα επιχείρηση». */

export type Svc = { key: string; id?: string; name: string; duration_min: string; price: string; capacity: string };
/* svc: null = γενικό ωράριο, αλλιώς το key της υπηρεσίας. Πολλά διαστήματα την ίδια μέρα = διάλειμμα. */
export type Slot = { weekday: number; opens: string; closes: string; svc: string | null };
export type Hours = Slot[];

export const newKey = () => Math.random().toString(36).slice(2);
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const DAYNAME = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const HEX = /^#[0-9a-fA-F]{6}$/;

export const EMPTY_BIZ = { name: '', category: 'gym', city: '', address: '', phone: '', description: '',
  max_days_ahead: 14, cancel_before_min: 120, requires_approval: false, uses_credits: false, package_days: 30, is_published: false };

/* Οι προτεινόμενες υπηρεσίες και το ωράριο ενός είδους (lib/presets.ts), έτοιμα για επεξεργασία. */
export function presetData(cat: string) {
  const p = presetFor(cat);
  const svcs: Svc[] = p.services.map((x) => ({ key: newKey(), name: x.name, duration_min: String(x.duration_min),
    price: x.price != null ? String(x.price) : '', capacity: String(x.capacity) }));
  const hours: Hours = p.hours.flatMap((h) => h.days.flatMap((d) => h.spans.map(([o, c]) => ({ weekday: d, opens: o, closes: c, svc: null }))));
  return { rules: p.rules, svcs, hours };
}

/* Φορτώνει το κατάστημα του χρήστη (αν έχει) μαζί με υπηρεσίες και ωράριο. */
export async function loadBusiness(uid: string) {
  const { data } = await sb.from('businesses').select('*').eq('owner_id', uid).maybeSingle();
  if (!data) return null;
  const { data: sv } = await sb.from('services').select('*').eq('business_id', data.id).eq('active', true);
  const { data: h } = await sb.from('opening_hours').select('*').eq('business_id', data.id).order('weekday');
  return {
    b: data,
    svcs: (sv ?? []).map((x): Svc => ({ key: x.id, id: x.id, name: x.name, duration_min: String(x.duration_min),
      price: x.price_cents != null ? String(x.price_cents / 100) : '', capacity: String(x.capacity) })),
    hours: (h ?? []).map((x): Slot => ({ weekday: x.weekday, opens: x.opens.slice(0, 5), closes: x.closes.slice(0, 5), svc: x.service_id ?? null })),
  };
}

/* Πρώτο λάθος στο ωράριο, ως κείμενο για τον χρήστη (ή null). */
export function badHours(hours: Hours) {
  const bad = hours.find((h) => !TIME.test(h.opens) || !TIME.test(h.closes) || h.closes <= h.opens);
  return bad ? `${DAYS[bad.weekday]}: ${bad.opens}–${bad.closes}. Γράψε ώρες σαν 09:00 και το κλείσιμο μετά το άνοιγμα.` : null;
}

type SaveResult = { ok: true; id: string; warnings: string[] } | { ok: false; error: string };

/* Αποθηκεύει κατάστημα, υπηρεσίες και ωράριο. removed = υπηρεσίες που φεύγουν. */
export async function saveBusiness(uid: string, b: any, svcs: Svc[], hours: Hours, removed: string[] = []): Promise<SaveResult> {
  const row = { ...b, owner_id: uid, max_days_ahead: +b.max_days_ahead || 14, cancel_before_min: +b.cancel_before_min || 0, package_days: +b.package_days || 30 };
  delete row.created_at;
  const warnings: string[] = [];
  let { data, error } = await sb.from('businesses').upsert(row).select().single();
  // Αν η βάση δεν έχει ακόμα τις νέες στήλες (δες supabase/migrations), αποθήκευσε χωρίς αυτές.
  let missing = false;
  for (const col of ['brand_color', 'cover_url', 'layout', 'theme']) {
    if (error && error.message.includes(col)) {
      delete row[col]; missing = true;
      ({ data, error } = await sb.from('businesses').upsert(row).select().single());
    }
  }
  if (error || !data) return { ok: false, error: error?.message ?? 'Άγνωστο σφάλμα' };
  if (missing) warnings.push('Κάποια στοιχεία δεν αποθηκεύτηκαν. Χρειάζεται ενημέρωση της βάσης (supabase/migrations).');
  for (const rid of removed) await sb.from('services').update({ active: false }).eq('id', rid);
  const ids: Record<string, string> = {};
  for (const x of svcs.filter((x) => x.name.trim())) {
    const r = { business_id: data.id, name: x.name.trim(), duration_min: +x.duration_min || 30, capacity: +x.capacity || 1,
      price_cents: x.price ? Math.round(parseFloat(x.price.replace(',', '.')) * 100) : null };
    if (x.id) { await sb.from('services').update(r).eq('id', x.id); ids[x.key] = x.id; }
    else { const { data: n } = await sb.from('services').insert(r).select('id').single(); if (n) ids[x.key] = n.id; }
  }
  await sb.from('opening_hours').delete().eq('business_id', data.id);
  const rows = hours.filter((h) => h.svc === null || ids[h.svc])
    .map((h) => ({ business_id: data.id, weekday: h.weekday, opens: h.opens, closes: h.closes, ...(h.svc ? { service_id: ids[h.svc] } : {}) }));
  const hr = await sb.from('opening_hours').insert(rows);
  if (hr.error && hr.error.message.includes('service_id')) {
    await sb.from('opening_hours').insert(rows.filter((r: any) => !r.service_id));
    warnings.push('Το ωράριο ανά υπηρεσία δεν αποθηκεύτηκε. Χρειάζεται ενημέρωση της βάσης (supabase/migrations/002).');
  }
  return { ok: true, id: data.id, warnings };
}
