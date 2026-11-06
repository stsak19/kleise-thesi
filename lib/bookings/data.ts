import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { rpc, sb } from '../supabase';
import { styleOf } from '../presets';
import { say } from '../alert';
import { C, fmtDay, iso } from '../ui';
import { useAuth } from '../auth';

export type Booking = { id: string; date: string; time: string; status: string; service: string; service_id: string; business: string; business_id: string; address?: string | null };
export type Biz = { id: string; name: string; category: string; city?: string; address?: string | null; logo_url?: string | null; cover_url?: string | null; color: string };

/* Όλα όσα χρειάζεται η οθόνη «Κρατήσεις»: κρατήσεις, αναμονή, πακέτα, ειδοποιήσεις και τα καταστήματα. */
export function useMyBookings() {
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [biz, setBiz] = useState<Record<string, Biz>>({});
  const [loading, setLoading] = useState(false);
  const signedIn = !!useAuth().session;

  const load = useCallback(async () => {
    if (!signedIn) return; // επισκέπτης της ιστοσελίδας: δεν έχει κρατήσεις
    setLoading(true);
    const [m, n] = await Promise.all([rpc('my_bookings'), sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)]);
    setD(m); setNotes(n.data ?? []); setLoading(false);
    sb.from('notifications').update({ read: true }).eq('read', false).then(() => {});
    const ids = [...new Set([...((m?.bookings ?? []) as any[]), ...((m?.memberships ?? []) as any[])].map((b) => b.business_id).filter(Boolean))];
    if (ids.length) {
      const { data } = await sb.from('businesses').select('*').in('id', ids);
      setBiz(Object.fromEntries((data ?? []).map((x: any) => [x.id, { ...x, color: styleOf(x).color }])));
    }
  }, [signedIn]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = iso(new Date());
  const all: Booking[] = d?.bookings ?? [];
  const upcoming = all.filter((b) => b.status === 'booked' && b.date >= today);
  const past = all.filter((b) => !(b.status === 'booked' && b.date >= today)).reverse();
  const waitlist: any[] = d?.waitlist ?? [];
  const packs: any[] = (d?.memberships ?? []).filter((m: any) => m.expires || m.status === 'pending');

  const color = (b: { business_id?: string }) => (b.business_id && biz[b.business_id]?.color) || C.tint;
  const open = (b: { business_id?: string }) => { if (b.business_id) router.push(`/store/${b.business_id}`); };
  const cancel = (b: Booking) => say('Ακύρωση κράτησης', `${b.business} · ${fmtDay(b.date)} ${b.time}`, [
    { text: 'Όχι' },
    { text: 'Ακύρωση', style: 'destructive', onPress: async () => { const r = await rpc('cancel_booking', { p_booking: b.id }); if (!r.ok) say(r.error); load(); } },
  ]);

  const leave = (w: { service_id: string; date: string; time: string }) => rpc('leave_waitlist', { p_service: w.service_id, p_date: w.date, p_time: String(w.time).slice(0, 5) + ':00' })
    .then((r: any) => { if (r && r.ok === false) say(r.error); load(); });

  return { ready: !!d, leave, loading, load, notes, biz, upcoming, past, waitlist, packs, color, open, cancel, find: () => router.navigate('/') };
}
export type BookingsData = ReturnType<typeof useMyBookings>;

/* Πόσο απέχει μια μέρα από σήμερα: «Σήμερα», «Αύριο», «Σε 3 μέρες», «Σε 2 εβδομάδες». */
export function relDay(date: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.round((new Date(date + 'T00:00').getTime() - t.getTime()) / 864e5);
  if (n <= 0) return 'Σήμερα';
  if (n === 1) return 'Αύριο';
  if (n < 14) return `Σε ${n} μέρες`;
  const w = Math.round(n / 7);
  return w < 5 ? `Σε ${w} εβδομάδες` : `Σε ${Math.round(n / 30)} μήνες`;
}
/* Για σημερινό ραντεβού: «σε 2 ώρες» / «σε 40'». */
export function relTime(date: string, time: string) {
  const ms = new Date(`${date}T${time}`).getTime() - Date.now();
  if (ms < 0) return 'Τώρα';
  const min = Math.round(ms / 60000);
  return min < 60 ? `Σε ${min}'` : `Σε ${Math.round(min / 60)} ${Math.round(min / 60) === 1 ? 'ώρα' : 'ώρες'}`;
}
export const countdown = (b: Booking) => (b.date === iso(new Date()) ? relTime(b.date, b.time) : relDay(b.date));
