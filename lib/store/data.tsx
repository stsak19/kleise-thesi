import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { rpc, sb } from '../supabase';
import { say } from '../alert';
import { styleOf, type Layout } from '../presets';
import { fmtLong, iso } from '../ui';
import { useAuth } from '../auth';
import { askLogin } from '../guest';
import { packInfo } from '../bookings/cards';
import { router } from 'expo-router';

/* Τα δεδομένα της «εφαρμογής» ενός καταστήματος (app/store/[id]).
   Όπως οι κρατήσεις του Gym_Schedule: πρόγραμμα ημέρας, οι κρατήσεις μου, μηνύματα, πακέτο.
   Φορτώνονται μία φορά στο _layout και τα μοιράζονται όλες οι καρτέλες. */

export type Service = { id: string; name: string; duration_min: number; price_cents: number | null; capacity: number };
export type Slot = { sv: Service; time: string; capacity: number; taken: number; free: number };
export type Hours = { weekday: number; opens: string; closes: string; service_id: string | null };
export type SlotState = 'mine' | 'wait' | 'free' | 'full';

const avail = async (sv: Service, date: string): Promise<Slot[]> =>
  ((await rpc<any[]>('day_availability', { p_service: sv.id, p_date: date })) ?? [])
    .map((x) => ({ sv, time: x.slot_time.slice(0, 5), capacity: x.capacity, taken: x.taken, free: x.free }));

