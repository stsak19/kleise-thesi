import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, TextInput } from '../Txt';
import { isLight } from '../theme';
import { usePerson } from '../profile/data';
import { C, Icon, alpha, s } from '../ui';
import { Initials } from '../profile/parts';
import type { IconName } from '../Icon';
import { askLogin } from '../guest';

/* Ο πελάτης σε υπολογιστή: πάνω μπάρα όπως σε κάθε site πελατών (λογότυπο, αναζήτηση στη μέση, Αρχική · Κρατήσεις · Πακέτα,
   «Σύνδεση» ή το προφίλ δεξιά). Στο κινητό δεν χρησιμοποιείται τίποτα από εδώ. */

/* ---------- Κοινή αναζήτηση: γράφεις στην πάνω μπάρα, φιλτράρει η αρχική ---------- */
let query = '';
const subs = new Set<(v: string) => void>();
export const setHomeQuery = (v: string) => { if (v !== query) { query = v; subs.forEach((f) => f(v)); } };
export function useHomeQuery(): [string, (v: string) => void] {
  const [v, setV] = useState(query);
  useEffect(() => { subs.add(setV); return () => { subs.delete(setV); }; }, []);
  return [v, setHomeQuery];
}

export type TopItems = Record<string, { icon: IconName; label: string }>;
type Nav = { items: TopItems; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void };

/* Γυάλινη αναζήτηση (στη μέση της πάνω μπάρας). */
export function DeskSearch({ value, onChange, placeholder = 'Αναζήτηση' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focus, setFocus] = useState(false);
  const light = isLight(C.bg);
  return (
    <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'}
      style={{ width: '100%', maxWidth: 560, alignSelf: 'center', height: 48, borderRadius: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20,
        backgroundColor: light ? alpha('#ffffff', 0.75) : alpha('#30302e', 0.65), borderWidth: 1,
        borderColor: focus ? alpha(C.text, 0.25) : light ? alpha('#000000', 0.06) : alpha('#ffffff', 0.1),
        boxShadow: `0px 8px 22px ${alpha(C.shade, light ? (focus ? 0.16 : 0.1) : 0.4)}` }}>
      <Icon name="search" size={18} color={focus ? C.text : C.mute} />
      <TextInput placeholder={placeholder} placeholderTextColor={C.mute} value={value} onChangeText={onChange} returnKeyType="search"
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={[{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600', height: 48 }, { outlineStyle: 'none' } as any]} />
      {!!value && (
        <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Καθαρισμός αναζήτησης">
          <Icon name="close" size={14} color={C.mute} />
        </Pressable>
      )}
    </BlurView>
  );
}

/* ---------- Πάνω μπάρα ---------- */
export function TopBar({ items, state, navigateToTab }: Nav) {
  const person = usePerson();
  const [q, setQ] = useHomeQuery();
  const activeKey = state.routes[state.index]?.key;
  const route = (name: string) => state.routes.find((r) => r.name === name);
  const home = route('(search)'), profile = route('(profile)');
  const goHome = () => { if (home && home.key !== activeKey) navigateToTab(home.key); };
  return (
    <View style={[s.row, { gap: 24, paddingVertical: 14, paddingHorizontal: 40, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg, zIndex: 10 }]}>
      <Pressable onPress={() => { setQ(''); goHome(); }} accessibilityRole="link" accessibilityLabel="SpotOn, αρχική" style={[s.row, { gap: 8 }]}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.bg, fontWeight: '800', fontSize: 15 }}>S</Text>
        </View>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 22, letterSpacing: -0.6 }}>SpotOn</Text>
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <DeskSearch value={q} onChange={(t) => { setQ(t); goHome(); }} placeholder="Αναζήτηση καταστήματος" />
      </View>
      <View style={[s.row, { gap: 4 }]}>
        {Object.keys(items).map(route).filter((r): r is { key: string; name: string } => !!r).map((r) => {
          const on = r.key === activeKey;
          return (
            <Pressable key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={({ pressed, hovered }: any) => [s.row, { gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
                backgroundColor: on ? C.text : pressed || hovered ? C.soft : 'transparent' }]}>
              <Icon name={items[r.name].icon} size={18} color={on ? C.bg : C.text} />
              <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 15 }}>{items[r.name].label}</Text>
            </Pressable>
          );
        })}
      </View>
      {person.guest ? (
        <Pressable onPress={() => askLogin()} accessibilityRole="button"
          style={({ pressed, hovered }: any) => ({ paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: C.text, opacity: pressed || hovered ? 0.85 : 1 })}>
          <Text style={{ color: C.bg, fontWeight: '800', fontSize: 14 }}>Σύνδεση</Text>
        </Pressable>
      ) : profile && (
        <Pressable onPress={() => navigateToTab(profile.key)} accessibilityRole="tab" accessibilityLabel="Προφίλ" accessibilityState={{ selected: profile.key === activeKey }}
          style={({ hovered }: any) => ({ borderRadius: 22, padding: 2, borderWidth: 2, borderColor: profile.key === activeKey ? C.text : hovered ? C.line : 'transparent' })}>
          <Initials text={person.initials} size={38} />
        </Pressable>
      )}
    </View>
  );
}
