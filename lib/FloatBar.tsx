import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, Icon } from './ui';
import type { IconName } from './Icon';

/* Η κάτω μπάρα σε στιλ Instagram: πιάνει όλο το πλάτος, απλό φόντο με λεπτή γραμμή από πάνω,
   μόνο εικονίδια. Η ενεργή καρτέλα ξεχωρίζει με πιο έντονο, σκούρο εικονίδιο (χωρίς φόντο).
   Κοινή για τη λειτουργία πελάτη και τη λειτουργία επιχείρησης. */
export type TabItems = Record<string, { icon: IconName; label: string }>;

export function FloatBar({ items, state, navigateToTab }: { items: TabItems; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const bottom = useSafeAreaInsets().bottom;
  const activeKey = state.routes[state.index]?.key;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopWidth: 0.5, borderTopColor: C.line,
      paddingBottom: Math.max(bottom, 6), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 52 + Math.max(bottom, 6) }}>
      {state.routes.filter((r) => items[r.name]).map((r) => {
        const on = r.key === activeKey, it = items[r.name];
        return (
          <Pressable key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }}
            hitSlop={8} style={({ pressed }) => ({ flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.88 : 1 }] })}>
            <Icon name={it.icon} size={on ? 26 : 25} color={on ? C.text : C.mute} />
          </Pressable>
        );
      })}
    </View>
  );
}
