import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { usePerson } from '../profile/data';
import { Initials } from '../profile/parts';
import { C, Icon, s } from '../ui';
import type { IconName } from '../Icon';
import { useStore } from './data';
import { ExitPill, StoreLogo } from './parts';
import { askLogin } from '../guest';
import { useRouter } from 'expo-router';

/* Το κατάστημα σε υπολογιστή: σαν ξεχωριστή εφαρμογή, με δική του πάνω μπάρα (‹ SpotOn, λογότυπο και όνομα, καρτέλες,
   Σύνδεση ή ο λογαριασμός), περιεχόμενο σε στήλη στη μέση και, μόνο στην Κράτηση, δεξιά η σύνοψη και το πακέτο.
   Στο κινητό μένει η κάτω μπάρα. */

export function StoreTopBar({ items, state, navigateToTab }: { items: Record<string, { icon: IconName; label: string }>; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const S = useStore();
  const P = usePerson();
  const activeKey = state.routes[state.index]?.key;
  const router = useRouter();
  return (
    <View style={[s.row, { gap: 20, paddingVertical: 12, paddingHorizontal: 40, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg }]}>
      <ExitPill />
      <View style={[s.row, { gap: 10, flex: 1, minWidth: 0 }]}>
        <StoreLogo size={40} />
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{S.biz?.name ?? ''}</Text>
          <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>{[S.biz?.address, S.biz?.city].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <View style={[s.row, { gap: 4 }]}>
        {state.routes.filter((r) => items[r.name]).map((r) => {
          const on = r.key === activeKey;
          return (
            <Pressable key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={({ pressed, hovered }: any) => [s.row, { gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
                backgroundColor: on ? C.text : pressed || hovered ? C.soft : 'transparent' }]}>
              <Icon name={items[r.name].icon} size={17} color={on ? C.bg : C.text} />
              <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 14 }}>{items[r.name].label}</Text>
            </Pressable>
          );
        })}
      </View>
      {P.guest ? (
        <Pressable onPress={() => askLogin()} accessibilityRole="button"
          style={({ pressed, hovered }: any) => ({ paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: C.text, opacity: pressed || hovered ? 0.85 : 1 })}>
          <Text style={{ color: C.bg, fontWeight: '800', fontSize: 14 }}>Σύνδεση</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push(`/store/${S.id}/account`)} accessibilityLabel="Ο λογαριασμός μου" style={({ hovered }: any) => ({ opacity: hovered ? 0.8 : 1 })}>
          <Initials text={P.initials} size={38} />
        </Pressable>
      )}
    </View>
  );
}

/* Τίτλος καρτέλας σε υπολογιστή: το κατάστημα φαίνεται ήδη στην πάνω μπάρα, εδώ μένει μόνο ο τίτλος. */
export function DeskTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 26, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 12, backgroundColor: C.bg }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 28, letterSpacing: -0.5 }} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
