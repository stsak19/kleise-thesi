import { useCallback, useEffect, useState } from 'react';
import { promptText, say } from '../alert';
import { rpc } from '../supabase';

/* Super admin της πλατφόρμας: όλα περνούν από τις admin_* συναρτήσεις της βάσης (010_super_admin.sql),
   που ελέγχουν πρώτα ότι ο συνδεδεμένος είναι στον πίνακα platform_admins. Η εφαρμογή δεν έχει κανένα κλειδί admin. */

/* Τι ξέρουμε για τον συνδεδεμένο: 'admin' / 'no' (δεν είναι super admin) /
   'nodb' (η βάση δεν έχει ακόμα το 010_super_admin.sql) / 'error' (δεν απάντησε η βάση) / null (ρωτάμε ακόμα). */
export type AdminState = 'admin' | 'no' | 'nodb' | 'error' | null;
let cached: { uid: string; v: AdminState } | null = null;
export function useAdminState(uid?: string | null) {
  const [st, setSt] = useState<AdminState>(uid && cached?.uid === uid ? cached.v : null);
  useEffect(() => {
    if (!uid) { setSt(null); return; }
    let live = true;
    rpc<boolean>('is_super_admin')
      .then((v) => { const r: AdminState = v ? 'admin' : 'no'; cached = { uid, v: r }; if (live) setSt(r); })
      .catch((e) => {
        const m = String(e?.message ?? e);
        const r: AdminState = /is_super_admin|could not find|does not exist|schema cache/i.test(m) ? 'nodb' : 'error';
        if (live) setSt(r);
      });
    return () => { live = false; };
  }, [uid]);
  return st;
}
/* Είναι ο συνδεδεμένος super admin; (null όσο ρωτάμε τη βάση) */
export function useIsAdmin(uid?: string | null) {
  const st = useAdminState(uid);
  return st === null ? null : st === 'admin';
}

/* Φόρτωση από μια admin_* συνάρτηση, με ανανέωση μετά από κάθε ενέργεια. */
export function useAdmin<T = any>(fn: string, args: Record<string, unknown> = {}, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    rpc<T>(fn, args).then((d) => { setData(d); setError(null); }).catch((e) => setError(String(e?.message ?? e)));
  }, [fn, JSON.stringify(args)]);
  useEffect(() => { load(); }, [load, ...deps]);
  return { data, error, reload: load };
}

/* Μια ενέργεια με ερώτηση επιβεβαίωσης πρώτα. */
export function confirmAct(title: string, msg: string, yes: string, run: () => Promise<any>, done?: () => void) {
  say(title, msg, [{ text: 'Όχι', style: 'cancel' }, { text: yes, style: 'destructive', onPress: () => act(run, done) }]);
}
export async function act(run: () => Promise<any>, done?: () => void) {
  try {
    const r = await run();
    if (r && r.ok === false) { say(r.error ?? 'Δεν έγινε'); return; }
    done?.();
  } catch (e: any) { say('Δεν έγινε', String(e?.message ?? e)); }
}

