import { rpc, sb } from '../supabase';
import { isDemo } from '../demo';
import { fetchMyBiz, setActiveBiz } from './active';
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
  const data = await fetchMyBiz(uid);
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
  const cents = (p: string) => (p ? Math.round(parseFloat(p.replace(',', '.')) * 100) : null);
  const list = svcs.filter((x) => x.name.trim());
  // Πραγματική βάση: όλα μαζί σε μία κλήση (supabase/migrations/005), ώστε να μη χαθεί το ωράριο αν κοπεί η σύνδεση.
  if (!isDemo()) {
    try {
      const r = await rpc<{ ok: boolean; id?: string; error?: string }>('save_business', {
        p_biz: row,
        p_services: list.map((x) => ({ key: x.key, id: x.id ?? null, name: x.name.trim(), duration_min: +x.duration_min || 30, capacity: +x.capacity || 1, price_cents: cents(x.price) })),
        p_hours: hours.map((h) => ({ weekday: h.weekday, opens: h.opens, closes: h.closes, svc: h.svc })),
        p_removed: removed,
      });
      if (!r.ok || !r.id) return { ok: false, error: r.error ?? 'Άγνωστο σφάλμα' };
      setActiveBiz(r.id);
      return { ok: true, id: r.id, warnings: [] };
    } catch (e: any) { return { ok: false, error: e?.message ?? 'Άγνωστο σφάλμα' }; }
  }
  // Demo: η ίδια αποθήκευση βήμα βήμα, μέσα στη μνήμη της συσκευής.
  const { data, error } = await sb.from('businesses').upsert(row).select().single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Άγνωστο σφάλμα' };
  for (const rid of removed) await sb.from('services').update({ active: false }).eq('id', rid);
  const ids: Record<string, string> = {};
  for (const x of list) {
    const r = { business_id: data.id, name: x.name.trim(), duration_min: +x.duration_min || 30, capacity: +x.capacity || 1, price_cents: cents(x.price) };
    if (x.id) { await sb.from('services').update(r).eq('id', x.id); ids[x.key] = x.id; }
    else { const { data: n } = await sb.from('services').insert(r).select('id').single(); if (n) ids[x.key] = n.id; }
  }
  await sb.from('opening_hours').delete().eq('business_id', data.id);
  const rows = hours.filter((h) => h.svc === null || ids[h.svc])
    .map((h) => ({ business_id: data.id, weekday: h.weekday, opens: h.opens, closes: h.closes, ...(h.svc ? { service_id: ids[h.svc] } : {}) }));
  await sb.from('opening_hours').insert(rows);
  setActiveBiz(data.id);
  return { ok: true, id: data.id, warnings: [] };
}
