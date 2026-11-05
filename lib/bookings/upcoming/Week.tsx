import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { C, DAYS, Icon, MONTHS, alpha, fmtLong, iso, onColor, s, shadow } from '../../ui';
import { type Booking, type BookingsData, relDay } from '../data';
import { BizLogo, CancelBtn } from '../parts';

/* Εκδοχή 3 · Ημερολόγιο: λωρίδα ημερών με τελίτσες όπου έχεις ραντεβού·
   πατάς μια μέρα και βλέπεις τι έχεις τότε. Από κάτω, μια σύντομη λίστα με όλα. */
export default function Week({ D }: { D: BookingsData }) {
  const by = new Map<string, Booking[]>();
  D.upcoming.forEach((b) => by.set(b.date, [...(by.get(b.date) ?? []), b]));
  const last = D.upcoming[D.upcoming.length - 1]?.date ?? iso(new Date());
  const days: string[] = [];
  for (let d = new Date(); iso(d) <= last || days.length < 14; d.setDate(d.getDate() + 1)) days.push(iso(d));
  const [sel, setSel] = useState(D.upcoming[0]?.date ?? days[0]);
  const items = by.get(sel) ?? [];
  const nextAfter = D.upcoming.find((b) => b.date > sel);

  return <>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 6 }}>
      {days.map((d) => {
        const dd = new Date(d + 'T00:00'), on = d === sel, list = by.get(d) ?? [];
        return (
          <Pressable key={d} onPress={() => setSel(d)}
            style={({ pressed }) => [{ width: 54, paddingVertical: 10, borderRadius: 16, alignItems: 'center', gap: 2 },
              on ? { backgroundColor: C.accent, ...shadow(2) } : { backgroundColor: C.soft }, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Text style={{ color: on ? C.onAccent : C.mute, fontSize: 12, fontWeight: '700' }}>{d === days[0] ? 'Σήμ.' : DAYS[dd.getDay()]}</Text>
            <Text style={{ color: on ? C.onAccent : C.text, fontWeight: '900', fontSize: 19 }}>{dd.getDate()}</Text>
            <View style={{ flexDirection: 'row', gap: 3, height: 6, marginTop: 2 }}>
              {list.slice(0, 3).map((b) => <View key={b.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? C.onAccent : D.color(b) }} />)}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>

    <View style={[s.row, { gap: 8, marginTop: 4 }]}>
      <Text style={{ color: C.text, fontWeight: '900', fontSize: 18 }}>{relDay(sel)}</Text>
      <Text style={{ color: C.mute, fontWeight: '600', fontSize: 14, flex: 1 }}>{fmtLong(sel)}</Text>
      <Text style={{ color: C.mute, fontWeight: '600', fontSize: 13 }}>{items.length ? `${items.length} ραντεβού` : ''}</Text>
    </View>

    {items.length === 0 ? (
      <View style={{ backgroundColor: C.soft, borderRadius: 18, padding: 18, alignItems: 'center', gap: 6 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>Ελεύθερη μέρα 🌿</Text>
        {nextAfter && (
          <Pressable onPress={() => setSel(nextAfter.date)} hitSlop={6}>
            <Text style={{ color: C.accent, fontWeight: '700' }}>Επόμενο: {fmtLong(nextAfter.date)} ›</Text>
          </Pressable>
        )}
      </View>
    ) : items.map((b) => { const c = D.color(b); return (
      <Pressable key={b.id} onPress={() => D.open(b)} style={({ pressed }) => [{ flexDirection: 'row', borderRadius: 20, backgroundColor: C.card, overflow: 'hidden',
        transform: [{ scale: pressed ? 0.985 : 1 }] }, shadow(1)]}>
        <View style={{ width: 82, backgroundColor: c, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 16 }}>
          <Icon name="clock" size={16} color={onColor(c)} />
          <Text style={{ color: onColor(c), fontWeight: '900', fontSize: 19 }}>{b.time}</Text>
        </View>
        <View style={{ flex: 1, padding: 14, gap: 8 }}>
          <View style={[s.row, { gap: 10 }]}>
            <BizLogo biz={D.biz[b.business_id]} name={b.business} color={c} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{b.business}</Text>
              <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{b.service}</Text>
            </View>
          </View>
          {!!b.address && <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>📍 {b.address}</Text>}
          <CancelBtn onPress={() => D.cancel(b)} />
        </View>
      </Pressable>); })}

    {D.upcoming.length > 1 && <>
      <Text style={{ color: C.mute, fontWeight: '700', fontSize: 13, marginTop: 10 }}>ΟΛΑ ΤΑ ΕΠΟΜΕΝΑ</Text>
      <View style={{ backgroundColor: C.card, borderRadius: 18, overflow: 'hidden', ...shadow(1) }}>
        {D.upcoming.map((b, i) => { const dd = new Date(b.date + 'T00:00'), on = b.date === sel; return (
          <Pressable key={b.id} onPress={() => setSel(b.date)} style={({ pressed }) => [s.row, { gap: 12, paddingVertical: 11, paddingHorizontal: 14,
            backgroundColor: on ? alpha(C.accent, 0.07) : pressed ? C.soft : 'transparent' }, i < D.upcoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: alpha(C.mute, 0.1) }]}>
            <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: D.color(b) }} />
            <Text style={{ color: C.text, fontWeight: '800', width: 74 }}>{DAYS[dd.getDay()]} {dd.getDate()} {MONTHS[dd.getMonth()]}</Text>
            <Text style={{ color: C.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>{b.business}</Text>
            <Text style={{ color: C.mute, fontWeight: '700' }}>{b.time}</Text>
          </Pressable>); })}
      </View>
    </>}
  </>;
}
