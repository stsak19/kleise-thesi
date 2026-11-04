import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { C, onTheme } from './theme';
export { C };

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

export const DAYS = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtDay = (s: string) => { const d = new Date(s + 'T00:00'); return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };

export function Btn({ title, onPress, kind = 'primary', disabled, style }:
  { title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: ViewStyle }) {
  const bg = kind === 'primary' ? C.btn : C.btn2;
  const color = kind === 'danger' ? C.bad : kind === 'ghost' ? C.btn2Text : C.btnText;
  const border = kind === 'primary' ? C.btn : kind === 'danger' ? C.bad : C.btn2Line;
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={[s.btn, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 }, style]}>
      <Text style={{ color, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}
export const Input = (p: TextInputProps) => <TextInput placeholderTextColor={C.mute} {...p} style={[s.input, p.style]} />;
export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[s.card, style]}>{children}</View>;
export const H = ({ children }: { children: React.ReactNode }) => <Text style={s.h}>{children}</Text>;
export const T = ({ children, mute }: { children: React.ReactNode; mute?: boolean }) => <Text style={{ color: mute ? C.mute : C.text }}>{children}</Text>;

const make = () => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, gap: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.line },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: C.line },
  h: { color: C.text, fontSize: 20, fontWeight: '800' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export const s = make();
onTheme(() => Object.assign(s, make()));