/* Ενέργειες (κοινές για λίστες και καρτέλες). */
export const adminActions = {
  suspendBiz: (b: { id: string; name: string; suspended?: boolean }, done: () => void) => b.suspended
    ? confirmAct('Ενεργοποίηση', `Το «${b.name}» θα φαίνεται ξανά στους πελάτες.`, 'Ενεργοποίηση',
        () => rpc('admin_suspend_business', { p_id: b.id, p_on: false }), done)
    : promptText('Αναστολή καταστήματος', `Το «${b.name}» θα κρυφτεί και δεν θα δέχεται κρατήσεις. Λόγος (τον βλέπει ο ιδιοκτήτης, προαιρετικό):`,
        (reason) => act(() => rpc('admin_suspend_business', { p_id: b.id, p_on: true, p_reason: reason }), done)),
  deleteBiz: (b: { id: string; name: string }, done: () => void) =>
    confirmAct('Διαγραφή καταστήματος', `Το «${b.name}» θα σβηστεί οριστικά, μαζί με υπηρεσίες και κρατήσεις. Όσοι έχουν επόμενο ραντεβού θα ενημερωθούν. Δεν αναιρείται.`,
      'Διαγραφή', () => rpc('admin_delete_business', { p_id: b.id }), done),
  suspendUser: (u: { id: string; name?: string; email?: string; suspended?: boolean }, done: () => void) => u.suspended
    ? confirmAct('Άρση αναστολής', `${u.name || u.email} θα μπορεί ξανά να κλείνει ραντεβού.`, 'Άρση',
        () => rpc('admin_suspend_user', { p_user: u.id, p_on: false }), done)
    : promptText('Αναστολή λογαριασμού', `${u.name || u.email} δεν θα μπορεί να κλείνει νέα ραντεβού. Λόγος (τον βλέπει ο χρήστης, προαιρετικό):`,
        (reason) => act(() => rpc('admin_suspend_user', { p_user: u.id, p_on: true, p_reason: reason }), done)),
  deleteUser: (u: { id: string; name?: string; email?: string }, done: () => void) =>
    confirmAct('Διαγραφή λογαριασμού', `Ο λογαριασμός ${u.name || u.email} σβήνεται τώρα, μαζί με τα καταστήματά του. Οι επόμενες κρατήσεις ακυρώνονται. Δεν αναιρείται.`,
      'Διαγραφή', () => rpc('admin_delete_user', { p_user: u.id }), done),
  message: (u: { id: string; name?: string; email?: string }, done?: () => void) =>
    promptText('Μήνυμα από το SpotOn', `Προς ${u.name || u.email}. Θα το δει στις ειδοποιήσεις του:`,
      (text) => act(() => rpc('admin_message', { p_user: u.id, p_text: text }), () => { say('Στάλθηκε ✓'); done?.(); })),
  cancelBooking: (b: { id: string }, done: () => void) =>
    confirmAct('Ακύρωση κράτησης', 'Θα ενημερωθούν ο πελάτης και το κατάστημα.', 'Ακύρωση', () => rpc('admin_cancel_booking', { p_booking: b.id }), done),
  deleteReview: (r: { id: string }, done: () => void) =>
    confirmAct('Διαγραφή κριτικής', 'Η κριτική σβήνεται και ο μέσος όρος του καταστήματος ξαναϋπολογίζεται.', 'Διαγραφή', () => rpc('admin_delete_review', { p_id: r.id }), done),
  cancelDeletion: (u: { id: string; name?: string; email?: string }, done: () => void) =>
    confirmAct('Ακύρωση αίτησης', `Ο λογαριασμός ${u.name || u.email} δεν θα διαγραφεί.`, 'Ακύρωση αίτησης', () => rpc('admin_cancel_deletion', { p_user: u.id }), done),
};

/* ---------- μορφοποίηση ---------- */
const M = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'];
export const longDate = (t?: string | null) => { if (!t) return '–'; const d = new Date(t.length <= 10 ? t + 'T00:00' : t); return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; };
export const short = (t?: string | null) => { if (!t) return ''; const d = new Date(t.length <= 10 ? t + 'T00:00' : t); return `${d.getDate()}/${d.getMonth() + 1}`; };
export const ago = (t?: string | null) => {
  if (!t) return '';
  const days = Math.floor((Date.now() - new Date(t).getTime()) / 864e5);
  return days <= 0 ? 'σήμερα' : days === 1 ? 'χθες' : days < 30 ? `${days} μέρες` : short(t);
};
export const daysLeft = (t?: string | null) => (t ? Math.max(0, Math.ceil((new Date(t).getTime() - Date.now()) / 864e5)) : 0);
export const STATUS: Record<string, { label: string; tone: 'ok' | 'bad' | 'mute' | 'accent' }> = {
  booked: { label: 'Κλεισμένη', tone: 'accent' }, attended: { label: 'Ήρθε', tone: 'ok' },
  no_show: { label: 'Δεν ήρθε', tone: 'bad' }, cancelled: { label: 'Ακυρώθηκε', tone: 'mute' },
};
export const nameOf = (u: { name?: string | null; email?: string | null } | null | undefined) => u?.name || u?.email || 'Χωρίς όνομα';
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
/* Οι βαθμολογίες (κλάδος vathmologies, βάση 007) δεν έχουν μπει ακόμα στην εφαρμογή: μέχρι τότε το admin δεν δείχνει
   ενότητα, δείκτη ή κουτιά βαθμολογιών, που θα ήταν πάντα άδεια (έλεγχος 2026-11-18). Όταν μπουν στο main, γίνεται true. */
export const RATINGS = false;
export const rating = (v: any) => (v == null || v === '' ? '–' : Number(v).toFixed(1).replace('.', ','));
