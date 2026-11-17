import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './Txt';
import { BIZ_HOME, CLIENT_HOME, switchMode, useMode, type Mode } from './mode';
import { C, Icon, TAB_SPACE, alpha } from './ui';

/* Η αλλαγή ανάμεσα σε πελάτη και επιχείρηση, όπως το «Switch to hosting» του Airbnb. */

/* Καθαρίζει ό,τι είναι ανοιχτό από πάνω και αντικαθιστά τη μία λειτουργία με την άλλη, ώστε το «πίσω» να μη γυρίζει στην παλιά. */
export function goHome(router: ReturnType<typeof useRouter>, m: Mode) {
  try { if (router.canDismiss()) router.dismissAll(); } catch {}
  router.replace(m === 'biz' ? BIZ_HOME : CLIENT_HOME);
}

export function useSwitchTo() {
  const router = useRouter();
  return (m: Mode) => switchMode(m, () => goHome(router, m));
}

/* Η σύντομη οθόνη που καλύπτει την εφαρμογή όσο αλλάζει η λειτουργία. */
export function SwitchOverlay() {
  const { switching } = useMode();
  const fade = useRef(new Animated.Value(0)).current;
  const last = useRef<Mode>('biz');
  if (switching) last.current = switching;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (switching) setShown(true);
    Animated.timing(fade, { toValue: switching ? 1 : 0, duration: switching ? 260 : 320, useNativeDriver: true }).start(() => { if (!switching) setShown(false); });
  }, [switching]);
  if (!shown && !switching) return null;
  const biz = last.current === 'biz';
  return (
    <Animated.View pointerEvents={switching ? 'auto' : 'none'}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 18, opacity: fade }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={biz ? 'store' : 'user'} size={32} color={C.text} />
      </View>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, letterSpacing: -0.3 }}>
        {biz ? 'Μετάβαση στην επιχείρηση' : 'Μετάβαση σε πελάτη'}
      </Text>
    </Animated.View>
  );
}