export const endOf = (t: string, min: number) => {
  const [h, m] = t.split(':').map(Number); const e = h * 60 + m + min;
  return `${String(Math.floor(e / 60) % 24).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
};
/* Κράτηση χωρίς διαθέσιμες επισκέψεις: πάμε τον πελάτη στα πακέτα του καταστήματος. */
export const askPack = (id: string, msg?: string) => say('Χρειάζεσαι πακέτο', msg ?? 'Δεν σου έμειναν κρατήσεις. Διάλεξε ένα πακέτο από το κατάστημα.', [
  { text: 'Όχι τώρα', style: 'cancel' }, { text: 'Δες τα πακέτα', onPress: () => router.navigate(`/store/${id}/info` as any) }]);
export type Package = { id: string; name: string; kind: string; price_cents: number; sessions: number | null; days: number | null; note: string | null; popular?: boolean };

export const dayLabel = (d: string) => (d === iso(new Date()) ? 'Σήμερα' : fmtLong(d));

function useStoreData(id: string) {
  const signedIn = !!useAuth().session;
  const [biz, setBiz] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<Hours[]>([]);
  const [mine, setMine] = useState<any>({ bookings: [], waitlist: [], memberships: [] });
  const [notes, setNotes] = useState<any[]>([]);
  const [date, setDate] = useState(iso(new Date()));
  const [service, setService] = useState<string | null>(null); // φίλτρο (μαθήματα) ή επιλογή (ραντεβού)
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: sv }, { data: h }] = await Promise.all([
        sb.from('businesses').select('*').eq('id', id).single(),
        sb.from('services').select('*').eq('business_id', id).eq('active', true).order('name'),
        sb.from('opening_hours').select('*').eq('business_id', id),
      ]);
      sb.from('packages').select('*').eq('business_id', id).eq('active', true).then(({ data, error }) =>
        setPackages(error ? [] : (data ?? []).sort((a: any, z: any) => (a.price_cents ?? 0) - (z.price_cents ?? 0))));
      setBiz(b); setHours((h ?? []).filter((x: Hours) => !x.service_id)); setServices(sv ?? []);
    })();
  }, [id]);

  const st = biz ? styleOf(biz) : null;
  const layout: Layout | undefined = st?.layout;
  // Στα ραντεβού διαλέγεις πάντα μία υπηρεσία· στα μαθήματα το φίλτρο ξεκινά από «Όλα».
  useEffect(() => { if (layout && layout !== 'classes' && !service && services.length) setService(services[0].id); }, [layout, services]);

  const days = useMemo(() => {
    const n = biz?.max_days_ahead ?? 14, base = new Date();
    return Array.from({ length: n + 1 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return iso(d); });
  }, [biz]);

  const loadMine = useCallback(async () => {
    if (!signedIn) return; // επισκέπτης: βλέπει το πρόγραμμα, δεν έχει κρατήσεις
    const [my, n] = await Promise.all([rpc('my_bookings'), sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)]);
    setMine(my ?? { bookings: [], waitlist: [], memberships: [] }); setNotes(n.data ?? []);
  }, [signedIn]);

  const loadDay = useCallback(async () => {
    if (!layout) return;
    // Μαθήματα: «Όλα» (service = null) ή μόνο το επιλεγμένο τμήμα. Ραντεβού: πάντα μία υπηρεσία.
    const list = layout === 'classes' && !service ? services : services.filter((x) => x.id === service);
    if (!list.length) { setSlots([]); return; }
    const [all, dn] = await Promise.all([
      Promise.all(list.map((sv) => avail(sv, date))),
      sb.from('day_overrides').select('note,closed').eq('business_id', id).eq('date', date).maybeSingle(),
    ]);
    // Οι περασμένες ώρες της σημερινής μέρας δεν εμφανίζονται (όπως στο Gym_Schedule).
    const now = new Date(), today = iso(now), hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setSlots(all.flat().filter((x) => date !== today || x.time > hhmm).sort((a, z) => a.time.localeCompare(z.time) || a.sv.name.localeCompare(z.sv.name)));
    setNote(dn.data?.closed ? 'Κλειστά αυτή τη μέρα' : dn.data?.note ?? null);
  }, [layout, services, service, date, id]);

  const reload = useCallback(async () => { await Promise.all([loadMine(), loadDay()]).catch(() => say('Δεν φορτώθηκε το πρόγραμμα')); }, [loadMine, loadDay]);
  useEffect(() => { setSlots(null); loadDay().catch(() => say('Δεν φορτώθηκε το πρόγραμμα')); }, [loadDay]);
  useEffect(() => { loadMine(); }, [loadMine]);

  /* ---------- οι κρατήσεις μου σε αυτό το κατάστημα ---------- */
  const today = iso(new Date());
  const all: any[] = (mine.bookings ?? []).filter((b: any) => b.business_id === id);
  const upcoming = all.filter((b) => b.status === 'booked' && b.date >= today);
  const past = all.filter((b) => !(b.status === 'booked' && b.date >= today)).reverse();
  const svIds = new Set(services.map((x) => x.id));
  const waits: any[] = (mine.waitlist ?? []).filter((w: any) => svIds.has(w.service_id));
  const membership = (mine.memberships ?? []).find((m: any) => m.business_id === id) ?? null;
  /* Πακέτο: όσα απομένουν και το σύνολο της περιόδου (απομένουν + όσα χρησιμοποιήθηκαν από την αρχή του πακέτου). */
  const pack = useMemo(() => {
    if (!membership || membership.status !== 'approved' || !biz?.uses_credits) return null;
    const left = membership.credits ?? 0;
    let since: string | null = null;
    if (membership.expires) { const d = new Date(membership.expires + 'T00:00'); d.setDate(d.getDate() - (biz.package_days ?? 30)); since = iso(d); }
    const used = all.filter((b) => b.status !== 'cancelled' && (!since || b.date >= since)).length;
    if (membership.unlimited) return { left, total: null, unlimited: true, expires: membership.expires as string | null };
    return { left, total: membership.total ?? Math.max(left + used, left, 1), expires: membership.expires as string | null };
  }, [membership, biz, all.length]);
  /* Η κάρτα πακέτου (ίδια με τη γενική λίστα Πακέτα): και όταν περιμένει έγκριση. */
  const packCard = useMemo(() => (membership && (membership.expires || membership.status === 'pending' || membership.pending_package) ? packInfo(membership, biz, all) : null), [membership, biz, all.length]);
  // Μηνύματα του καταστήματος: οι ειδοποιήσεις που ξεκινούν με το όνομά του.
  const messages = biz ? notes.filter((n) => String(n.title ?? '').startsWith(biz.name)) : [];

  const myAt = (sv: Service, t: string) => all.find((b) => b.service_id === sv.id && b.date === date && b.time === t && b.status === 'booked');
  const waitAt = (sv: Service, t: string) => waits.find((w) => w.service_id === sv.id && w.date === date && w.time === t);
  const state = (sl: Slot): SlotState => (myAt(sl.sv, sl.time) ? 'mine' : waitAt(sl.sv, sl.time) ? 'wait' : sl.free > 0 ? 'free' : 'full');

  const run = async (key: string, fn: () => Promise<any>, okTitle: string, okMsg?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r && r.ok === false) r.no_credits ? askPack(id) : say(r.pending ? 'Σε αναμονή έγκρισης' : 'Δεν έγινε', r.error);
      else say(okTitle, okMsg);
    } catch (e: any) { say('Κάτι πήγε στραβά', e.message); }
    setBusy(null); reload();
  };

  /* Κράτηση. Αν έχει δηλώσει ενδιαφέρον για άλλη ώρα της ίδιας μέρας, ρωτάμε αν αυτή είναι η εναλλακτική. */
  const book = (sl: Slot) => {
    if (!signedIn) return askLogin(`/store/${id}`);
    const open = waits.find((w) => w.service_id === sl.sv.id && w.date === date && w.time !== sl.time);
    const go = (backup: string | null) => run(sl.sv.id + sl.time, () => rpc('create_booking', { p_service: sl.sv.id, p_date: date, p_time: sl.time, p_backup_for: backup }),
      'Κλείστηκε! 🎉', `${sl.sv.name} · ${dayLabel(date)} στις ${sl.time}`);
    if (!open) return go(null);
    say('Είναι εναλλακτική;', `Έχεις δηλώσει ενδιαφέρον για τις ${open.time}. Αν ελευθερωθεί θέση εκεί, να ακυρωθεί αυτόματα η κράτηση των ${sl.time};`,
      [{ text: 'Ναι, εναλλακτική', onPress: () => go(open.id) }, { text: 'Όχι, θέλω και τις δύο', onPress: () => go(null) }]);
  };
  /* Δήλωση ενδιαφέροντος (αναμονή). Αν έχει ήδη κράτηση την ίδια μέρα, ρωτάμε αν να ακυρωθεί όταν βρεθεί θέση. */
  const wait = (sl: Slot) => {
    if (!signedIn) return askLogin(`/store/${id}`);
    const same = all.find((b) => b.service_id === sl.sv.id && b.date === date && b.status === 'booked');
    const go = (backup: string | null) => run(sl.sv.id + sl.time, () => rpc('join_waitlist', { p_service: sl.sv.id, p_date: date, p_time: sl.time, p_backup_booking: backup }),
      'Δήλωσες ενδιαφέρον 🙋', `Αν ελευθερωθεί θέση στις ${sl.time}, σου κλείνεται αυτόματα.`);
    if (!same) return go(null);
    say('Δήλωση ενδιαφέροντος', `Αν ελευθερωθεί θέση στις ${sl.time}, να ακυρωθεί η κράτηση των ${same.time};`,
      [{ text: `Ναι, ακύρωσε τις ${same.time}`, onPress: () => go(same.id) }, { text: 'Όχι, κράτα και τις δύο', onPress: () => go(null) }]);
  };
  const cancelBooking = (b: { id: string; date: string; time: string; service?: string }) =>
    say('Ακύρωση κράτησης', `${b.service ? b.service + ' · ' : ''}${dayLabel(b.date)} στις ${b.time}`, [
      { text: 'Όχι', style: 'cancel' },
      { text: 'Ακύρωση', style: 'destructive', onPress: () => run(b.id, () => rpc('cancel_booking', { p_booking: b.id }), 'Η κράτηση ακυρώθηκε') },
    ]);
  const cancel = (sl: Slot) => { const b = myAt(sl.sv, sl.time); if (b) cancelBooking({ ...b, service: sl.sv.name }); };
  const leave = (w: { service_id: string; date: string; time: string; id?: string }) =>
    run(w.service_id + w.time, () => rpc('leave_waitlist', { p_service: w.service_id, p_date: w.date, p_time: w.time.slice(0, 5) + ':00' }), 'Η δήλωση αποσύρθηκε');
  /* Πακέτα: ο πελάτης διαλέγει ένα, το κατάστημα το ενεργοποιεί όταν πληρωθεί. */
  const pendingPack: { id: string; name: string } | null = membership?.pending_package ?? null;
  const choosePack = (pk: Package) => {
    if (!signedIn) return askLogin(`/store/${id}/info`);
    const go = () => run('pack' + pk.id, () => rpc('request_package', { p_package: pk.id }), 'Το ζήτησες ✓',
      `Το κατάστημα θα ενεργοποιήσει το «${pk.name}» όταν το πληρώσεις εκεί. Θα σου έρθει ειδοποίηση.`);
    say(`«${pk.name}»`, [pk.price_cents ? `Τιμή ${(pk.price_cents / 100).toLocaleString('el-GR')}€, πληρώνεται στο κατάστημα.` : 'Δωρεάν.',
      pendingPack && pendingPack.id !== pk.id ? `Θα αντικαταστήσει το αίτημα για «${pendingPack.name}».` : ''].filter(Boolean).join(' '),
      [{ text: 'Άκυρο', style: 'cancel' }, { text: 'Το θέλω', onPress: go }]);
  };
  const cancelPack = () => run('pack', () => rpc('cancel_package_request', { p_business: id }), 'Το αίτημα αποσύρθηκε');
  const unwait = (sl: Slot) => leave({ service_id: sl.sv.id, date, time: sl.time });

  return {
    id, biz, st, layout, services, hours, days, date, setDate, service, setService, slots, note, busy,
    packages, pendingPack, choosePack, cancelPack,
    upcoming, past, waits, pack, packInfo: packCard, membership, messages, state, waitAt, book, wait, cancel, unwait, cancelBooking, leave, reload,
  };
}

export type Store = ReturnType<typeof useStoreData>;
const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;
export function StoreProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const v = useStoreData(id);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
