import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { isLight } from './theme';
import { C, Icon, alpha } from './ui';
import type { IconName } from './Icon';

/* Η πλωτή γυάλινη κάτω μπάρα («χάπι»), κοινή για τη λειτουργία πελάτη και τη λειτουργία επιχείρησης.
   Λευκή στο ανοιχτό θέμα, σκούρα στο σκούρο· η ενεργή καρτέλα είναι ένας απλός κύκλος.
   Οι οθόνες αφήνουν κάτω κενό TAB_SPACE ώστε το τελευταίο στοιχείο να μην κρύβεται πίσω της. */
export type TabItems = Record<string, { icon: IconName; label: string }>;

export function FloatBar({ items, state, navigateToTab }: { items: TabItems; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const bottom = useSafeAreaInsets().bottom;
  const light = isLight(C.bg);
  const shown = state.routes.filter((r) => items[r.name]);
  const activeKey = state.routes[state.index]?.key;
  const idx = Math.max(0, shown.findIndex((r) => r.key === activeKey));
  const x = useRef(new Animated.Value(idx * 54)).current, stretch = useRef(new Animated.Value(1)).current, press = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(x, { toValue: idx * 54, useNativeDriver: true, friction: 7, tension: 70 }),
      Animated.sequence([Animated.timing(stretch, { toValue: 1.35, duration: 120, useNativeDriver: true }),
        Animated.spring(stretch, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 })]),
    ]).start();
  }, [idx]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16, paddingBottom: Math.max(bottom, 10) + 6 }}>
      <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
        style={{ height: 52, borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 6,
          backgroundColor: light ? alpha('#ffffff', 0.72) : alpha('#30302e', 0.65), borderWidth: 1, borderColor: light ? alpha('#ffffff', 0.9) : alpha('#ffffff', 0.1),
          boxShadow: `0px 10px 30px ${alpha(C.shade, light ? 0.12 : 0.4)}, inset 0px 1px 0px ${alpha('#ffffff', light ? 0.9 : 0.08)}` }}>
        {/* Γυάλινη «σταγόνα» (σαν το Liquid Glass): γλιστράει με ελατήριο στην ενεργή καρτέλα,
            τεντώνει όσο κινείται και φουσκώνει λίγο όταν πατάς. */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 6, top: 5, width: 40, height: 40, borderRadius: 20,
          transform: [{ translateX: x }, { scaleX: Animated.multiply(stretch, press) }, { scaleY: Animated.multiply(Animated.divide(1, stretch), press) }],
          backgroundColor: light ? alpha('#d8d8de', 0.55) : alpha('#ffffff', 0.14), borderWidth: 1, borderColor: light ? alpha('#000000', 0.06) : alpha('#ffffff', 0.12),
          boxShadow: `0px 6px 16px ${alpha('#000000', light ? 0.14 : 0.45)}, inset 0px -2px 6px ${alpha(light ? '#000000' : '#ffffff', 0.06)}` }} />
        {shown.map((r, i) => {
          const on = r.key === activeKey, it = items[r.name];
          const go = () => navigateToTab(r.key);
          return (
            <Pressable key={r.key} onPress={go} onPressIn={() => Animated.spring(press, { toValue: 1.15, useNativeDriver: true, speed: 40 }).start()}
              onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
              accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={it.icon} size={19} color={on ? (light ? '#0a0a0a' : '#f0eee6') : light ? alpha('#0a0a0a', 0.55) : alpha('#f0eee6', 0.6)} />
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}
