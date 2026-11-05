import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Photo } from '../Photo';
import { Btn, C, DAYS, Group, Icon, IconBubble, MONTHS, Pill, Row, Section, T, type Tone, alpha, catLabel, fmtDay, fmtLong, s, shadow } from '../ui';
import type { Biz, Booking, BookingsData } from './data';

/* Μπλοκ ημερομηνίας: μέρα, αριθμός, μήνας. */
export const DateBlock = ({ date, color }: { date: string; color: string }) => {
  const d = new Date(date + 'T00:00');
  return (
    <View style={{ width: 48, paddingVertical: 6, borderRadius: 13, alignItems: 'center', backgroundColor: alpha(color, 0.12) }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{DAYS[d.getDay()]}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }}>{d.getDate()}</Text>
      <Text style={{ color, fontSize: 10, fontWeight: '600', opacity: 0.85 }}>{MONTHS[d.getMonth()]}</Text>
    </View>
  );
};

/* Λογότυπο καταστήματος (ή το αρχικό του γράμμα). */
export const BizLogo = ({ biz, name, color, size = 44 }: { biz?: Biz; name: string; color: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden', backgroundColor: '#ffffff' }}>
    <Photo uri={biz?.logo_url} color={color} letter={name.slice(0, 1)} style={{ borderRadius: size * 0.28 }} />
  </View>
);

/* Μικρό κουμπί ακύρωσης. */
export const CancelBtn = ({ onPress }: { onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={8}
    style={({ pressed }) => ({ alignSelf: 'flex-start', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: alpha(C.bad, pressed ? 0.16 : 0.09) })}>
    <Text style={{ color: C.bad, fontWeight: '700', fontSize: 13 }}>Ακύρωση</Text>
  </Pressable>
);

/* Δύο καρτέλες: Επερχόμενες / Ιστορικό. */
export function Segmented<K extends string>({ value, onChange, items }: { value: K; onChange: (k: K) => void; items: { key: K; label: string; count?: number }[] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4, gap: 4 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[{ flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
              on && { backgroundColor: C.bg, ...shadow(1) }]}>
            <Text style={{ color: on ? C.text : C.mute, fontWeight: '800', fontSize: 14 }}>{it.label}</Text>
            {it.count != null && it.count > 0 && (
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? C.accent : alpha(C.mute, 0.18) }}>
                <Text style={{ color: on ? C.onAccent : C.mute, fontWeight: '800', fontSize: 11 }}>{it.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* Λίστα ενδιαφέροντος (κάτω από τα επερχόμενα). Τα πακέτα έχουν δική τους καρτέλα. */
export const Extras = ({ D }: { D: BookingsData }) => <>
  {D.waitlist.length > 0 && <>
    <Section title="Σε αναμονή" sub="Αν ελευθερωθεί θέση, σου κλείνεται αυτόματα." />
    <Group>
      {D.waitlist.map((w: any, i: number) => (
        <Row key={w.id} icon="bell" title={`${w.business} · ${w.service}`} sub={`${fmtLong(w.date)} · ${w.time}`} last={i === D.waitlist.length - 1}
          right={<Pill text="Αναμονή" tone="accent" />} />
      ))}
    </Group>
  </>}
</>;

/* ---------- Ιστορικό: αρχείο ανά κατάστημα ---------- */
const STATUS: Record<string, [string, Tone]> = {
  cancelled: ['Ακυρώθηκε', 'mute'], attended: ['Ήρθες', 'ok'], no_show: ['Δεν ήρθες', 'bad'], booked: ['Έγινε', 'ok'],
};
const visits = (n: number) => `${n} ${n === 1 ? 'κράτηση' : 'κρατήσεις'}`;

/* Ένας «φάκελος» καταστήματος: κεφαλίδα με λογότυπο και σύνοψη, ανοίγει και δείχνει όλες τις κρατήσεις εκεί. */
function Folder({ items, D, start }: { items: Booking[]; D: BookingsData; start?: boolean }) {
  const [open, setOpen] = useState(!!start);
  const b0 = items[0], biz = D.biz[b0.business_id], c = D.color(b0);
  const came = items.filter((b) => b.status === 'attended' || b.status === 'booked').length;
  const off = items.filter((b) => b.status === 'cancelled').length;
  const miss = items.filter((b) => b.status === 'no_show').length;
  return (
    <View style={[s.card, shadow(1), { padding: 0, gap: 0, overflow: 'hidden' }]}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={({ pressed }) => [s.row, { gap: 12, padding: 14, backgroundColor: pressed ? C.soft : 'transparent' }]}>
        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c, marginVertical: 2 }} />
        <BizLogo biz={biz} name={b0.business} color={c} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{b0.business}</Text>
          {!!biz && <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{catLabel(biz.category)}</Text>}
          <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{visits(items.length)} · τελευταία {fmtDay(b0.date)}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}><Icon name="chevron" size={16} color={C.mute} /></View>
      </Pressable>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 14, paddingBottom: 14, gap: 4 }}>
          <View style={[s.row, { flexWrap: 'wrap', gap: 6, paddingVertical: 10 }]}>
            {came > 0 && <Pill text={`Ήρθες ${came}`} tone="ok" />}
            {off > 0 && <Pill text={`Ακυρώσεις ${off}`} />}
            {miss > 0 && <Pill text={`Δεν ήρθες ${miss}`} tone="bad" />}
          </View>
          {items.map((b, i) => { const [t, tone] = STATUS[b.status] ?? (['', 'mute'] as [string, Tone]); return (
            <View key={b.id} style={[s.row, { gap: 12, paddingVertical: 9 }, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: alpha(C.mute, 0.12) }]}>
              <DateBlock date={b.date} color={b.status === 'cancelled' ? C.mute : c} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, textDecorationLine: b.status === 'cancelled' ? 'line-through' : 'none' }} numberOfLines={1}>{b.service}</Text>
                <Text style={{ color: C.mute, fontSize: 13 }}>{b.time}</Text>
              </View>
              <View><Pill text={t} tone={tone} /></View>
            </View>); })}
          <Btn kind="tint" size="sm" color={c} icon="calendar" title="Κλείσε ξανά εδώ" onPress={() => D.open(b0)} style={{ marginTop: 8 }} />
        </View>
      )}
    </View>
  );
}

