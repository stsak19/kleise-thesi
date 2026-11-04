import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { C, LABELS, Theme, resetColors, setColors } from './theme';

const SWATCHES = ['#ff7a59', '#e5484d', '#ec4899', '#a855f7', '#6366f1', '#2563eb', '#0ea5e9', '#14b8a6', '#1fa971', '#eab308', '#16161a', '#ffffff'];
const HEX = /^#[0-9a-fA-F]{6}$/;

function Row({ k }: { k: keyof Theme }) {
  const [txt, setTxt] = useState(C[k]);
  const set = (v: string) => { setTxt(v); if (HEX.test(v)) setColors({ [k]: v } as Partial<Theme>); };
  return (
    <View style={{ gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {Platform.OS === 'web'
          ? React.createElement('input', { type: 'color', value: HEX.test(txt) ? txt : C[k], onChange: (e: any) => set(e.target.value),
              style: { width: 36, height: 36, border: 'none', padding: 0, background: 'none', cursor: 'pointer' } })
          : <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C[k], borderWidth: 1, borderColor: '#ccc' }} />}
        <Text style={{ flex: 1, color: '#16161a', fontWeight: '600' }}>{LABELS[k]}</Text>
        <TextInput value={txt} onChangeText={set} autoCapitalize="none"
          style={{ width: 90, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 6, color: '#16161a', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {SWATCHES.map((c) => <Pressable key={c} onPress={() => set(c)}
          style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c, borderWidth: 1, borderColor: '#ccc' }} />)}
      </View>
    </View>
  );
}

/* Πλωτό κουμπί 🎨 → πάνελ για να αλλάζεις όλα τα χρώματα live. Η επιλογή αποθηκεύεται στη συσκευή. */
export default function ColorEditor() {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0);
  return (
    <>
      <Pressable onPress={() => setOpen(!open)} accessibilityLabel="Επεξεργαστής χρωμάτων"
        style={{ position: 'absolute', right: 12, bottom: 176, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
          alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd', zIndex: 1000,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}>
        <Text style={{ fontSize: 20 }}>{open ? '✕' : '🎨'}</Text>
      </Pressable>
      {open && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 228, maxHeight: '45%', backgroundColor: '#fff', borderRadius: 16,
          borderWidth: 1, borderColor: '#ddd', zIndex: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: '#16161a' }}>Χρώματα</Text>
            <Pressable onPress={() => { resetColors(); setN(n + 1); }}><Text style={{ color: '#2563eb', fontWeight: '600' }}>Επαναφορά</Text></Pressable>
          </View>
          <ScrollView key={n} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            {(Object.keys(LABELS) as (keyof Theme)[]).map((k) => <Row key={k} k={k} />)}
          </ScrollView>
        </View>
      )}
    </>
  );
}
