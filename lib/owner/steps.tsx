import { Pressable, Text, View } from 'react-native';
import { C, CATEGORIES, Card, Icon, Input, Toggle, alpha, onColor, s, shadow } from '../ui';
import { screenFor } from '../bizscreen';
import { DAYNAME, Hours, Svc, WEEK, newKey } from './save';

/* Τα κομμάτια του οδηγού «Νέα επιχείρηση»: ένα για κάθε βήμα. */

/* Βήμα 1: πλέγμα με τα είδη επιχείρησης, μεγάλα πλακίδια που πατιούνται εύκολα. */
export function TypeGrid({ value, onPick }: { value: string | null; onPick: (k: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {CATEGORIES.map((c) => {
        const on = value === c.key;
        return (
          <Pressable key={c.key} onPress={() => onPick(c.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={({ pressed }) => [{ flexBasis: '30%', flexGrow: 1, minHeight: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: on ? C.accent : C.soft, transform: [{ scale: pressed ? 0.97 : 1 }] },
              on && { boxShadow: `0px 10px 24px ${alpha(C.accent, 0.35)}` }]}>
            <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
            <Text style={{ fontSize: 12.5, fontWeight: '700', letterSpacing: -0.2, color: on ? C.onAccent : C.text, textAlign: 'center' }} numberOfLines={2}>{c.label}</Text>
            <Text style={{ fontSize: 11, color: on ? alpha(C.onAccent, 0.85) : C.mute }} numberOfLines={1}>{screenFor(c.key).kicker}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* Επιλογή ανάμεσα σε λίγες τιμές (π.χ. 7 / 14 / 30 μέρες). */
export function Choice<T extends string | number>({ label, sub, options, value, onPick }:
  { label: string; sub?: string; options: { v: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{label}</Text>
        {!!sub && <Text style={{ color: C.mute, fontSize: 13 }}>{sub}</Text>}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.v === value;
          return (
            <Pressable key={String(o.v)} onPress={() => onPick(o.v)}
              style={({ pressed }) => [{ paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, backgroundColor: on ? C.accent : C.soft,
                opacity: pressed ? 0.85 : 1 }]}>
              <Text style={{ color: on ? C.onAccent : C.text, fontWeight: '700', fontSize: 14 }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* Γραμμή με διακόπτη μέσα σε κάρτα. */
export const ToggleCard = ({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) => (
  <Card style={[s.row, { gap: 14, padding: 16 }]}>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
      <Text style={{ color: C.mute, fontSize: 13, lineHeight: 18 }}>{sub}</Text>
    </View>
    <Toggle value={value} onChange={onChange} />
  </Card>
);

/* Βήμα υπηρεσιών: κάρτες με όνομα, λεπτά, τιμή και θέσεις. */
export function ServicesEditor({ svcs, setSvcs, category }: { svcs: Svc[]; setSvcs: (v: Svc[]) => void; category: string }) {
  const unit = screenFor(category).services.toLowerCase();
  return (
    <View style={{ gap: 12 }}>
      {svcs.map((x, i) => {
        const up = (k: keyof Svc, v: string) => setSvcs(svcs.map((y, j) => (j === i ? { ...y, [k]: v } : y)));
        return (
          <Card key={x.key} style={{ gap: 12 }}>
            <View style={[s.row, { gap: 10 }]}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: alpha(C.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.accent, fontWeight: '900' }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}><Input placeholder="Όνομα, π.χ. Κούρεμα" value={x.name} onChangeText={(v) => up('name', v)} box={{ backgroundColor: C.bg, borderColor: C.bg }} /></View>
              {svcs.length > 1 && (
                <Pressable onPress={() => setSvcs(svcs.filter((_, j) => j !== i))} hitSlop={6} accessibilityLabel="Αφαίρεση"
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: alpha(C.bad, 0.1), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={14} color={C.bad} />
                </Pressable>
              )}
            </View>
            <View style={[s.row, { gap: 8 }]}>
              <View style={{ flex: 1 }}><Input label="Λεπτά" style={{ width: 10 }} keyboardType="number-pad" value={x.duration_min} onChangeText={(v) => up('duration_min', v)} box={{ backgroundColor: C.bg, borderColor: C.bg }} /></View>
              <View style={{ flex: 1 }}><Input label="Τιμή €" style={{ width: 10 }} keyboardType="decimal-pad" placeholder="—" value={x.price} onChangeText={(v) => up('price', v)} box={{ backgroundColor: C.bg, borderColor: C.bg }} /></View>
              <View style={{ flex: 1 }}><Input label="Άτομα" style={{ width: 10 }} keyboardType="number-pad" value={x.capacity} onChangeText={(v) => up('capacity', v)} box={{ backgroundColor: C.bg, borderColor: C.bg }} /></View>
            </View>
          </Card>
        );
      })}
      <Pressable onPress={() => setSvcs([...svcs, { key: newKey(), name: '', duration_min: '60', price: '', capacity: '1' }])}
        style={({ pressed }) => [s.row, { justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed',
          borderColor: alpha(C.accent, 0.5), opacity: pressed ? 0.7 : 1 }]}>
        <Icon name="plus" size={16} color={C.accent} />
        <Text style={{ color: C.accent, fontWeight: '700', fontSize: 15 }}>Πρόσθεσε κι άλλες {unit}</Text>
      </Pressable>
    </View>
  );
}

/* Βήμα ωραρίου: κάθε μέρα ανοιχτά/κλειστά, ώρες και διάλειμμα. */
export function HoursEditor({ hours, setHours }: { hours: Hours; setHours: (h: Hours) => void }) {
  const gen = (d: number) => hours.map((h, i) => ({ h, i })).filter(({ h }) => h.svc === null && h.weekday === d);
  const setRow = (i: number, p: Partial<Hours[number]>) => setHours(hours.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const toggle = (d: number) => {
    if (gen(d).length) return setHours(hours.filter((h) => !(h.svc === null && h.weekday === d)));
    // Νέα μέρα: ίδιες ώρες με την πιο πρόσφατη ανοιχτή μέρα, αλλιώς 09:00–17:00
    const like = hours.filter((h) => h.svc === null).sort((a, z) => a.opens.localeCompare(z.opens));
    const src = like.length ? like.filter((h) => h.weekday === like[0].weekday) : [{ opens: '09:00', closes: '17:00' }];
    setHours([...hours, ...src.map((x) => ({ weekday: d, opens: x.opens, closes: x.closes, svc: null }))]);
  };
  const addBreak = (d: number) => {
    const last = gen(d).map(({ h }) => h).sort((a, z) => a.closes.localeCompare(z.closes)).pop();
    const hh = Math.min(22, parseInt(last ? last.closes : '09:00', 10) + 1);
    setHours([...hours, { weekday: d, opens: `${String(hh).padStart(2, '0')}:00`, closes: `${String(Math.min(23, hh + 4)).padStart(2, '0')}:00`, svc: null }]);
  };
  return (
    <View style={[s.card, shadow(1), { padding: 0, gap: 0, overflow: 'hidden' }]}>
      {WEEK.map((d, di) => {
        const rows = gen(d).sort((a, z) => a.h.opens.localeCompare(z.h.opens));
        return (
          <View key={d} style={[{ padding: 14, gap: 10 }, di < WEEK.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.bg }]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{DAYNAME[d]}</Text>
                <Text style={{ color: rows.length ? C.ok : C.mute, fontSize: 12, fontWeight: '600' }}>
                  {rows.length ? rows.map(({ h }) => `${h.opens}–${h.closes}`).join(' · ') : 'Κλειστά'}</Text>
              </View>
              <Toggle value={rows.length > 0} onChange={() => toggle(d)} />
            </View>
            {rows.map(({ h, i }) => (
              <View key={i} style={[s.row, { gap: 8 }]}>
                <View style={{ flex: 1 }}><Input style={{ width: 10, textAlign: 'center' }} value={h.opens} placeholder="09:00" onChangeText={(v) => setRow(i, { opens: v })} box={{ backgroundColor: C.bg, borderColor: C.bg }} /></View>
                <Text style={{ color: C.mute }}>–</Text>
                <View style={{ flex: 1 }}><Input style={{ width: 10, textAlign: 'center' }} value={h.closes} placeholder="17:00" onChangeText={(v) => setRow(i, { closes: v })} box={{ backgroundColor: C.bg, borderColor: C.bg }} /></View>
                {rows.length > 1 && <Pressable onPress={() => setHours(hours.filter((_, j) => j !== i))} hitSlop={6} accessibilityLabel="Αφαίρεση διαστήματος"
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: alpha(C.bad, 0.1), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={14} color={C.bad} /></Pressable>}
              </View>
            ))}
            {rows.length > 0 && rows.length < 3 && (
              <Pressable onPress={() => addBreak(d)} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start' })}>
                <Text style={{ color: C.accent, fontWeight: '700', fontSize: 14 }}>+ Διάλειμμα</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

/* Χρωματιστές βούλες για το χρώμα της σελίδας. */
export function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {colors.map((c) => {
        const on = c.toLowerCase() === value.toLowerCase();
        return (
          <Pressable key={c} onPress={() => onPick(c)} accessibilityLabel={`Χρώμα ${c}`}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c, alignItems: 'center', justifyContent: 'center',
              borderWidth: 3, borderColor: on ? C.bg : c, boxShadow: on ? `0px 0px 0px 2px ${c}` : undefined }}>
            {on && <Icon name="check" size={18} color={onColor(c)} />}
          </Pressable>
        );
      })}
    </View>
  );
}
