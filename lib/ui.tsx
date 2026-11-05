import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, alpha, isLight, onTheme } from './theme';
import { Icon, IconName } from './Icon';
export { C, alpha, Icon };

export const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'gym', label: 'Γυμναστήρια', emoji: '🏋️' },
  { key: 'personal_training', label: 'Personal', emoji: '💪' },
  { key: 'pilates_yoga', label: 'Pilates / Yoga', emoji: '🧘' },
  { key: 'nails', label: 'Νυχάδικα', emoji: '💅' },
  { key: 'hair', label: 'Κομμωτήρια', emoji: '💇' },
  { key: 'barber', label: 'Κουρεία', emoji: '💈' },
  { key: 'beauty', label: 'Αισθητική', emoji: '✨' },
  { key: 'massage_spa', label: 'Μασάζ / Spa', emoji: '💆' },
  { key: 'physio', label: 'Φυσικοθεραπεία', emoji: '🩺' },
  { key: 'medical', label: 'Ιατρεία', emoji: '⚕️' },
  { key: 'dental', label: 'Οδοντίατροι', emoji: '🦷' },
  { key: 'tattoo', label: 'Tattoo', emoji: '🖋️' },
  { key: 'other', label: 'Άλλο', emoji: '📅' },
];
export const catLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.label ?? k;
export const catEmoji = (k: string) => CATEGORIES.find((c) => c.key === k)?.emoji ?? '📅';

export const DAYS = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
export const MONTHS = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtDay = (s: string) => { const d = new Date(s + 'T00:00'); return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
export const fmtLong = (s: string) => { const d = new Date(s + 'T00:00'); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const price = (cents: number | null | undefined) => (cents == null ? '' : `${(cents / 100).toFixed(cents % 100 ? 2 : 0)}€`);

/* ---------- μεγέθη ---------- */
export const R = { sm: 10, md: 14, lg: 20, xl: 28 };
/* Απαλή σκιά από το χρώμα του κειμένου (ακολουθεί το θέμα). */
export const shadow = (lvl: 1 | 2 | 3 = 1): ViewStyle => ({
  boxShadow: lvl === 1 ? `0px 1px 2px ${alpha(C.text, 0.05)}, 0px 4px 14px ${alpha(C.text, 0.05)}`
    : lvl === 2 ? `0px 2px 4px ${alpha(C.text, 0.05)}, 0px 10px 30px ${alpha(C.text, 0.09)}`
    : `0px 8px 20px ${alpha(C.text, 0.10)}, 0px 24px 60px ${alpha(C.text, 0.14)}`,
});
/* Χρώμα κειμένου πάνω σε ένα χρώμα φόντου. */
export const onColor = (bg: string) => (bg === C.accent ? C.onAccent : isLight(bg) ? C.text : '#ffffff');

/* ---------- κουμπιά ---------- */
type BtnKind = 'primary' | 'ghost' | 'danger' | 'tint';
export function Btn({ title, onPress, kind = 'primary', disabled, style, color, size = 'md', icon }:
  { title: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; style?: ViewStyle; color?: string; size?: 'md' | 'sm'; icon?: IconName }) {
  const main = color ?? C.btn;
  const bg = kind === 'primary' ? main : kind === 'danger' ? alpha(C.bad, 0.1) : kind === 'tint' ? alpha(color ?? C.accent, 0.12) : C.btn2;
  const fg = kind === 'primary' ? (color ? onColor(color) : C.btnText) : kind === 'danger' ? C.bad : kind === 'tint' ? (color ?? C.accent) : C.btn2Text;
  const border = kind === 'ghost' ? C.btn2Line : 'transparent';
  const sm = size === 'sm';
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.btn, sm && s.btnSm, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }] },
        kind === 'primary' && !disabled && { boxShadow: `0px 6px 16px ${alpha(main, 0.28)}` }, style]}>
      {icon && <Icon name={icon} size={sm ? 15 : 18} color={fg} />}
      <Text style={{ color: fg, fontWeight: '700', fontSize: sm ? 14 : 16, letterSpacing: -0.1 }} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
}

/* Κουμπί-κείμενο (π.χ. «+ Διάλειμμα», «Όλες»). */
export const TextBtn = ({ title, onPress, color }: { title: string; onPress: () => void; color?: string }) => (
  <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
    <Text style={{ color: color ?? C.accent, fontWeight: '700', fontSize: 15 }}>{title}</Text>
  </Pressable>
);

