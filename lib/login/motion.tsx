import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View, ViewStyle } from 'react-native';
import { Text } from '../Txt';
import { C, CATEGORIES, alpha } from '../ui';
import { usePrefs } from '../prefs';

/* Εργαλεία για την κίνηση στην οθόνη σύνδεσης (μόνο Animated του React Native). */

export type V = Animated.Value;
/* Στο κινητό τα transform/opacity τρέχουν στο native thread· στον browser δεν υποστηρίζεται. */
export const ND = Platform.OS !== 'web';
export const k = (t: Animated.Value | Animated.AnimatedInterpolation<number>, i: number[], o: (number | string)[]) =>
  (t as Animated.Value).interpolate({ inputRange: i, outputRange: o as any, extrapolate: 'clamp' }) as any;

/* Οι 9 κατηγορίες της ταινίας και οι διαστάσεις ενός πλακιδίου. */
export const CATS = CATEGORIES.filter((c) => !['other', 'physio', 'medical', 'tattoo'].includes(c.key));
export const TW = 88, TH = 74, GAP = 10;

/* Αν ο χρήστης έχει ζητήσει λιγότερη κίνηση (στο κινητό ή στις Ρυθμίσεις), οι επαναλαμβανόμενες κινήσεις σταματούν. */
export function useReduceMotion() {
  const app = usePrefs().reduceMotion;
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setR);
    return () => sub?.remove?.();
  }, []);
  return r || app;
}

/* Ρολόι 0→1 που επαναλαμβάνεται συνεχώς (για κύματα, ταινίες κ.λπ.). */
export function useLoop(ms: number, on = true) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) { t.setValue(0); return; }
    const a = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: ND }));
    a.start(); return () => a.stop();
  }, [on, ms]);
  return t;
}

/* Είσοδος: n τιμές 0→1, η μία μετά την άλλη. */
export function useStagger(n: number, { delay = 0, step = 70, ms = 520, spring = false } = {}) {
  const vals = useRef([...Array(n)].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const anims = vals.map((v, i) => Animated.sequence([
      Animated.delay(delay + i * step),
      spring
        ? Animated.spring(v, { toValue: 1, friction: 6, tension: 70, useNativeDriver: ND })
        : Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
    ]));
    const a = Animated.parallel(anims); a.start(); return () => a.stop();
  }, []);
  return vals;
}

/* Είσοδος από κάτω με σβήσιμο: style για Animated.View. */
export const rise = (v: V, dy = 18): any => ({ opacity: v, transform: [{ translateY: k(v, [0, 1], [dy, 0]) }] });

/* Ένα πλακίδιο κατηγορίας. Το `on` (0→1) ανάβει το κύριο χρώμα από πάνω, ώστε η αλλαγή να είναι ομαλή. */
export function Tile({ c, on, style }: { c: (typeof CATS)[number]; on?: Animated.Value | Animated.AnimatedInterpolation<number>; style?: ViewStyle }) {
  return (
    <View style={[{ width: TW, height: TH, borderRadius: 20, backgroundColor: C.soft }, style]}>
      <Face c={c} color={C.mute} />
      {on && (
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, backgroundColor: C.accent, opacity: on,
          boxShadow: `0px 10px 24px ${alpha(C.accent, 0.35)}` }}>
          <Face c={c} color={C.onAccent} />
        </Animated.View>
      )}
    </View>
  );
}
const Face = ({ c, color }: { c: (typeof CATS)[number]; color: string }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
    <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
    <Text style={{ fontSize: 11, fontWeight: '700', color }} numberOfLines={1}>{c.label}</Text>
  </View>
);
