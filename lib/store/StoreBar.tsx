import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Text } from '../Txt';
import { C, Icon, alpha, onColor } from '../ui';
import { isLight } from '../theme';
import type { IconName } from '../Icon';
import { useStore } from './data';
import { useBook } from './book';

/* Η κάτω μπάρα του καταστήματος στο κινητό (εκδοχή Β, 2026-11-18):
   Κατάστημα · [Κλείσε ώρα] στη μέση, μεγάλο κουμπί στο χρώμα του καταστήματος · Κρατήσεις (με τον αριθμό τους).
   Το μεσαίο δεν είναι καρτέλα: ανοίγει την κράτηση (πρόγραμμα στα μαθήματα, βήματα στα ραντεβού). */
type Props = { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void };

export function StoreBar({ state, navigateToTab }: Props) {
  const S = useStore();
  const B = useBook();
  const bottom = useSafeAreaInsets().bottom;
  const light = isLight(C.bg);
  const color = S.st?.color ?? C.accent;
  const active = state.routes[state.index]?.name;
  const keyOf = (name: string) => state.routes.find((r) => r.name === name)?.key;
  const n = S.upcoming.length + S.waits.length;
  const can = S.services.length > 0;
  const fg = (on: boolean) => (on ? C.text : alpha(C.text, 0.55));

  const book = () => {
    if (active !== 'index') { const k = keyOf('index'); if (k) navigateToTab(k); }
    B.go();
  };

  const Tab = ({ name, icon, label, badge }: { name: string; icon: IconName; label: string; badge?: number }) => {
    const on = active === name;
    return (
      <Pressable onPress={() => { const k = keyOf(name); if (k) navigateToTab(k); }} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }}
        style={({ pressed }) => ({ width: 78, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: pressed ? 0.7 : 1,
          backgroundColor: on ? (light ? alpha('#d8d8de', 0.55) : alpha('#ffffff', 0.14)) : 'transparent' })}>
        <Icon name={icon} size={19} color={fg(on)} />
        <Text style={{ color: fg(on), fontSize: 11, fontWeight: on ? '800' : '700' }} numberOfLines={1}>{label}</Text>
        {!!badge && (
          <View style={{ position: 'absolute', top: 3, right: 16, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.bad, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.onBad, fontSize: 11, fontWeight: '800' }}>{badge}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: Math.max(bottom, 10) + 6 }}>
      <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
        style={{ height: 64, borderRadius: 32, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6,
          backgroundColor: light ? alpha('#ffffff', 0.78) : alpha('#30302e', 0.7), borderWidth: 1, borderColor: light ? alpha('#ffffff', 0.9) : alpha('#ffffff', 0.1),
          boxShadow: `0px 10px 30px ${alpha(C.shade, light ? 0.14 : 0.4)}, inset 0px 1px 0px ${alpha('#ffffff', light ? 0.9 : 0.08)}` }}>
        <Tab name="index" icon="store" label="Κατάστημα" />
        <Pressable onPress={book} disabled={!can} accessibilityRole="button" accessibilityLabel={B.cta}
          style={({ pressed }) => ({ flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: color,
            opacity: can ? 1 : 0.4, transform: [{ scale: pressed ? 0.97 : 1 }], boxShadow: `0px 6px 16px ${alpha(color, 0.35)}` })}>
          <Text style={{ color: onColor(color), fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{B.cta}</Text>
        </Pressable>
        <Tab name="bookings" icon="calendar" label="Κρατήσεις" badge={n} />
      </BlurView>
    </View>
  );
}
