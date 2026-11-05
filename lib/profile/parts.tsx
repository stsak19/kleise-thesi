import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, C, Card, Icon, IconBubble, Input, alpha, fmtDay, onColor, s, shadow } from '../ui';
import type { IconName } from '../Icon';
import { usePerson } from './data';

/* Κομμάτια που μοιράζονται οι εκδοχές του προφίλ. */

/* Στρογγυλό avatar με τα αρχικά. */
export const Initials = ({ text, size = 64, ring }: { text: string; size?: number; ring?: string }) => (
  <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    boxShadow: `0px 8px 18px ${alpha(C.accent, 0.3)}` }, ring ? { borderWidth: 4, borderColor: ring } : null]}>
    <Text style={{ color: C.onAccent, fontWeight: '900', fontSize: size * 0.36 }}>{text}</Text>
  </View>
);

/* Φόρμα «Τα στοιχεία μου». */
export function MeForm({ person, onSaved, card = true }: { person: ReturnType<typeof usePerson>; onSaved?: () => void; card?: boolean }) {
  const { p, setP, save } = person;
  const body = (
    <View style={{ gap: 14 }}>
      <View style={[s.row, { gap: 10 }]}>
        <View style={{ flex: 1 }}><Input label="Όνομα" placeholder="Μαρία" value={p.first_name} onChangeText={(v) => setP({ ...p, first_name: v })} /></View>
        <View style={{ flex: 1 }}><Input label="Επώνυμο" placeholder="Παπαδοπούλου" value={p.last_name} onChangeText={(v) => setP({ ...p, last_name: v })} /></View>
      </View>
      <Input label="Κινητό" icon="phone" placeholder="69xxxxxxxx" keyboardType="phone-pad" value={p.phone} onChangeText={(v) => setP({ ...p, phone: v })} />
      <Text style={{ color: C.mute, fontSize: 13 }}>Τα βλέπει η επιχείρηση όταν κλείνεις θέση.</Text>
      <Btn title="Αποθήκευση" onPress={async () => { if (await save()) onSaved?.(); }} />
    </View>
  );
  return card ? <Card style={{ gap: 14 }}>{body}</Card> : body;
}

/* Τρία μικρά νούμερα: επερχόμενες, ολοκληρωμένες, καταστήματα. */
export function Stats({ stats, onPress }: { stats: { upcoming: number; done: number; places: number } | null; onPress?: () => void }) {
  const items = [['Επερχόμενες', stats?.upcoming], ['Ολοκληρωμένες', stats?.done], ['Καταστήματα', stats?.places]] as const;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {items.map(([l, n]) => (
        <Pressable key={l} onPress={onPress} style={({ pressed }) => [{ flex: 1, backgroundColor: C.card, borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 2,
          borderWidth: 1, borderColor: C.line, transform: [{ scale: pressed ? 0.97 : 1 }] }, shadow(1)]}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5 }}>{n ?? '–'}</Text>
          <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* Πλακίδιο για το πλέγμα (εκδοχή «Πλακίδια»). */
export const Tile = ({ icon, title, sub, onPress, color }: { icon: IconName; title: string; sub?: string; onPress: () => void; color?: string }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [{ flexBasis: '47%', flexGrow: 1, backgroundColor: C.card, borderRadius: 20, padding: 16, gap: 10, minHeight: 124,
    borderWidth: 1, borderColor: C.line, transform: [{ scale: pressed ? 0.97 : 1 }] }, shadow(1)]}>
    <IconBubble name={icon} color={color} size={40} />
    <View style={{ gap: 2 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{title}</Text>
      {!!sub && <Text style={{ color: C.mute, fontSize: 12.5 }} numberOfLines={2}>{sub}</Text>}
    </View>
  </Pressable>
);

/* Κάρτα «Επόμενο ραντεβού». */
export function NextCard({ next, onPress, onFind }: { next: any | null | undefined; onPress: () => void; onFind: () => void }) {
  if (next === undefined) return null;
  if (!next) return (
    <Pressable onPress={onFind} style={({ pressed }) => [{ backgroundColor: alpha(C.accent, 0.1), borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
      opacity: pressed ? 0.85 : 1 }]}>
      <IconBubble name="search" size={42} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>Κανένα ραντεβού στο πρόγραμμα</Text>
        <Text style={{ color: C.mute, fontSize: 13 }}>Βρες κατάστημα και κλείσε θέση</Text>
      </View>
      <Icon name="chevron" size={16} color={C.accent} />
    </Pressable>
  );
  const fg = onColor(C.accent);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: C.accent, borderRadius: 22, padding: 18, gap: 4,
      boxShadow: `0px 12px 26px ${alpha(C.accent, 0.3)}`, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <Text style={{ color: fg, opacity: 0.85, fontSize: 13, fontWeight: '700' }}>Επόμενο ραντεβού</Text>
      <Text style={{ color: fg, fontWeight: '900', fontSize: 22, letterSpacing: -0.5 }}>{fmtDay(next.date)} · {next.time}</Text>
      <Text style={{ color: fg, opacity: 0.9, fontSize: 14 }} numberOfLines={1}>{next.business} · {next.service}</Text>
    </Pressable>
  );
}

/* Επιλογή καρτέλας (εκδοχή «Καρτέλες»). */
export function Segments<K extends string>({ items, value, onChange }: { items: [K, string][]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4, gap: 4 }}>
      {items.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} style={[{ flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
          k === value && [{ backgroundColor: C.bg }, shadow(1)]]}>
          <Text style={{ color: k === value ? C.text : C.mute, fontWeight: '700', fontSize: 14 }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------- ΠΡΟΣΩΡΙΝΟ: επιλογή εκδοχής προφίλ, μέχρι να διαλεχτεί μία ---------- */
const VKEY = 'profile.variant';
let saved = 0;
AsyncStorage.getItem(VKEY).then((v) => { if (v) saved = parseInt(v, 10) || 0; }).catch(() => {});
export function useVariant(): [number, (n: number) => void] {
  const [v, setV] = useState(saved);
  useEffect(() => { AsyncStorage.getItem(VKEY).then((x) => x && setV(parseInt(x, 10) || 0)).catch(() => {}); }, []);
  return [v, (n) => { saved = n; setV(n); AsyncStorage.setItem(VKEY, String(n)).catch(() => {}); }];
}
export function VariantBar({ names, v, setV }: { names: string[]; v: number; setV: (n: number) => void }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' }} pointerEvents="box-none">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxWidth: '100%' }}
        contentContainerStyle={{ paddingHorizontal: 12 }}>
        <View style={[{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: C.bg, borderWidth: 1, borderColor: alpha(C.text, 0.08) }, shadow(3)]}>
          {names.map((n, i) => (
            <Pressable key={n} onPress={() => setV(i)} style={{ paddingHorizontal: 9, height: 30, borderRadius: 15, justifyContent: 'center',
              backgroundColor: i === v ? C.accent : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: i === v ? C.onAccent : C.mute }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
