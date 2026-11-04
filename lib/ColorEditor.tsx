import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { C, LABELS, Theme, isLight, resetColors, setColors } from './theme';

/* Έτοιμα χρώματα με όνομα — διαλέγεις πατώντας, χωρίς κωδικούς. */
const PALETTE: [string, string][] = [
  ['Λευκό', '#ffffff'], ['Υπόλευκο', '#fafaf7'], ['Απαλό γκρι', '#f4f4f7'], ['Ανοιχτό γκρι', '#e5e7eb'], ['Γκρι', '#9ca3af'],
  ['Σκούρο γκρι', '#4b5563'], ['Ανθρακί', '#1f2937'], ['Μαύρο', '#15151b'],
  ['Κόκκινο', '#e5484d'], ['Κοραλί', '#ff7a59'], ['Πορτοκαλί', '#f97316'], ['Κεχριμπάρι', '#f59e0b'], ['Κίτρινο', '#eab308'],
  ['Λάιμ', '#84cc16'], ['Πράσινο', '#1fa971'], ['Σμαραγδί', '#059669'], ['Τιρκουάζ', '#14b8a6'], ['Γαλάζιο', '#0ea5e9'],
  ['Μπλε', '#2563eb'], ['Μπλε νύχτας', '#1e3a8a'], ['Λουλακί', '#6366f1'], ['Μωβ', '#a855f7'], ['Φούξια', '#d946ef'],
  ['Ροζ', '#ec4899'], ['Απαλό ροζ', '#fce7f3'], ['Απαλό μπλε', '#dbeafe'], ['Απαλό πράσινο', '#dcfce7'], ['Μπεζ', '#f5ede0'], ['Καφέ', '#92400e'],
];
const nameOf = (hex: string) => PALETTE.find(([, h]) => h.toLowerCase() === hex.toLowerCase())?.[0] ?? 'Δικό σου';

function Row({ k, open, onToggle }: { k: keyof Theme; open: boolean; onToggle: () => void }) {
  const [cur, setCur] = useState(C[k]);
  const pick = (v: string) => { setCur(v); setColors({ [k]: v } as Partial<Theme>); };
  return (
    <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee', gap: 8 }}>
      <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cur, borderWidth: 1, borderColor: '#d4d4d8' }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#16161a', fontWeight: '600' }}>{LABELS[k]}</Text>
          <Text style={{ color: '#737380', fontSize: 12 }}>{nameOf(cur)}</Text>
        </View>
        <Text style={{ color: '#737380', fontSize: 16 }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {PALETTE.map(([name, c]) => {
            const sel = c.toLowerCase() === cur.toLowerCase();
            return (
              <Pressable key={c} onPress={() => pick(c)} accessibilityLabel={name} style={{ width: 58, alignItems: 'center', gap: 3 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: sel ? 3 : 1,
                  borderColor: sel ? '#2563eb' : '#d4d4d8', alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <Text style={{ color: isLight(c) ? '#15151b' : '#fff', fontWeight: '900' }}>✓</Text>}
                </View>
                <Text numberOfLines={1} style={{ fontSize: 10, color: sel ? '#16161a' : '#737380', fontWeight: sel ? '700' : '400' }}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* Πλωτό κουμπί 🎨 → πάνελ για να αλλάζεις όλα τα χρώματα live. Η επιλογή αποθηκεύεται στη συσκευή. */
export default function ColorEditor() {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0);
  const [sel, setSel] = useState<keyof Theme | null>('btn');
  return (
    <>
      <Pressable onPress={() => setOpen(!open)} accessibilityLabel="Επεξεργαστής χρωμάτων"
        style={{ position: 'absolute', right: 12, bottom: 176, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
          alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd', zIndex: 1000,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}>
        <Text style={{ fontSize: 20 }}>{open ? '✕' : '🎨'}</Text>
      </Pressable>
      {open && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 228, maxHeight: '60%', backgroundColor: '#fff', borderRadius: 16,
          borderWidth: 1, borderColor: '#ddd', zIndex: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: '#16161a' }}>Χρώματα</Text>
            <Pressable onPress={() => { resetColors(); setN(n + 1); }}><Text style={{ color: '#2563eb', fontWeight: '600' }}>Επαναφορά</Text></Pressable>
          </View>
          <ScrollView key={n} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            {(Object.keys(LABELS) as (keyof Theme)[]).map((k) => <Row key={k} k={k} open={sel === k} onToggle={() => setSel(sel === k ? null : k)} />)}
          </ScrollView>
        </View>
      )}
    </>
  );
}
