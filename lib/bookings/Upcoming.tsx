import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { Photo, Scrim } from '../Photo';
import { C, Icon, alpha, fmtLong, s } from '../ui';
import { type Biz, type Booking, type BookingsData, countdown } from './data';
import { BookingRow } from './cards';
import { BizLogo, CancelBtn } from './parts';

/* Τα επερχόμενα ραντεβού: το επόμενο μεγάλο, με τη φωτογραφία του καταστήματος και αντίστροφη μέτρηση,
   τα υπόλοιπα σε κάρτες κράτησης (οι ίδιες με το κατάστημα, lib/bookings/cards). */
export default function Upcoming({ D }: { D: BookingsData }) {
  const [next, ...rest] = D.upcoming;
  return <>
    <Hero b={next} biz={D.biz[next.business_id]} color={D.color(next)} onOpen={() => D.open(next)} onCancel={() => D.cancel(next)} />
    {rest.length > 0 && <>
      <View style={[s.row, { marginTop: 10 }]}>
        <Text style={[s.h, { flex: 1 }]}>Προγραμματισμένα</Text>
        <Text style={{ color: C.mute, fontWeight: '600' }}>{rest.length}</Text>
      </View>
      {rest.map((b) => <BookingRow key={b.id} b={b} color={D.color(b)} store={b.business} onOpen={() => D.open(b)} onCancel={() => D.cancel(b)} />)}
    </>}
  </>;
}

/* Η επόμενη κράτηση σε μεγάλη κάρτα. Μέσα στο κατάστημα δεν ανοίγει πουθενά (onOpen κενό). */
export function Hero({ b, biz, color: c, onOpen, onCancel }: { b: Booking; biz?: Biz | any; color: string; onOpen?: () => void; onCancel: () => void }) {
  return (
    <Pressable onPress={onOpen} disabled={!onOpen} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <View style={{ borderRadius: 26, overflow: 'hidden', backgroundColor: c, boxShadow: `0px 14px 30px ${alpha(c, 0.35)}` }}>
        <View style={{ height: 88 }}>
          <Photo uri={biz?.cover_url} color={c} />
          <Scrim strength={0.75} />
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
