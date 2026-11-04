import { styleOf } from '../../lib/presets';
import { say } from '../../lib/alert';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { rpc, sb } from '../../lib/supabase';
import { C, Card, DAYS, Empty, Group, Icon, IconBubble, MONTHS, Pill, Row, ScreenHeader, Section, T, type Tone, alpha, fmtDay, fmtLong, iso, onColor, s, shadow } from '../../lib/ui';

const STATUS: Record<string, [string, Tone]> = {
  cancelled: ['Ακυρώθηκε', 'mute'], attended: ['Ήρθες', 'ok'], no_show: ['Δεν ήρθες', 'bad'], booked: ['Έγινε', 'mute'],
};

/* Μπλοκ ημερομηνίας: μέρα, αριθμός, μήνας. */
const DateBlock = ({ date, color, inverted }: { date: string; color: string; inverted?: boolean }) => {
  const d = new Date(date + 'T00:00');
  const fg = inverted ? onColor(color) : color;
  return (
    <View style={{ width: 62, paddingVertical: 10, borderRadius: 16, alignItems: 'center', backgroundColor: inverted ? 'rgba(255,255,255,0.18)' : alpha(color, 0.12) }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{DAYS[d.getDay()]}</Text>
      <Text style={{ color: fg, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>{d.getDate()}</Text>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '600', opacity: 0.85 }}>{MONTHS[d.getMonth()]}</Text>
    </View>
  );
};

export default function Bookings() {
  const [d, setD] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [m, n] = await Promise.all([rpc('my_bookings'), sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)]);
    setD(m); setNotes(n.data ?? []); setLoading(false);
    sb.from('notifications').update({ read: true }).eq('read', false).then(() => {});
    // Το χρώμα κάθε καταστήματος, για να χρωματιστούν οι κάρτες.
    const ids = [...new Set(((m?.bookings ?? []) as any[]).map((b) => b.business_id).filter(Boolean))];
    if (ids.length) {
      const { data } = await sb.from('businesses').select('*').in('id', ids);
      setColors(Object.fromEntries((data ?? []).map((x: any) => [x.id, styleOf(x).color])));
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const router = useRouter();
  const today = iso(new Date());
  const upcoming = (d?.bookings ?? []).filter((b: any) => b.status === 'booked' && b.date >= today);
  const past = (d?.bookings ?? []).filter((b: any) => !(b.status === 'booked' && b.date >= today)).reverse();
  const waitlist = d?.waitlist ?? [];
  const packs = (d?.memberships ?? []).filter((m: any) => m.expires || m.status === 'pending');
  const col = (b: any) => colors[b.business_id] || C.accent;
  const open = (b: any) => b.business_id && router.push(`/business/${b.business_id}`);

  const cancel = (b: any) => say('Ακύρωση κράτησης', `${b.business} · ${fmtDay(b.date)} ${b.time}`, [
    { text: 'Όχι' },
    { text: 'Ακύρωση', style: 'destructive', onPress: async () => { const r = await rpc('cancel_booking', { p_booking: b.id }); if (!r.ok) say(r.error); load(); } },
  ]);

  const next = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title="Κρατήσεις" sub={upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? 'επερχόμενο ραντεβού' : 'επερχόμενα ραντεβού'}` : undefined} />
      </View>

      {notes.filter((n) => !n.read).map((n) => (
        <View key={n.id} style={[s.row, { gap: 12, alignItems: 'flex-start', backgroundColor: alpha(C.accent, 0.08), borderRadius: 18, padding: 14 }]}>
          <IconBubble name="bell" size={38} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{n.title}</Text>
            <T mute style={{ fontSize: 14 }}>{n.body}</T>
          </View>
        </View>
      ))}

      {d && upcoming.length === 0 && (
        <Card><Empty emoji="📅" title="Καμία επερχόμενη κράτηση" text="Βρες ένα κατάστημα και κλείσε θέση σε λίγα δευτερόλεπτα."
          action="Βρες κατάστημα" onAction={() => router.navigate('/')} /></Card>
      )}

      {/* Το επόμενο ραντεβού, μεγάλο, στο χρώμα του καταστήματος */}
      {next && (() => { const c = col(next), fg = onColor(c); return (
        <Pressable onPress={() => open(next)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
          <View style={{ backgroundColor: c, borderRadius: 24, padding: 18, gap: 14, overflow: 'hidden', boxShadow: `0px 12px 28px ${alpha(c, 0.35)}` }}>
            <View style={{ position: 'absolute', right: -50, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            <Text style={{ color: fg, fontWeight: '700', fontSize: 13, opacity: 0.9 }}>ΕΠΟΜΕΝΟ ΡΑΝΤΕΒΟΥ</Text>
            <View style={[s.row, { gap: 14 }]}>
              <DateBlock date={next.date} color={c} inverted />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: fg, fontWeight: '900', fontSize: 20, letterSpacing: -0.4 }} numberOfLines={1}>{next.business}</Text>
                <Text style={{ color: fg, opacity: 0.9, fontSize: 15 }}>{next.service}</Text>
                <View style={[s.row, { gap: 6, marginTop: 2 }]}>
                  <Icon name="clock" size={15} color={fg} />
                  <Text style={{ color: fg, fontWeight: '800', fontSize: 16 }}>{next.time}</Text>
                </View>
              </View>
            </View>
            {!!next.address && (
              <View style={[s.row, { gap: 6 }]}>
                <Icon name="pin" size={15} color={fg} />
                <Text style={{ color: fg, opacity: 0.9, fontSize: 14, flex: 1 }} numberOfLines={1}>{next.address}</Text>
              </View>
            )}
            <Pressable onPress={() => cancel(next)} style={({ pressed }) => ({ alignSelf: 'flex-start', backgroundColor: pressed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
              borderRadius: 11, paddingVertical: 8, paddingHorizontal: 14 })}>
              <Text style={{ color: fg, fontWeight: '700' }}>Ακύρωση</Text>
            </Pressable>
          </View>
        </Pressable>); })()}

      {rest.length > 0 && <Section title="Επόμενες" />}
      {rest.map((b: any) => { const c = col(b); return (
        <Card key={b.id} onPress={() => open(b)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 }}>
          <DateBlock date={b.date} color={c} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{b.business}</Text>
            <Text style={{ color: C.mute, fontSize: 14 }} numberOfLines={1}>{b.service}</Text>
            <View style={[s.row, { gap: 5, marginTop: 2 }]}>
              <Icon name="clock" size={13} color={c} />
              <Text style={{ color: c, fontWeight: '800' }}>{b.time}</Text>
            </View>
          </View>
          <Pressable onPress={() => cancel(b)} hitSlop={8}
            style={({ pressed }) => ({ backgroundColor: alpha(C.bad, pressed ? 0.16 : 0.09), borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11 })}>
            <Text style={{ color: C.bad, fontWeight: '700', fontSize: 13 }}>Ακύρωση</Text>
          </Pressable>
        </Card>); })}

      {waitlist.length > 0 && <>
        <Section title="Λίστα ενδιαφέροντος" sub="Αν ελευθερωθεί θέση, σου κλείνεται αυτόματα." />
        <Group>
          {waitlist.map((w: any, i: number) => (
            <Row key={w.id} icon="bell" title={`${w.business} · ${w.service}`} sub={`${fmtLong(w.date)} · ${w.time}`} last={i === waitlist.length - 1}
              right={<Pill text="Αναμονή" tone="accent" />} />
          ))}
        </Group>
      </>}

      {packs.length > 0 && <>
        <Section title="Πακέτα" />
        <Group>
          {packs.map((m: any, i: number) => (
            <Row key={m.business_id} icon="store" title={m.business} last={i === packs.length - 1}
              sub={m.status === 'pending' ? 'Περιμένει έγκριση' : `${m.credits} κρατήσεις · έως ${fmtDay(m.expires)}`}
              right={m.status === 'pending' ? <Pill text="Σε αναμονή" tone="accent" /> : <Pill text={`${m.credits}`} tone="ok" />} />
          ))}
        </Group>
      </>}

      {past.length > 0 && <>
        <Section title="Ιστορικό" />
        <Group>
          {past.map((b: any, i: number) => { const [t, tone] = STATUS[b.status] ?? (['', 'mute'] as [string, Tone]); return (
            <Row key={b.id} title={b.business} sub={`${fmtDay(b.date)} · ${b.time} · ${b.service}`} last={i === past.length - 1}
              onPress={b.business_id ? () => open(b) : undefined} right={<Pill text={t} tone={tone} />} />); })}
        </Group>
      </>}
    </ScrollView>
  );
}
