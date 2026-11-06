import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { C, Icon, Pill, alpha, catLabel, fmtDay, iso, s, shadow } from '../ui';
import { type Biz, countdown } from './data';
import { BizLogo, CancelBtn, DateBlock } from './parts';

/* Οι κάρτες κράτησης, αναμονής και πακέτου. Τις ίδιες ακριβώς χρησιμοποιούν η γενική λίστα (Κρατήσεις / Πακέτα, όλα τα
   καταστήματα μαζί) και η «εφαρμογή» του καταστήματος (μόνο τα δικά του), ώστε οι δύο οθόνες να μοιάζουν.
   Το `store` δίνεται μόνο στη γενική λίστα: μέσα στο κατάστημα το όνομά του δεν χρειάζεται. */

type B = { id: string; date: string; time: string; service: string; business?: string };

/* Μία επερχόμενη κράτηση: ημερομηνία, ώρα, υπηρεσία (και κατάστημα), πόσο απέχει, ακύρωση. */
export function BookingRow({ b, color, store, onOpen, onCancel }: { b: B; color: string; store?: string; onOpen?: () => void; onCancel?: () => void }) {
  return (
    <Pressable onPress={onOpen} disabled={!onOpen} style={({ pressed }) => [s.card, shadow(1), s.row,
      { gap: 12, padding: 12, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <DateBlock date={b.date} color={color} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <View style={[s.row, { gap: 8, alignItems: 'baseline' }]}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 18, letterSpacing: -0.4 }}>{String(b.time).slice(0, 5)}</Text>
          <Text style={{ color: C.mute, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{countdown(b as any)}</Text>
        </View>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{store ? `${store} · ${b.service}` : b.service}</Text>
      </View>
      {!!onCancel && <View style={{ alignSelf: 'center' }}><CancelBtn onPress={onCancel} /></View>}
    </Pressable>
  );
}

/* Δήλωση ενδιαφέροντος (αναμονή) για μια γεμάτη ώρα. */
export function WaitRow({ w, store, onLeave }: { w: B; store?: string; onLeave?: () => void }) {
  return (
    <View style={[s.card, shadow(1), s.row, { gap: 12, padding: 12 }]}>
      <DateBlock date={w.date} color={C.mute} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <View style={[s.row, { gap: 8, alignItems: 'baseline' }]}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 18, letterSpacing: -0.4 }}>{String(w.time).slice(0, 5)}</Text>
          <Pill text="Αναμονή" tone="accent" />
        </View>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{store ? `${store} · ${w.service}` : w.service}</Text>
        <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={2}>Αν ελευθερωθεί θέση, σου κλείνεται αυτόματα.</Text>
      </View>
      {!!onLeave && (
        <Pressable onPress={onLeave} hitSlop={8} style={({ pressed }) => ({ alignSelf: 'center', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: pressed ? C.line : C.soft })}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>Απόσυρση</Text>
        </Pressable>
      )}
    </View>
  );
}

/* Υπόλοιπο ενός πακέτου: όσα απομένουν και το σύνολο της περιόδου (απομένουν + όσα χρησιμοποιήθηκαν από την αρχή του). */
export type PackInfo = { left: number; total: number | null; expires: string | null; pending: boolean };
export function packInfo(m: any, biz: any, bookings: { business_id?: string; status: string; date: string }[]): PackInfo {
  const left = m.credits ?? 0;
  let since: string | null = null;
  if (m.expires) { const d = new Date(m.expires + 'T00:00'); d.setDate(d.getDate() - (biz?.package_days ?? 30)); since = iso(d); }
  const used = bookings.filter((b) => (!b.business_id || b.business_id === m.business_id) && b.status !== 'cancelled' && (!since || b.date >= since)).length;
  return { left, total: m.expires ? Math.max(left + used, left, 1) : null, expires: m.expires ?? null, pending: m.status === 'pending' };
}

/* Κάρτα πακέτου: χρώμα και λογότυπο του καταστήματος, κρατήσεις που απομένουν, μπάρα προόδου, λήξη. */
export function PackCard({ name, biz, color, p, onPress }: { name: string; biz?: Biz | any; color: string; p: PackInfo; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.card, shadow(1),
      { padding: 0, gap: 0, overflow: 'hidden', transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <View style={{ height: 6, backgroundColor: color }} />
      <View style={[s.row, { gap: 12, padding: 14, paddingBottom: 10 }]}>
        <BizLogo biz={biz} name={name} color={color} />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{name}</Text>
          {!!biz?.category && <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{catLabel(biz.category)}</Text>}
        </View>
        {p.pending ? <Pill text="Σε αναμονή" tone="accent" /> : (
          <View style={{ alignItems: 'center', minWidth: 54, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 13, backgroundColor: alpha(color, 0.12) }}>
            <Text style={{ color, fontWeight: '900', fontSize: 20, letterSpacing: -0.5 }}>{p.left}{p.total ? <Text style={{ color, fontWeight: '700', fontSize: 13, opacity: 0.7 }}>/{p.total}</Text> : null}</Text>
            <Text style={{ color, fontWeight: '700', fontSize: 10 }}>{p.left === 1 ? 'ΚΡΑΤΗΣΗ' : 'ΚΡΑΤΗΣΕΙΣ'}</Text>
          </View>
        )}
      </View>
      {!p.pending && !!p.total && (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: alpha(color, 0.14), marginHorizontal: 14, marginBottom: 10 }}>
          <View style={{ width: `${Math.min(100, (100 * p.left) / p.total)}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
        </View>
      )}
      <View style={[s.row, { gap: 6, paddingHorizontal: 14, paddingBottom: 14 }]}>
        <Icon name="clock" size={15} color={C.mute} />
        <Text style={{ color: C.mute, fontSize: 14, flex: 1 }}>{p.pending ? 'Περιμένει έγκριση από το κατάστημα' : p.expires ? `Ισχύει έως ${fmtDay(p.expires)}` : 'Χωρίς λήξη'}</Text>
        {!!onPress && <Icon name="chevron" size={14} color={C.mute} />}
      </View>
    </Pressable>
  );
}

/* Σύνδεσμος από το κατάστημα προς τη γενική λίστα (όλα τα καταστήματα). */
export function AllLink({ text, onPress, icon = 'calendar' }: { text: string; onPress: () => void; icon?: 'calendar' | 'pack' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link"
      style={({ pressed, hovered }: any) => [s.row, { gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line,
        backgroundColor: pressed || hovered ? C.soft : 'transparent' }]}>
      <Icon name={icon} size={17} color={C.mute} />
      <Text style={{ flex: 1, color: C.text, fontWeight: '700', fontSize: 14 }}>{text}</Text>
      <Icon name="chevron" size={14} color={C.mute} />
    </Pressable>
  );
}
