import { Pressable, Text, View } from 'react-native';
import { C, Icon, Pill, alpha, fmtLong, s, shadow } from '../../ui';
import { type Booking, type BookingsData, countdown, relDay } from '../data';
import { BizLogo, CancelBtn } from '../parts';

/* Εκδοχή 1 · Χρονολόγιο: τα ραντεβού σε κάθετη γραμμή, χωρισμένα ανά μέρα («Αύριο», «Σε 3 μέρες»). */
export default function Timeline({ D }: { D: BookingsData }) {
  const days = new Map<string, Booking[]>();
  D.upcoming.forEach((b) => days.set(b.date, [...(days.get(b.date) ?? []), b]));
  let first = true;
  return <>
    {[...days.entries()].map(([date, items]) => (
      <View key={date} style={{ gap: 10 }}>
        <View style={[s.row, { gap: 8, marginTop: 6 }]}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 18, letterSpacing: -0.3 }}>{relDay(date)}</Text>
          <Text style={{ color: C.mute, fontWeight: '600', fontSize: 14 }}>{fmtLong(date)}</Text>
        </View>
        {items.map((b) => { const c = D.color(b), isNext = first; first = false; return (
          <View key={b.id} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 50, alignItems: 'flex-end', paddingTop: 14 }}>
              <Text style={{ color: C.text, fontWeight: '900', fontSize: 16 }}>{b.time}</Text>
            </View>
            <View style={{ width: 14, alignItems: 'center' }}>
              <View style={{ position: 'absolute', top: 0, bottom: -10, width: 2, backgroundColor: alpha(C.mute, 0.18) }} />
              <View style={{ marginTop: 17, width: 14, height: 14, borderRadius: 7, backgroundColor: c, borderWidth: 3, borderColor: C.bg }} />
            </View>
            <Pressable onPress={() => D.open(b)} style={({ pressed }) => [{ flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 14, gap: 10,
              borderLeftWidth: 4, borderLeftColor: c, transform: [{ scale: pressed ? 0.985 : 1 }] }, isNext ? shadow(2) : shadow(1)]}>
              <View style={[s.row, { gap: 10 }]}>
                <BizLogo biz={D.biz[b.business_id]} name={b.business} color={c} size={38} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{b.business}</Text>
                  <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{b.service}</Text>
                </View>
                {isNext && <Pill text={countdown(b)} color={c} />}
              </View>
              {!!b.address && (
                <View style={[s.row, { gap: 6 }]}>
                  <Icon name="pin" size={13} color={C.mute} />
                  <Text style={{ color: C.mute, fontSize: 13, flex: 1 }} numberOfLines={1}>{b.address}</Text>
                </View>
              )}
              <CancelBtn onPress={() => D.cancel(b)} />
            </Pressable>
          </View>); })}
      </View>
    ))}
  </>;
}