/* Το ιστορικό, οργανωμένο ανά κατάστημα (πιο πρόσφατη επίσκεψη πρώτη). */
export function History({ D }: { D: BookingsData }) {
  const groups = new Map<string, Booking[]>();
  D.past.forEach((b) => { const k = b.business_id || b.business; groups.set(k, [...(groups.get(k) ?? []), b]); });
  const list = [...groups.values()];
  const came = D.past.filter((b) => b.status === 'attended').length;
  if (!list.length) return (
    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
      <IconBubble name="clock" size={64} />
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, marginTop: 6 }}>Δεν έχεις ιστορικό ακόμα</Text>
      <T mute style={{ textAlign: 'center' }}>Εδώ θα μαζεύονται οι κρατήσεις σου, σε φάκελο για κάθε κατάστημα.</T>
    </View>
  );
  return <>
    <View style={[s.row, { gap: 10 }]}>
      {[[String(list.length), list.length === 1 ? 'Κατάστημα' : 'Καταστήματα'], [String(came), 'Επισκέψεις'], [String(D.past.length), 'Κρατήσεις']].map(([n, l]) => (
        <View key={l} style={{ flex: 1, backgroundColor: C.soft, borderRadius: 16, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 22 }}>{n}</Text>
          <Text style={{ color: C.mute, fontWeight: '600', fontSize: 12 }}>{l}</Text>
        </View>
      ))}
    </View>
    <Text style={{ color: C.mute, fontWeight: '700', fontSize: 13, marginTop: 6 }}>ΑΝΑ ΚΑΤΑΣΤΗΜΑ</Text>
    {list.map((items, i) => <Folder key={items[0].business_id || items[0].business} items={items} D={D} start={i === 0} />)}
  </>;
}
