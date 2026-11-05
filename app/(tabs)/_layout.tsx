import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, Icon, alpha } from '../../lib/ui';
import type { IconName } from '../../lib/Icon';

/* Η κάτω μπάρα: Αναζήτηση · Κρατήσεις · Πακέτα · Προφίλ. Πάντα ορατή, και μέσα σε ένα κατάστημα.
   Είναι ένα πλωτό «χάπι» πάνω από το περιεχόμενο· η ενεργή καρτέλα είναι ένας πράσινος κύκλος.
   Οι οθόνες αφήνουν κάτω κενό TAB_SPACE ώστε το τελευταίο στοιχείο να μην κρύβεται πίσω της. */
const ICONS: Record<string, { icon: IconName; label: string }> = {
  '(search)': { icon: 'search', label: 'Αναζήτηση' },
  bookings: { icon: 'calendar', label: 'Κρατήσεις' },
  packs: { icon: 'pack', label: 'Πακέτα' },
  '(profile)': { icon: 'user', label: 'Προφίλ' },
};

function FloatBar({ state, navigateToTab }: { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const bottom = useSafeAreaInsets().bottom;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: Math.max(bottom, 10) + 6 }}>
      <View style={{ height: 64, borderRadius: 32, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        paddingHorizontal: 6, borderWidth: 1, borderColor: C.inkLine, boxShadow: `0px 10px 30px ${alpha(C.shade, 0.22)}` }}>
        {state.routes.map((r, i) => {
          const on = state.index === i, it = ICONS[r.name];
          if (!it) return null;
          const press = () => navigateToTab(r.key);
          return (
            <Pressable key={r.key} onPress={press} accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? C.neon : 'transparent', opacity: pressed ? 0.75 : 1,
                boxShadow: on ? `0px 4px 16px ${alpha(C.neon, 0.45)}` : undefined })}>
              <Icon name={it.icon} size={21} color={on ? '#0a0a0a' : alpha(C.inkText, 0.6)} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <FloatBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="(search)" options={{ title: 'Αναζήτηση' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις' }} />
      <Tabs.Screen name="packs" options={{ title: 'Πακέτα' }} />
      <Tabs.Screen name="(profile)" options={{ title: 'Προφίλ' }} />
    </Tabs>
  );
}
