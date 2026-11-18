import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextStyle, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Text, TextInput } from './Txt';
import { Btn, C, Icon, alpha } from './ui';

/* Ελεύθερη επιλογή ώρας παντού στην εφαρμογή.
   TimeBtn: κουμπί «08:35» που ανοίγει φύλλο με πλέγμα ωρών (00–23) και λεπτών (ανά 5).
   AmountPick: έτοιμες επιλογές («1 ώρα», «1 μέρα») + «+ Άλλο» για ό,τι αριθμό θέλει ο καθένας
   σε λεπτά / ώρες / μέρες. Η τιμή κρατιέται πάντα στη μικρότερη μονάδα (λεπτά ή μέρες). */

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = Array.from({ length: 12 }, (_, i) => i * 5);
const p2 = (n: number) => String(n).padStart(2, '0');

/* «9:5», «0905», «09:05:00» → «09:05». Ό,τι δεν διαβάζεται γυρίζει όπως ήταν. */
export function normTime(v: string | null | undefined, fallback = '09:00') {
  const m = String(v ?? '').match(/^(\d{1,2}):?(\d{2})/);
  if (!m) return fallback;
  const h = Math.min(23, +m[1]), mi = Math.min(59, +m[2]);
  return `${p2(h)}:${p2(mi)}`;
}

/* Κοινό πλαίσιο: φύλλο από κάτω στο κινητό, παράθυρο στη μέση στον υπολογιστή. */
function Sheet({ title, sub, onClose, children, onDone, doneOk = true }:
  { title: string; sub?: string; onClose: () => void; children: React.ReactNode; onDone: () => void; doneOk?: boolean }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 700;
  return (
    <Modal visible transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: alpha('#000000', 0.42), alignItems: 'center', justifyContent: wide ? 'center' : 'flex-end', padding: wide ? 24 : 0 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: wide ? 440 : undefined, maxHeight: height - 40, backgroundColor: C.bg,
          borderRadius: wide ? 24 : 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', boxShadow: `0px 30px 80px ${alpha('#000000', 0.3)}` }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: wide ? 20 : 10, paddingBottom: 24, gap: 6 }}>
            {!wide && <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 8 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 19 }}>{title}</Text>
                {!!sub && <Text style={{ color: C.mute, fontWeight: '600', fontSize: 13 }}>{sub}</Text>}
              </View>
              <Pressable onPress={onClose} accessibilityLabel="Κλείσιμο" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={13} color={C.text} />
              </Pressable>
            </View>
            {children}
            <Btn title="Έτοιμο" onPress={onDone} disabled={!doneOk} style={{ marginTop: 14 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* Ένα κουτάκι του πλέγματος. */
function Cell({ label, on, onPress, basis }: { label: string; on: boolean; onPress: () => void; basis: ViewStyle['flexBasis'] }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ flexBasis: basis, flexGrow: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center',
        backgroundColor: on ? C.text : C.soft, opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 14.5 }}>{label}</Text>
    </Pressable>
  );
}

const lbl: TextStyle = { color: C.mute, fontWeight: '800', fontSize: 12, letterSpacing: 0.4, marginTop: 12, marginBottom: 4 };

/* Φύλλο επιλογής ώρας: ώρα πάνω, λεπτά κάτω. Αν η ώρα έχει λεπτά εκτός πεντάλεπτου (π.χ. 08:37), φαίνονται κι αυτά. */
export function TimeSheet({ value, title, sub, onClose, onPick }:
  { value: string; title: string; sub?: string; onClose: () => void; onPick: (v: string) => void }) {
  const t = normTime(value);
  const [h, setH] = useState(+t.slice(0, 2));
  const [m, setM] = useState(+t.slice(3, 5));
  useEffect(() => { const x = normTime(value); setH(+x.slice(0, 2)); setM(+x.slice(3, 5)); }, [value]);
  const mins = MINS.includes(m) ? MINS : [...MINS, m].sort((a, z) => a - z);
  return (
    <Sheet title={title} sub={sub} onClose={onClose} onDone={() => { onPick(`${p2(h)}:${p2(m)}`); onClose(); }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 44, letterSpacing: -1, textAlign: 'center', marginTop: 4 }}>{p2(h)}:{p2(m)}</Text>
      <Text style={lbl}>ΩΡΑ</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {HOURS.map((x) => <Cell key={x} label={p2(x)} on={x === h} onPress={() => setH(x)} basis="14%" />)}
      </View>
      <Text style={lbl}>ΛΕΠΤΑ</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {mins.map((x) => <Cell key={x} label={`:${p2(x)}`} on={x === m} onPress={() => setM(x)} basis="14%" />)}
      </View>
    </Sheet>
  );
}

