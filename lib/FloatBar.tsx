import { useEffect, useRef, useState } from 'react';
import { Text } from './Txt';
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

/* labels: η ενεργή καρτέλα δείχνει και τη λέξη της (π.χ. μέσα σε κατάστημα). Τότε η μπάρα έχει δυναμικό πλάτος:
   η ενεργή καρτέλα «ανοίγει» με ελατήριο, οι άλλες κλείνουν, και η σταγόνα ακολουθεί σε θέση και μέγεθος. */
const ICON = 40, PAD = 6;
export function FloatBar({ items, state, navigateToTab, labels }: { items: TabItems; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void; labels?: boolean }) {
  const bottom = useSafeAreaInsets().bottom;
  const light = isLight(C.bg);
  const shown = state.routes.filter((r) => items[r.name]);
  const activeKey = state.routes[state.index]?.key;
  const idx = Math.max(0, shown.findIndex((r) => r.key === activeKey));
  const gap = labels ? 6 : 14, step = ICON + gap;
  // Πλάτος της λέξης κάθε καρτέλας (μετριέται μία φορά από αόρατο κείμενο).
  const [textW, setTextW] = useState<Record<string, number>>({});
  const widthOf = (i: number) => (labels && i === idx && textW[shown[i]?.name] ? ICON + textW[shown[i].name] + 14 : ICON);
  const leftOf = (i: number) => { let x = 0; for (let j = 0; j < i; j++) x += widthOf(j) + gap; return x; };
  const drv = !labels; // με λέξεις αλλάζουν πλάτη/θέσεις, που δεν τα κινεί ο native driver
  const ws = useRef(shown.map((_, i) => new Animated.Value(widthOf(i)))).current;
  const x = useRef(new Animated.Value(idx * step)).current, bw = useRef(new Animated.Value(ICON)).current;
  const stretch = useRef(new Animated.Value(1)).current, press = useRef(new Animated.Value(1)).current;
  const spring = (v: Animated.Value, to: number) => Animated.spring(v, { toValue: to, useNativeDriver: drv, friction: 7, tension: 70 });
  useEffect(() => {
    Animated.parallel([
      spring(x, labels ? leftOf(idx) : idx * step),
      ...(labels ? [spring(bw, widthOf(idx)), ...ws.map((w, i) => spring(w, widthOf(i)))] : []),
      Animated.sequence([Animated.timing(stretch, { toValue: labels ? 1.12 : 1.35, duration: 120, useNativeDriver: drv }),
        Animated.spring(stretch, { toValue: 1, useNativeDriver: drv, friction: 4, tension: 120 })]),
    ]).start();
  }, [idx, textW]);
  const onIn = () => Animated.spring(press, { toValue: labels ? 1.06 : 1.15, useNativeDriver: drv, speed: 40 }).start();
  const onOut = () => Animated.spring(press, { toValue: 1, useNativeDriver: drv, friction: 4 }).start();
  const fg = (on: boolean) => (on ? (light ? '#0a0a0a' : '#f0eee6') : light ? alpha('#0a0a0a', 0.55) : alpha('#f0eee6', 0.6));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16, paddingBottom: Math.max(bottom, 10) + 6 }}>
      {labels && (
        <View pointerEvents="none" style={{ position: 'absolute', opacity: 0, flexDirection: 'row' }}>
          {shown.map((r) => (
            <Text key={r.key} style={{ fontWeight: '700', fontSize: 14 }}
              onLayout={(e) => { const w = Math.ceil(e.nativeEvent.layout.width); setTextW((o) => (o[r.name] === w ? o : { ...o, [r.name]: w })); }}>{items[r.name].label}</Text>
          ))}
        </View>
      )}
      <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
        style={{ height: 52, borderRadius: 26, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap, paddingHorizontal: PAD,
          backgroundColor: light ? alpha('#ffffff', 0.72) : alpha('#30302e', 0.65), borderWidth: 1, borderColor: light ? alpha('#ffffff', 0.9) : alpha('#ffffff', 0.1),
          boxShadow: `0px 10px 30px ${alpha(C.shade, light ? 0.12 : 0.4)}, inset 0px 1px 0px ${alpha('#ffffff', light ? 0.9 : 0.08)}` }}>
        {/* Γυάλινη «σταγόνα» (σαν το Liquid Glass): γλιστράει με ελατήριο στην ενεργή καρτέλα,
            τεντώνει όσο κινείται και φουσκώνει λίγο όταν πατάς. */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: PAD, top: 5, width: labels ? bw : ICON, height: ICON, borderRadius: ICON / 2,
          transform: [{ translateX: x }, { scaleX: Animated.multiply(stretch, press) }, { scaleY: Animated.multiply(Animated.divide(1, stretch), press) }],
          backgroundColor: light ? alpha('#d8d8de', 0.55) : alpha('#ffffff', 0.14), borderWidth: 1, borderColor: light ? alpha('#000000', 0.06) : alpha('#ffffff', 0.12),
          boxShadow: `0px 6px 16px ${alpha('#000000', light ? 0.14 : 0.45)}, inset 0px -2px 6px ${alpha(light ? '#000000' : '#ffffff', 0.06)}` }} />
        {shown.map((r, i) => {
          const on = r.key === activeKey, it = items[r.name];
          return (
            <Pressable key={r.key} onPress={() => navigateToTab(r.key)} onPressIn={onIn} onPressOut={onOut}
              accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }}>
              <Animated.View style={{ width: labels ? ws[i] : ICON, height: ICON, borderRadius: ICON / 2, overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
                justifyContent: labels ? 'flex-start' : 'center', paddingLeft: labels ? 10.5 : 0, gap: 6 }}>
                <Icon name={it.icon} size={19} color={fg(on)} />
                {labels && on && <Text numberOfLines={1} style={{ color: fg(true), fontWeight: '700', fontSize: 14 }}>{it.label}</Text>}
              </Animated.View>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}
