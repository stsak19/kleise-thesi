import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rpc, sb } from '../supabase';
import { say } from '../alert';
import { iso } from '../ui';
import { useAuth } from '../auth';
import { askLogin } from '../guest';
import { useStore, dayLabel, endOf, type Service, type Slot } from './data';

/* Η ροή κράτησης: μία ροή με βήματα που εμφανίζονται μόνο όταν χρειάζονται.
   Υπηρεσία (αν είναι πάνω από μία) → Άτομο (αν την κάνουν πάνω από ένα άτομα) → Ώρα → Επιβεβαίωση.
   Στα μαθήματα το πρόγραμμα παίρνει τη θέση των τριών πρώτων βημάτων και μένει μόνο η Επιβεβαίωση.
   Κινητό: φύλλο από κάτω, ένα βήμα κάθε φορά (Sheet). Υπολογιστής: όλα σε μία σελίδα (BookPage + BookSummary).
   Το αγαπημένο άτομο κρατιέται στη συσκευή ανά κατάστημα, μαζί με την υπηρεσία («Το συνηθισμένο σου»). */

export type Staff = { id: string; name: string; role?: string; color?: string; photo_url?: string | null; services: string[]; days: number[] };
export type Step = 'service' | 'staff' | 'time' | 'confirm';
export type TimeSlot = { time: string; free: number; staff_free?: string[] };
export type Fav = { staff: string; service: string };
export const ANY = 'any';

const FAV_KEY = 'fav.staff.v1';
let favCache: Record<string, Fav> | null = null;
const loadFavs = async () => {
  if (favCache) return favCache;
  try { favCache = JSON.parse((await AsyncStorage.getItem(FAV_KEY)) ?? '{}') ?? {}; } catch { favCache = {}; }
  return favCache!;
};
const saveFavs = (v: Record<string, Fav>) => { favCache = v; AsyncStorage.setItem(FAV_KEY, JSON.stringify(v)).catch(() => {}); };

export const firstName = (n?: string) => String(n ?? '').split(' ')[0];
/* «τον Κώστα» / «τη Μαρία»: απλός κανόνας για το άρθρο από την κατάληξη. */
export const withArticle = (n?: string) => { const f = firstName(n); return /[αηάή]$/i.test(f) ? `τη ${f}` : `τον ${f.replace(/ς$/, '')}`; };

const nowHM = () => { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; };
async function fetchSlots(sv: Service, date: string, staff: string | null): Promise<TimeSlot[]> {
  const args: any = { p_service: sv.id, p_date: date };
  if (staff && staff !== ANY) args.p_staff = staff; // μόνο όταν υπάρχει ομάδα (demo)· η πραγματική βάση δεν το ξέρει ακόμα
  const r = ((await rpc<any[]>('day_availability', args)) ?? []).map((x) => ({ time: x.slot_time.slice(0, 5), free: x.free, staff_free: x.staff_free }));
  return date === iso(new Date()) ? r.filter((x) => x.time > nowHM()) : r;
}