/* Κουμπί ώρας: δείχνει «08:35» και ανοίγει το φύλλο. */
export function TimeBtn({ value, onChange, title = 'Ώρα', sub, style, small }:
  { value: string; onChange: (v: string) => void; title?: string; sub?: string; style?: ViewStyle; small?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${title}: ${normTime(value)}`}
        style={({ pressed }) => [{ backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5, borderColor: open ? C.text : C.line,
          paddingVertical: small ? 6 : 11, paddingHorizontal: small ? 10 : 12, alignItems: 'center', opacity: pressed ? 0.75 : 1 }, style]}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: small ? 14 : 16 }}>{normTime(value)}</Text>
      </Pressable>
      {open && <TimeSheet value={value} title={title} sub={sub} onClose={() => setOpen(false)} onPick={onChange} />}
    </>
  );
}

/* ---------- «πόση ώρα πριν» ---------- */
export type Unit = { label: string; one: string; mul: number };
export const MIN_UNITS: Unit[] = [{ label: 'λεπτά', one: 'λεπτό', mul: 1 }, { label: 'ώρες', one: 'ώρα', mul: 60 }, { label: 'μέρες', one: 'μέρα', mul: 1440 }];
export const DAY_UNITS: Unit[] = [{ label: 'μέρες', one: 'μέρα', mul: 1 }];

/* Η μεγαλύτερη μονάδα που διαιρεί ακριβώς την τιμή: 120 → «2 ώρες», 90 → «90 λεπτά». */
export function splitAmount(v: number, units: Unit[]) {
  const u = [...units].reverse().find((x) => v > 0 && v % x.mul === 0) ?? units[0];
  return { n: Math.round(v / u.mul), u };
}
export const amountLabel = (v: number, units: Unit[] = MIN_UNITS) => {
  const { n, u } = splitAmount(v, units);
  return `${n} ${n === 1 ? u.one : u.label}`;
};

function AmountSheet({ value, units, title, sub, max, onClose, onPick }:
  { value: number; units: Unit[]; title: string; sub?: string; max?: number; onClose: () => void; onPick: (v: number) => void }) {
  const first = splitAmount(value, units);
  const [txt, setTxt] = useState(String(first.n));
  const [u, setU] = useState(first.u);
  const n = Math.max(0, parseInt(txt, 10) || 0);
  const total = n * u.mul;
  const ok = n > 0 && (!max || total <= max);
  const step = (d: number) => setTxt(String(Math.max(1, n + d)));
  const round: ViewStyle = { width: 46, height: 46, borderRadius: 23, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' };
  return (
    <Sheet title={title} sub={sub} onClose={onClose} doneOk={ok} onDone={() => { onPick(total); onClose(); }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 }}>
        <Pressable onPress={() => step(-1)} style={round} accessibilityLabel="Λιγότερο"><Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>−</Text></Pressable>
        <TextInput value={txt} onChangeText={(v) => setTxt(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" selectTextOnFocus
          style={[{ color: C.text, fontSize: 40, fontWeight: '800', width: 110, textAlign: 'center', paddingVertical: 4 }, { outlineStyle: 'none' } as any]} />
        <Pressable onPress={() => step(1)} style={round} accessibilityLabel="Περισσότερο"><Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>+</Text></Pressable>
      </View>
      {units.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          {units.map((x) => <Cell key={x.label} label={x.label} on={x.mul === u.mul} onPress={() => setU(x)} basis="30%" />)}
        </View>
      )}
      <Text style={{ color: max && total > max ? C.bad : C.mute, fontWeight: '600', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
        {!n ? 'Βάλε έναν αριθμό' : max && total > max ? `Το πολύ ${amountLabel(max, units)}` : amountLabel(total, units)}</Text>
    </Sheet>
  );
}

/* Έτοιμες επιλογές + «+ Άλλο». Δική τιμή που δεν είναι στις έτοιμες γράφεται πάνω στο «+ Άλλο», που φαίνεται επιλεγμένο. */
export function AmountPick({ label, sub, options, value, onPick, units = MIN_UNITS, sheetTitle, sheetSub, max, bare }:
  { label?: string; sub?: string; options: number[]; value: number; onPick: (v: number) => void; units?: Unit[];
    sheetTitle?: string; sheetSub?: string; max?: number; bare?: boolean }) {
  const [open, setOpen] = useState(false);
  const custom = value > 0 && !options.includes(value);
  const chip = (key: string, text: string, on: boolean, onPress: () => void, dashed?: boolean) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={({ pressed }) => [{ paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, backgroundColor: on ? C.accent : C.soft, opacity: pressed ? 0.85 : 1 },
        dashed && { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.btn2Line, paddingVertical: 9.5, paddingHorizontal: 14.5 }]}>
      <Text style={{ color: on ? C.onAccent : C.text, fontWeight: '700', fontSize: 14 }}>{text}</Text>
    </Pressable>
  );
  const row = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((v) => chip(String(v), amountLabel(v, units), v === value, () => onPick(v)))}
      {/* Δική τιμή: φαίνεται πάνω στο ίδιο το «+ Άλλο» (επιλεγμένο), όχι σε ξεχωριστό κουμπί. */}
      {custom ? chip('more', amountLabel(value, units), true, () => setOpen(true)) : chip('more', '+ Άλλο', false, () => setOpen(true), true)}
      {open && <AmountSheet value={value || options[0]} units={units} title={sheetTitle ?? label ?? 'Δική σου τιμή'} sub={sheetSub ?? sub} max={max}
        onClose={() => setOpen(false)} onPick={onPick} />}
    </View>
  );
  if (bare || !label) return row;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{label}</Text>
        {!!sub && <Text style={{ color: C.mute, fontSize: 13 }}>{sub}</Text>}
      </View>
      {row}
    </View>
  );
}
