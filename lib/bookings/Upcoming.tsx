import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { Photo, Scrim } from '../Photo';
import { C, Icon, alpha, fmtLong, s } from '../ui';
import { type Biz, type Booking, type BookingsData, countdown } from './data';
import { BizLogo, CancelBtn } from './parts';

/* Τα επερχόμενα ραντεβού: κάθε κράτηση σε κάρτα με το μπάνερ του καταστήματός της (πιο απλή από τη μεγάλη Hero),
   η πιο κοντινή πρώτη. Το Hero μένει για τη σελίδα του καταστήματος. */
export default function Upcoming({ D }: { D: BookingsData }) {
  return <>{D.upcoming.map((b) => (
    <BannerCard key={b.id} b={b} biz={D.biz[b.business_id]} color={D.color(b)} onOpen={() => D.open(b)} onCancel={() => D.cancel(b)} />
  ))}</>;
}

/* Κάρτα κράτησης, μίνιμαλ πλαίσιο: αριστερά το λογότυπο του καταστήματος, δεξιά όνομα, μέρα · ώρα, υπηρεσία, και Ακύρωση. */
export function BannerCard({ b, biz, color: c, onOpen, onCancel }: { b: Booking; biz?: Biz | any; color: string; onOpen?: () => void; onCancel: () => void }) {
  return (
    <Pressable onPress={onOpen} disabled={!onOpen}
      style={({ pressed }) => [s.row, { gap: 14, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.soft : C.bg }]}>
      <BizLogo biz={biz} name={b.business} color={c} size={56} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{b.business}</Text>
        <Text style={{ color: C.text, fontSize: 14.5 }} numberOfLines={1}>{fmtLong(b.date)} · {b.time}</Text>
        <Text style={{ color: C.mute, fontSize: 13.5 }} numberOfLines={1}>{b.service} · {countdown(b)}</Text>
      </View>
      <View style={{ alignSelf: 'center' }}><CancelBtn onPress={onCancel} /></View>
    </Pressable>
  );
}

/* Η επόμενη κράτηση σε μεγάλη κάρτα. Μέσα στο κατάστημα δεν ανοίγει πουθενά (onOpen κενό). */
export function Hero({ b, biz, color: c, onOpen, onCancel }: { b: Booking; biz?: Biz | any; color: string; onOpen?: () => void; onCancel: () => void }) {
  return (
    <Pressable onPress={onOpen} disabled={!onOpen} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <View style={{ borderRadius: 26, overflow: 'hidden', backgroundColor: c, boxShadow: `0px 14px 30px ${alpha(c, 0.35)}` }}>
        <View style={{ height: 88 }}>
          <Photo uri={biz?.cover_url} color={c} />
          <Scrim strength={0.75} photo={biz?.cover_url} />
          <View style={{ position: 'absolute', top: 8, right: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
            <Text style={{ color: '#000000', fontWeight: '800', fontSize: 13 }}>⏱ {countdown(b)}</Text>
          </View>
          <View style={{ position: 'absolute', left: 14, right: 14, bottom: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <BizLogo biz={biz} name={b.business} color={c} size={34} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 17, letterSpacing: -0.4 }} numberOfLines={1}>{b.business}</Text>
              <Text style={{ color: '#ffffff', opacity: 0.9, fontSize: 15 }} numberOfLines={1}>{b.service}</Text>
            </View>
          </View>
        </View>
        <View style={{ backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
          <View style={[s.row, { gap: 10 }]}>
            <Fact icon="calendar" text={fmtLong(b.date)} color={c} />
            <Fact icon="clock" text={b.time} color={c} />
          </View>
          <View style={[s.row, { gap: 6 }]}>
            {!!b.address && <Icon name="pin" size={15} color={C.mute} />}
            <Text style={{ color: C.mute, fontSize: 14, flex: 1 }} numberOfLines={1}>{b.address ?? ''}</Text>
            <CancelBtn onPress={onCancel} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const Fact = ({ icon, text, color }: { icon: 'calendar' | 'clock'; text: string; color: string }) => (
  <View style={[s.row, { gap: 7, flex: 1, backgroundColor: alpha(color, 0.1), borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 }]}>
    <Icon name={icon} size={16} color={color} />
    <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{text}</Text>
  </View>
);
