import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, TextInput } from '../Txt';
import { isLight } from '../theme';
import { usePerson } from '../profile/data';
import { useMyBookings, countdown } from '../bookings/data';
import { C, Icon, alpha, s } from '../ui';
import { Initials } from '../profile/parts';
import { upper } from '../store/parts';
import type { IconName } from '../Icon';

/* Ο πελάτης σε υπολογιστή (εκδοχή Β): πλαϊνό μενού όπως στο admin (λογότυπο, Αρχική · Κρατήσεις · Πακέτα,
   η επόμενη κράτηση και ο λογαριασμός κάτω). Η αρχική έχει τη γυάλινη αναζήτηση στο κέντρο. Στο κινητό δεν χρησιμοποιείται τίποτα από εδώ. */

export type SideItems = Record<string, { icon: IconName; label: string }>;
type Nav = { items: SideItems; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void };

export function ClientSide({ items, state, navigateToTab }: Nav) {
  const person = usePerson();
  const activeKey = state.routes[state.index]?.key;
  const route = (name: string) => state.routes.find((r) => r.name === name);
  const profile = route('(profile)');
  const home = route('(search)');
  return (
    <View style={{ width: 248, backgroundColor: alpha(C.text, 0.02), borderRightWidth: 1, borderRightColor: C.line, paddingVertical: 20, paddingHorizontal: 14, gap: 4 }}>
      <Pressable onPress={() => home && navigateToTab(home.key)} accessibilityRole="link" accessibilityLabel="SpotOn, αρχική"
        style={[s.row, { gap: 8, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 22 }]}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.bg, fontWeight: '800', fontSize: 15 }}>S</Text>
        </View>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 22, letterSpacing: -0.6 }}>SpotOn</Text>
      </Pressable>
      {/* σειρά του μενού όπως στο ITEMS (όχι όπως στη μπάρα του κινητού) */}
      {Object.keys(items).map(route).filter((r): r is { key: string; name: string } => !!r).map((r) => {
        const on = r.key === activeKey;
        return (
          <Pressable key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={({ pressed, hovered }: any) => [s.row, { gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12,
              backgroundColor: on ? C.text : pressed || hovered ? C.soft : 'transparent' }]}>
            <Icon name={items[r.name].icon} size={19} color={on ? C.bg : C.text} />
            <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 15 }}>{items[r.name].label}</Text>
          </Pressable>
        );
      })}
      <View style={{ flex: 1 }} />
      <NextBooking />
      {profile && (
        <Pressable onPress={() => navigateToTab(profile.key)} accessibilityRole="tab" accessibilityState={{ selected: profile.key === activeKey }}
          style={({ pressed, hovered }: any) => [s.row, { gap: 10, padding: 8, marginTop: 8, borderRadius: 12,
            backgroundColor: profile.key === activeKey || pressed || hovered ? C.soft : 'transparent' }]}>
          <Initials text={person.initials} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{person.name || 'Ο λογαριασμός μου'}</Text>
            <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>Προφίλ & ρυθμίσεις</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/* Η επόμενη κράτηση, κάτω αριστερά. Πάτημα → ανοίγει το κατάστημα. */
function NextBooking() {
  const D = useMyBookings();
  const b = D.upcoming[0];
  if (!b) return null;
  return (
    <Pressable onPress={() => D.open(b)} style={({ hovered }: any) => ({ backgroundColor: C.ink, borderRadius: 16, padding: 14, gap: 3, opacity: hovered ? 0.85 : 1 })}>
      <Text style={{ color: alpha(C.inkText, 0.6), fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{upper(countdown(b))}</Text>
      <Text style={{ color: C.inkText, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{b.business}</Text>
      <Text style={{ color: alpha(C.inkText, 0.6), fontSize: 13 }} numberOfLines={1}>
        {b.service} · <Text style={{ color: C.inkText, fontWeight: '800' }}>{b.time.slice(0, 5)}</Text>
      </Text>
    </Pressable>
  );
}

/* Γυάλινη αναζήτηση στο κέντρο της αρχικής. */
export function DeskSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focus, setFocus] = useState(false);
  const light = isLight(C.bg);
  return (
    <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'}
      style={{ width: '100%', maxWidth: 600, alignSelf: 'center', height: 50, borderRadius: 25, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20,
        backgroundColor: light ? alpha('#ffffff', 0.75) : alpha('#30302e', 0.65), borderWidth: 1,
        borderColor: focus ? alpha(C.text, 0.25) : light ? alpha('#000000', 0.06) : alpha('#ffffff', 0.1),
        boxShadow: `0px 8px 22px ${alpha(C.shade, light ? (focus ? 0.16 : 0.1) : 0.4)}` }}>
      <Icon name="search" size={18} color={focus ? C.text : C.mute} />
      <TextInput placeholder="Αναζήτηση" placeholderTextColor={C.mute} value={value} onChangeText={onChange} returnKeyType="search"
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={[{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600', height: 50 }, { outlineStyle: 'none' } as any]} />
      {!!value && (
        <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Καθαρισμός αναζήτησης">
          <Icon name="close" size={14} color={C.mute} />
        </Pressable>
      )}
    </BlurView>
  );
}