function useBookState() {
  const S = useStore();
  const signedIn = !!useAuth().session;
  const [staff, setStaffList] = useState<Staff[]>([]);
  const [favs, setFavs] = useState<Record<string, Fav>>(favCache ?? {});
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('service');
  const [service, setServiceSel] = useState<Service | null>(null);
  const [who, setWho] = useState<string | null>(null); // id ατόμου, ANY ή null (δεν έχει διαλέξει)
  const [date, setDate] = useState(iso(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [classSlot, setClassSlot] = useState<Slot | null>(null); // μαθήματα: η ώρα που πάτησε στο πρόγραμμα

  useEffect(() => { loadFavs().then((v) => setFavs({ ...v })); }, []);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await sb.from('staff').select('*').eq('business_id', S.id);
        setStaffList((data ?? []).map((x: any) => ({ ...x, services: x.services ?? [], days: x.days ?? [0, 1, 2, 3, 4, 5, 6] })));
      } catch { setStaffList([]); }
    })();
  }, [S.id]);

  const classes = S.layout === 'classes';
  const staffFor = useCallback((sv: Service | null) => (sv && sv.capacity <= 1 ? staff.filter((x) => x.services.includes(sv.id)) : []), [staff]);
  const team = staffFor(service);
  const person = team.find((x) => x.id === who) ?? (team.length === 1 ? team[0] : null);
  const fav = favs[S.id] ?? null;
  const favStaff = fav ? staff.find((x) => x.id === fav.staff) ?? null : null;

  const steps: Step[] = classes ? ['confirm'] : [
    ...(S.services.length > 1 ? ['service' as Step] : []),
    ...(team.length > 1 || (!service && staff.length > 1) ? ['staff' as Step] : []),
    'time', 'confirm',
  ];

  /* Επιλογή υπηρεσίας: το αγαπημένο άτομο προεπιλέγεται αν την κάνει, αλλιώς «Οποιοσδήποτε». */
  const pickService = (sv: Service) => {
    setServiceSel(sv); setTime(null);
    const t = staffFor(sv);
    setWho(t.length === 0 ? null : t.length === 1 ? t[0].id : favStaff && t.some((x) => x.id === favStaff.id) ? favStaff.id : who && who !== ANY && t.some((x) => x.id === who) ? who : ANY);
  };
  const pickWho = (id: string) => { setWho(id); setTime(null); };

  // Μοναδική υπηρεσία: διαλέγεται μόνη της.
  useEffect(() => { if (!classes && S.services.length === 1 && !service) pickService(S.services[0]); }, [S.services, classes, staff]);
  // Διάλεξε συγκεκριμένο άτομο: προτείνουμε να το θυμόμαστε (ο διακόπτης στην επιβεβαίωση).
  useEffect(() => { setKeep(!!person && who !== ANY); }, [person?.id, who]);

  // Ελεύθερες ώρες για υπηρεσία + άτομο + μέρα.
  useEffect(() => {
    if (!service || classes) { setSlots(null); return; }
    let live = true; setSlots(null);
    fetchSlots(service, date, team.length ? who : null).then((r) => live && setSlots(r)).catch(() => live && setSlots([]));
    return () => { live = false; };
  }, [service?.id, who, date, classes, team.length]);

  const days = S.days;
  /* Άνοιγμα του φύλλου: από την αρχή, από μια υπηρεσία, ή κατευθείαν στην ώρα/επιβεβαίωση («Το συνηθισμένο σου»). */
  const start = (o: { service?: Service; who?: string; at?: Step; date?: string; time?: string } = {}) => {
    setClassSlot(null);
    if (o.service) pickService(o.service); else if (S.services.length > 1) { setServiceSel(null); setWho(null); setTime(null); }
    if (o.who) setWho(o.who);
    setDate(o.date ?? (days.includes(date) ? date : days[0] ?? iso(new Date())));
    setTime(o.time ?? null);
    const first: Step = o.at ?? (o.service ? (staffFor(o.service).length > 1 ? 'staff' : 'time') : S.services.length > 1 ? 'service' : staffFor(S.services[0] ?? null).length > 1 ? 'staff' : 'time');
    setStep(first); setOpen(true);
  };
  /* Μαθήματα: το «Κράτηση» του προγράμματος ανοίγει κατευθείαν την επιβεβαίωση. */
  const confirmClass = (sl: Slot) => {
    if (!signedIn) return askLogin(`/store/${S.id}`);
    setClassSlot(sl); setServiceSel(sl.sv); setWho(null); setDate(S.date); setTime(sl.time); setStep('confirm'); setOpen(true);
  };
  const close = () => { setOpen(false); setClassSlot(null); };
  const next = () => { const i = steps.indexOf(step); if (i >= 0 && i < steps.length - 1) setStep(steps[i + 1]); };
  const back = () => { const i = steps.indexOf(step); if (i > 0) setStep(steps[i - 1]); else close(); };

  const setFav = (v: Fav | null) => {
    const all = { ...(favCache ?? favs) };
    if (v) all[S.id] = v; else delete all[S.id];
    saveFavs(all); setFavs(all);
  };

  const submit = async () => {
    if (!signedIn) { close(); return askLogin(`/store/${S.id}`); }
    if (classSlot) { close(); return S.book(classSlot); }
    if (!service || !time) return;
    setBusy(true);
    try {
      const args: any = { p_service: service.id, p_date: date, p_time: time };
      if (team.length && who && who !== ANY) args.p_staff = who;
      const r: any = await rpc('create_booking', args);
      if (r && r.ok === false) { say(r.pending ? 'Σε αναμονή έγκρισης' : 'Δεν έγινε', r.error); setBusy(false); return; }
      if (person && team.length > 1) { if (keep) setFav({ staff: person.id, service: service.id }); else if (fav?.staff === person.id) setFav(null); }
      const withWho = r?.staff ? ` · με ${withArticle(r.staff)}` : person ? ` · με ${withArticle(person.name)}` : '';
      close(); setTime(null);
      say(S.biz?.requires_approval ? 'Το αίτημα στάλθηκε' : 'Κλείστηκε! 🎉', `${service.name}${withWho}\n${dayLabel(date)} στις ${time}–${endOf(time, service.duration_min)}`);
    } catch (e: any) { say('Κάτι πήγε στραβά', e.message); }
    setBusy(false); S.reload();
  };

  /* «Το συνηθισμένο σου»: η υπηρεσία και το αγαπημένο άτομο, με την πρώτη ελεύθερη ώρα του. */
  const usualService = favStaff ? S.services.find((x) => x.id === fav!.service && favStaff.services.includes(x.id)) ?? S.services.find((x) => favStaff.services.includes(x.id)) ?? null : null;
  const [usualNext, setUsualNext] = useState<{ date: string; time: string } | null | undefined>(undefined);
  useEffect(() => {
    if (!favStaff || !usualService || classes) { setUsualNext(undefined); return; }
    let live = true; setUsualNext(undefined);
    (async () => {
      for (const d of days.slice(0, 21)) {
        const r = await fetchSlots(usualService, d, favStaff.id).catch(() => []);
        const f = r.find((x) => x.free > 0);
        if (!live) return;
        if (f) { setUsualNext({ date: d, time: f.time }); return; }
      }
      if (live) setUsualNext(null);
    })();
    return () => { live = false; };
  }, [favStaff?.id, usualService?.id, days.length, classes, S.upcoming.length]);

  return {
    staff, staffFor, team, person, fav, favStaff, usualService, usualNext, setFav,
    open, step, setStep, steps, service, who, date, time, slots, keep, busy, classSlot, classes,
    pickService, pickWho, setDate, setTime, setKeep, start, confirmClass, close, next, back, submit,
  };
}

export type Book = ReturnType<typeof useBookState>;
const Ctx = createContext<Book | null>(null);
export const useBook = () => useContext(Ctx)!;
export function BookProvider({ children }: { children: React.ReactNode }) {
  const v = useBookState();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
