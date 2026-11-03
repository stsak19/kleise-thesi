import { say, promptText } from '../lib/alert';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { rpc, sb } from '../lib/supabase';
import { Btn, C, Card, H, T, fmtDay, iso, s } from '../lib/ui';

export default function Bookings() {
  const [d, setD] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [m, n] = await Promise.all([rpc('my_bookings'), sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)]);
    setD(m); setNotes(n.data ?? []); setLoading(false);
    sb.from('notifications').update({ read: true }).eq('read', false).then(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  const today = iso(new Date());
  const upcoming = (d?.bookings ?? []).filter((b: any) => b.status === 'booked' && b.date >= today);
  const past = (d?.bookings ?? []).filter((b: any) => !(b.status === 'booked' && b.date >= today)).reverse();

  const cancel = (b: any) => say('Ακύρωση κράτησης', `${b.business} · ${fmtDay(b.date)} ${b.time}`, [
    { text: 'Όχι' },
    { text: 'Ακύρωση', style: 'destructive', onPress: async () => { const r = await rpc('cancel_booking', { p_booking: b.id }); if (!r.ok) say(r.error); load(); } },
  ]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      {notes.filter((n) => !n.read).map((n) => <Card key={n.id} style={{ borderColor: C.accent }}><Text style={{ color: C.text, fontWeight: '700' }}>{n.title}</Text><T>{n.body}</T></Card>)}
      <H>Επερχόμενες</H>
      {upcoming.length === 0 && <T mute>Καμία κράτηση.</T>}
      {upcoming.map((b: any) => (
        <Card key={b.id}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{fmtDay(b.date)} · {b.time}</Text>
          <T>{b.business} — {b.service}</T>
          {!!b.address && <T mute>{b.address}</T>}
          <Btn kind="danger" title="Ακύρωση" onPress={() => cancel(b)} />
        </Card>
      ))}
      {(d?.waitlist ?? []).length > 0 && <H>Λίστα ενδιαφέροντος</H>}
      {(d?.waitlist ?? []).map((w: any) => <Card key={w.id}><T>{fmtDay(w.date)} · {w.time} — {w.business} ({w.service})</T></Card>)}
      {(d?.memberships ?? []).some((m: any) => m.expires || m.status === 'pending') && <H>Πακέτα</H>}
      {(d?.memberships ?? []).filter((m: any) => m.expires || m.status === 'pending').map((m: any) => (
        <Card key={m.business_id}><T>{m.business}: {m.status === 'pending' ? 'περιμένει έγκριση' : `${m.credits} κρατήσεις · έως ${fmtDay(m.expires)}`}</T></Card>
      ))}
      <H>Ιστορικό</H>
      {past.map((b: any) => <T key={b.id} mute>{fmtDay(b.date)} {b.time} · {b.business} · {({ cancelled: 'ακυρώθηκε', attended: 'ήρθες', no_show: 'δεν ήρθες', booked: 'έγινε' } as any)[b.status]}</T>)}
    </ScrollView>
  );
}
