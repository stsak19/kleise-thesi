import { Pressable, Text, View } from 'react-native';
import { C, DAYS, Icon, MONTHS, alpha, onColor, s, shadow } from '../../ui';
import { type Booking, type BookingsData, countdown } from '../data';
import { BizLogo } from '../parts';

/* Εκδοχή 4 · Εισιτήρια: κάθε ραντεβού σαν εισιτήριο με διάτρηση·
   πάνω το κατάστημα, κάτω μέρα και ώρα μεγάλα. Το επόμενο είναι γεμάτο στο χρώμα του καταστήματος. */
export default function Tickets({ D }: { D: BookingsData }) {
  return <>{D.upcoming.map((b, i) => <Ticket key={b.id} b={b} D={D} hot={i === 0} />)}</>;
}

function Ticket({ b, D, hot }: { b: Booking; D: BookingsData; hot: boolean }) {
  const c = D.color(b), dd = new Date(b.date + 'T00:00');
  const bg = hot ? c : C.card, fg = hot ? onColor(c) : C.text, mute = hot ? fg : C.mute;
  const notch = { position: 'absolute' as const, top: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: C.bg };
  return (
    <Pressable onPress={() => D.open(b)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <View style={[{ borderRadius: 22, backgroundColor: bg }, hot ? { boxShadow: `0px 12px 28px ${alpha(c, 0.35)}` } : shadow(1)]}>
        <View style={[s.row, { gap: 12, padding: 16 }]}>
          <BizLogo biz={D.biz[b.business_id]} name={b.business} color={c} size={46} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ color: fg, fontWeight: '900', fontSize: 17, letterSpacing: -0.2 }} numberOfLines={1}>{b.business}</Text>
            <Text style={{ color: mute, opacity: hot ? 0.85 : 1, fontSize: 14 }} numberOfLines={1}>{b.service}</Text>
          </View>
          <View style={{ backgroundColor: hot ? 'rgba(255,255,255,0.22)' : alpha(c, 0.12), borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 }}>
            <Text style={{ color: hot ? fg : c, fontWeight: '800', fontSize: 12 }}>{countdown(b)}</Text>
          </View>
        </View>
        <View>
          <View style={{ marginHorizontal: 18, borderTopWidth: 2, borderStyle: 'dashed', borderColor: hot ? 'rgba(255,255,255,0.35)' : alpha(C.mute, 0.25) }} />
          <View style={[notch, { left: -11 }]} />
          <View style={[notch, { right: -11 }]} />
        </View>
        <View style={[s.row, { padding: 16, gap: 0 }]}>
          <Cell label="ΜΕΡΑ" value={`${DAYS[dd.getDay()]} ${dd.getDate()}`} sub={MONTHS[dd.getMonth()]} fg={fg} mute={mute} />
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: hot ? 'rgba(255,255,255,0.3)' : alpha(C.mute, 0.18), marginHorizontal: 14 }} />
          <Cell label="ΩΡΑ" value={b.time} fg={fg} mute={mute} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => D.cancel(b)} hitSlop={8} accessibilityLabel="Ακύρωση"
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: hot ? `rgba(255,255,255,${pressed ? 0.32 : 0.2})` : alpha(C.bad, pressed ? 0.16 : 0.09) })}>
            <Icon name="close" size={16} color={hot ? fg : C.bad} />
          </Pressable>
        </View>
        {!!b.address && (
          <View style={[s.row, { gap: 6, paddingHorizontal: 16, paddingBottom: 14, marginTop: -4 }]}>
            <Icon name="pin" size={13} color={mute} />
            <Text style={{ color: mute, opacity: hot ? 0.85 : 1, fontSize: 13, flex: 1 }} numberOfLines={1}>{b.address}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const Cell = ({ label, value, sub, fg, mute }: { label: string; value: string; sub?: string; fg: string; mute: string }) => (
  <View style={{ gap: 1 }}>
    <Text style={{ color: mute, opacity: 0.75, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>{label}</Text>
    <View style={[s.row, { gap: 5, alignItems: 'baseline' }]}>
      <Text style={{ color: fg, fontWeight: '900', fontSize: 24, letterSpacing: -0.5 }}>{value}</Text>
      {!!sub && <Text style={{ color: mute, fontWeight: '700', fontSize: 14 }}>{sub}</Text>}
    </View>
  </View>
);
