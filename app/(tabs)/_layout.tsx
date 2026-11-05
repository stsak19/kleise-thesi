import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { isLight } from '../../lib/theme';
import { C, Icon, alpha } from '../../lib/ui';
import type { IconName } from '../../lib/Icon';

/* Η κάτω μπάρα: Αναζήτηση · Κρατήσεις · Πακέτα · Προφίλ. Πάντα ορατή, και μέσα σε ένα κατάστημα.
   Είναι ένα πλωτό γυάλινο «χάπι» πάνω από το περιεχόμενο (λευκό στο ανοιχτό θέμα, σκούρο στο σκούρο)·
   η ενεργή καρτέλα είναι ένας απλός κύκλος (μαύρος στο ανοιχτό, λευκός στο σκούρο).
   Οι οθόνες αφήνουν κάτω κενό TAB_SPACE ώστε το τελευταίο στοιχείο να μην κρύβεται πίσω της. */
const ICONS: Record<string, { icon: IconName; label: string }> = {
  '(search)': { icon: 'search', label: 'Αναζήτηση' },
  bookings: { icon: 'calendar', label: 'Κρατήσεις' },
  packs: { icon: 'pack', label: 'Πακέτα' },
  '(profile)': { icon: 'user', label: 'Προφίλ' },
};

function FloatBar({ state, navigateToTab }: { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const bottom = useSafeAreaInsets().bottom;
  const light = isLight(C.bg);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: Math.max(bottom, 10) + 6 }}>
      <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
        style={{ height: 64, borderRadius: 32, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6,
          backgroundColor: light ? alpha('#ffffff', 0.72) : alpha('#1c1c1c', 0.6), borderWidth: 1, borderColor: light ? alpha('#ffffff', 0.9) : alpha('#ffffff', 0.1),
          boxShadow: `0px 10px 30px ${alpha(C.shade, light ? 0.12 : 0.4)}, inset 0px 1px 0px ${alpha('#ffffff', light ? 0.9 : 0.08)}` }}>
        {state.routes.map((r, i) => {
          const on = state.index === i, it = ICONS[r.name];
          if (!it) return null;
          const press = () => navigateToTab(r.key);
          return (
            <Pressable key={r.key} onPress={press} accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? (light ? '#e3e3e8' : '#ffffff') : 'transparent', opacity: pressed ? 0.75 : 1,
                boxShadow: on ? `0px 4px 12px ${alpha('#000000', light ? 0.18 : 0.4)}` : undefined })}>
              <Icon name={it.icon} size={21} color={on ? '#0a0a0a' : light ? alpha('#0a0a0a', 0.55) : alpha('#ffffff', 0.6)} />
            </Pressable>
          );
        })}
      </BlurView>
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