/* ---------- πεδία ---------- */
export function Input({ label, icon, style, box, ...p }: TextInputProps & { label?: string; icon?: IconName; box?: ViewStyle }) {
  const [focus, setFocus] = useState(false);
  const field = (
    <View style={[s.input, box, focus && { borderColor: C.accent, backgroundColor: C.card, boxShadow: `0px 0px 0px 4px ${alpha(C.accent, 0.12)}` },
      p.multiline && { alignItems: 'flex-start', minHeight: 96 }]}>
      {icon && <Icon name={icon} size={18} color={focus ? C.accent : C.mute} />}
      <TextInput placeholderTextColor={C.mute} {...p}
        onFocus={(e) => { setFocus(true); p.onFocus?.(e); }} onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
        style={[s.inputText, { outlineStyle: 'none' } as any, p.multiline && { textAlignVertical: 'top', paddingTop: 2 }, style]} />
    </View>
  );
  if (!label) return field;
  return <View style={{ gap: 6 }}><Text style={s.label}>{label}</Text>{field}</View>;
}

/* ---------- επιφάνειες ---------- */
export const Card = ({ children, style, flat, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; flat?: boolean; onPress?: () => void }) => {
  const base = [s.card, flat ? { backgroundColor: C.soft, borderColor: C.soft } : shadow(1), style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [...base, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}>{children}</Pressable>;
};

/* ---------- κείμενα ---------- */
export const Title = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => <Text style={[s.title, style]}>{children}</Text>;
export const H = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => <Text style={[s.h, style]}>{children}</Text>;
export const T = ({ children, mute, style, bold }: { children: React.ReactNode; mute?: boolean; bold?: boolean; style?: TextStyle }) =>
  <Text style={[{ color: mute ? C.mute : C.text, fontSize: 15, lineHeight: 21 }, bold && { fontWeight: '700' }, style]}>{children}</Text>;

/* Τίτλος ενότητας με προαιρετική ενέργεια δεξιά. */
export const Section = ({ title, action, onAction, sub }: { title: string; action?: string; onAction?: () => void; sub?: string }) => (
  <View style={{ marginTop: 14, gap: 2 }}>
    <View style={s.row}>
      <Text style={[s.h, { flex: 1 }]}>{title}</Text>
      {!!action && !!onAction && <TextBtn title={action} onPress={onAction} />}
    </View>
    {!!sub && <T mute style={{ fontSize: 14 }}>{sub}</T>}
  </View>
);

/* Επικεφαλίδα οθόνης με μεγάλο τίτλο (κάτω από την μπάρα κατάστασης). */
export function ScreenHeader({ title, sub, right, eyebrow }: { title: string; sub?: string; right?: React.ReactNode; eyebrow?: string }) {
  const top = useSafeAreaInsets().top;
  return (
    <View style={{ paddingTop: top + 14, paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {!!eyebrow && <Text style={{ color: C.mute, fontSize: 14, fontWeight: '600' }}>{eyebrow}</Text>}
        <Title>{title}</Title>
        {!!sub && <T mute>{sub}</T>}
      </View>
      {right}
    </View>
  );
}

/* ---------- μικρά στοιχεία ---------- */
export function Chip({ label, on, onPress, color, emoji }: { label: string; on?: boolean; onPress: () => void; color?: string; emoji?: string }) {
  const c = color ?? C.accent;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, on ? { backgroundColor: c, borderColor: c } : { backgroundColor: C.card },
      { opacity: pressed ? 0.8 : 1 }]}>
      {!!emoji && <Text style={{ fontSize: 15 }}>{emoji}</Text>}
      <Text style={{ color: on ? onColor(c) : C.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export type Tone = 'ok' | 'bad' | 'mute' | 'accent';
export const Pill = ({ text, tone = 'mute', color }: { text: string; tone?: Tone; color?: string }) => {
  const c = color ?? (tone === 'ok' ? C.ok : tone === 'bad' ? C.bad : tone === 'accent' ? C.accent : C.mute);
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: alpha(c, 0.12), borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
      <Text style={{ color: c, fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
};

export function Avatar({ name, color, size = 48, emoji, radius }: { name?: string; color?: string; size?: number; emoji?: string; radius?: number }) {
  const c = color ?? C.accent;
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size / 2, backgroundColor: alpha(c, 0.14), alignItems: 'center', justifyContent: 'center' }}>
      {emoji ? <Text style={{ fontSize: size * 0.44 }}>{emoji}</Text>
        : <Text style={{ color: c, fontWeight: '800', fontSize: size * 0.4 }}>{(name || '?').trim().slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}

/* Εικονίδιο μέσα σε απαλό κύκλο. */
export const IconBubble = ({ name, color, size = 40 }: { name: IconName; color?: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(color ?? C.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={name} size={size * 0.5} color={color ?? C.accent} />
  </View>
);

/* Γραμμή λίστας (ρυθμίσεις, στοιχεία επικοινωνίας). */
export function Row({ icon, title, sub, onPress, right, danger, color, last }:
  { icon?: IconName; title: string; sub?: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean; color?: string; last?: boolean }) {
  const c = danger ? C.bad : color ?? C.accent;
  const inner = (
    <View style={[s.row, { gap: 14, paddingVertical: 13, paddingHorizontal: 14 }, !last && { borderBottomWidth: 1, borderBottomColor: C.line }]}>
      {icon && <IconBubble name={icon} color={c} size={36} />}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: danger ? C.bad : C.text, fontWeight: '600', fontSize: 15 }}>{title}</Text>
        {!!sub && <Text style={{ color: C.mute, fontSize: 13 }}>{sub}</Text>}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={16} color={C.mute} /> : null)}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? C.soft : 'transparent' })}>{inner}</Pressable> : inner;
}
/* Ομάδα γραμμών σε κάρτα. */
export const Group = ({ children }: { children: React.ReactNode }) =>
  <View style={[s.card, shadow(1), { padding: 0, gap: 0, overflow: 'hidden' }]}>{children}</View>;

/* Διακόπτης στο χρώμα της εφαρμογής (και στον browser). */
export const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <Switch value={value} onValueChange={onChange} trackColor={{ true: C.accent, false: C.line }} thumbColor="#ffffff"
    {...({ activeThumbColor: '#ffffff', activeTrackColor: C.accent } as any)} />
);
export const SwitchRow = ({ label, sub, value, onChange, last }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) => (
  <Row title={label} sub={sub} last={last} right={<Toggle value={value} onChange={onChange} />} />
);

/* Άδεια κατάσταση: εικονίδιο, τίτλος, κείμενο, προαιρετικό κουμπί. */
export const Empty = ({ icon, emoji, title, text, action, onAction }:
  { icon?: IconName; emoji?: string; title: string; text?: string; action?: string; onAction?: () => void }) => (
  <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 10 }}>
    {emoji ? <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 32 }}>{emoji}</Text></View> : icon ? <IconBubble name={icon} size={72} /> : null}
    <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, textAlign: 'center', marginTop: 4 }}>{title}</Text>
    {!!text && <T mute style={{ textAlign: 'center' }}>{text}</T>}
    {!!action && !!onAction && <Btn kind="tint" size="sm" title={action} onPress={onAction} style={{ marginTop: 6 }} />}
  </View>
);

