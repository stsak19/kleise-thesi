import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { C, LABELS, Theme, isLight, resetColors, setColors } from './theme';

/* Πίνακας με όλα τα χρώματα: στήλες = απόχρωση, γραμμές = από ανοιχτό σε σκούρο.
   Η τελευταία στήλη είναι οι γκρι (από λευκό ως μαύρο). Πατάς ή σέρνεις πάνω του. */
const HUES = 24, ROWS = 11;
const hsl = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('');
};
const LIGHT = [96, 90, 82, 72, 62, 52, 44, 36, 28, 20, 12];
const cellColor = (col: number, row: number) => {
  if (col === HUES) return hsl(0, 0, 100 - (row * 100) / (ROWS - 1));
  return hsl((col * 360) / HUES, row === 0 ? 90 : 85, LIGHT[row]);
};
const GRID = Array.from({ length: ROWS }, (_, r) => Array.from({ length: HUES + 1 }, (_, c) => cellColor(c, r)));

function Spectrum({ value, onPick }: { value: string; onPick: (hex: string) => void }) {
  const size = useRef({ w: 1, h: 1 });
  const last = useRef('');
  const at = (e: any) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    const c = Math.max(0, Math.min(HUES, Math.floor((x / size.current.w) * (HUES + 1))));
    const r = Math.max(0, Math.min(ROWS - 1, Math.floor((y / size.current.h) * ROWS)));
    const hex = GRID[r][c];
    if (hex !== last.current) { last.current = hex; onPick(hex); }
  };
  return (
    <View
      onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
      onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={at} onResponderMove={at}
      style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd', ...(Platform.OS === 'web' ? { cursor: 'crosshair', userSelect: 'none', touchAction: 'none' } as any : {}) }}>
      <View pointerEvents="none">
        {GRID.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', height: 15 }}>
            {row.map((c, i) => {
              const sel = c.toLowerCase() === value.toLowerCase();
              return <View key={i} style={{ flex: 1, backgroundColor: c, borderWidth: sel ? 2 : 0, borderColor: isLight(c) ? '#000' : '#fff' }} />;
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/* Πλωτό κουμπί 🎨 → πάνελ για να αλλάζεις όλα τα χρώματα live. Η επιλογή αποθηκεύεται στη συσκευή.
   Το πάνελ μένει μικρό και πηγαίνει πάνω ή κάτω (⇅), ώστε να φαίνεται η εφαρμογή που αλλάζει. */
export default function ColorEditor() {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(false);
  const [k, setK] = useState<keyof Theme>('btn');
  const [, force] = useState(0);
  const [msg, setMsg] = useState('');
  const pick = (hex: string) => { setColors({ [k]: hex } as Partial<Theme>); force((x) => x + 1); };

  const copy = async () => {
    const text = 'SpotOn χρώματα:\n' + JSON.stringify(C, null, 2);
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard) { await (navigator as any).clipboard.writeText(text); setMsg('Αντιγράφηκε ✓ — κάνε επικόλληση στο chat'); }
      else { await Share.share({ message: text }); setMsg(''); }
    } catch { setMsg('Δεν αντιγράφηκε'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const keys = Object.keys(LABELS) as (keyof Theme)[];
  return (
    <>
      <Pressable onPress={() => setOpen(!open)} accessibilityLabel="Επεξεργαστής χρωμάτων"
        style={{ position: 'absolute', right: 12, bottom: 176, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
          alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd', zIndex: 1000,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}>
        <Text style={{ fontSize: 20 }}>{open ? '✕' : '🎨'}</Text>
      </Pressable>
      {open && (
        <View style={{ position: 'absolute', left: 8, right: 8, ...(top ? { top: 40 } : { bottom: 228 }), maxWidth: 520, alignSelf: 'center',
          backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#ddd', zIndex: 999, padding: 12, gap: 10,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#16161a' }}>Χρώματα</Text>
            <Pressable onPress={() => setTop(!top)}><Text style={{ color: '#2563eb', fontWeight: '600' }}>⇅ {top ? 'Κάτω' : 'Πάνω'}</Text></Pressable>
            <Pressable onPress={copy}><Text style={{ color: '#2563eb', fontWeight: '600' }}>📋 Αντιγραφή</Text></Pressable>
            <Pressable onPress={() => { resetColors(); force((x) => x + 1); }}><Text style={{ color: '#2563eb', fontWeight: '600' }}>Επαναφορά</Text></Pressable>
          </View>
          {!!msg && <Text style={{ color: '#1fa971', fontWeight: '600' }}>{msg}</Text>}

          {/* Ποιο στοιχείο αλλάζεις */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {keys.map((key) => {
              const on = key === k;
              return (
                <Pressable key={key} onPress={() => setK(key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
                    borderWidth: on ? 2 : 1, borderColor: on ? '#16161a' : '#ddd', backgroundColor: on ? '#f4f4f7' : '#fff' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C[key], borderWidth: 1, borderColor: '#ccc' }} />
                  <Text style={{ fontSize: 12, color: '#16161a', fontWeight: on ? '700' : '500' }}>{LABELS[key]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Spectrum value={C[k]} onPick={pick} />

          {/* Μικρή προεπισκόπηση με τα τρέχοντα χρώματα */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }}>
            <View style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 12 }}>Κάρτα</Text>
              <Text style={{ color: C.mute, fontSize: 11 }}>δευτερεύον</Text>
            </View>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.btn }}><Text style={{ color: C.btnText, fontWeight: '700', fontSize: 12 }}>Κράτηση</Text></View>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.btn2, borderWidth: 1, borderColor: C.btn2Line }}><Text style={{ color: C.btn2Text, fontWeight: '700', fontSize: 12 }}>Άκυρο</Text></View>
            <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: C.accent }}><Text style={{ color: C.onAccent, fontSize: 11, fontWeight: '700' }}>10:30</Text></View>
          </View>
        </View>
      )}
    </>
  );
}