/* Λωρίδα ημερών (κατάστημα, πρόγραμμα ιδιοκτήτη). */
export function DayStrip({ days, value, onChange, color }: { days: string[]; value: string; onChange: (d: string) => void; color?: string }) {
  const c = color ?? C.accent;
  const today = iso(new Date());
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }} style={{ marginHorizontal: -20, marginBottom: -10 }}>
      {days.map((d) => {
        const dd = new Date(d + 'T00:00'), on = d === value;
        return (
          <Pressable key={d} onPress={() => onChange(d)}
            style={({ pressed }) => [{ width: 56, paddingVertical: 10, borderRadius: 16, alignItems: 'center', gap: 2, borderWidth: 1 },
              on ? { backgroundColor: c, borderColor: c, boxShadow: `0px 6px 14px ${alpha(c, 0.3)}` } : { backgroundColor: C.card, borderColor: C.line },
              { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
            <Text style={{ color: on ? onColor(c) : C.mute, fontSize: 12, fontWeight: '600' }}>{d === today ? 'Σήμ.' : DAYS[dd.getDay()]}</Text>
            <Text style={{ color: on ? onColor(c) : C.text, fontWeight: '800', fontSize: 19 }}>{dd.getDate()}</Text>
            <Text style={{ color: on ? onColor(c) : C.mute, fontSize: 11, opacity: 0.85 }}>{MONTHS[dd.getMonth()]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const make = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, gap: 12, paddingBottom: 40 },
  btn: { minHeight: 52, paddingHorizontal: 18, borderRadius: R.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnSm: { minHeight: 38, paddingHorizontal: 14, borderRadius: 11 },
  input: { backgroundColor: C.soft, borderRadius: R.md, paddingHorizontal: 14, minHeight: 52, borderWidth: 1.5, borderColor: C.soft,
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  inputText: { flex: 1, color: C.text, fontSize: 16, padding: 0, minWidth: 0 },
  label: { color: C.mute, fontSize: 13, fontWeight: '600', marginLeft: 2 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, gap: 6, borderWidth: 1, borderColor: C.line },
  title: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  h: { color: C.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export const s = make();
onTheme(() => Object.assign(s, make()));
