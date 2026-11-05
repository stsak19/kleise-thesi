import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Text, View, ViewStyle } from 'react-native';
import { C, CATEGORIES, alpha } from '../ui';

/* Εργαλεία για τις κινούμενες εκδοχές της οθόνης σύνδεσης (μόνο Animated του React Native). */

export type V = Animated.Value;
/* Στο κινητό τα transform/opacity τρέχουν στο native thread· στον browser δεν υποστηρίζεται. */
export const ND = Platform.OS !== 'web';
export const k = (t: Animated.Value | Animated.AnimatedInterpolation<number>, i: number[], o: (number | string)[]) =>
  (t as Animated.Value).interpolate({ inputRange: i, outputRange: o as any, extrapolate: 'clamp' }) as any;

/* Οι 9 κατηγορίες του πλέγματος (3×3) και οι διαστάσεις του. */
export const CATS = CATEGORIES.filter((c) => !['other', 'physio', 'medical', 'tattoo'].includes(c.key));
export const TW = 88, TH = 74, GAP = 10;
export const GW = TW * 3 + GAP * 2, GH = TH * 3 + GAP * 2;
export const tx = (i: number) => (i % 3) * (TW + GAP);
export const ty = (i: number) => Math.floor(i / 3) * (TH + GAP);

/* Αν ο χρήστης έχει ζητήσει λιγότερη κίνηση, οι επαναλαμβανόμενες κινήσεις σταματούν. */
export function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setR);
    return () => sub?.remove?.();
  }, []);
  return r;
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

/* Ένα «χτύπημα» κάθε `ms`: επιστρέφει έναν μετρητή που αυξάνεται. */
export function useTick(ms: number, on = true) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [on, ms]);
  return n;
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

/* Τιμή που ακολουθεί ομαλά έναν στόχο (π.χ. 0/1 για «επιλεγμένο»). */
export function useFollow(target: number, ms = 380, spring = false) {
  const v = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    const a = spring
      ? Animated.spring(v, { toValue: target, friction: 7, tension: 80, useNativeDriver: ND })
      : Animated.timing(v, { toValue: target, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: ND });
    a.start(); return () => a.stop();
  }, [target]);
  return v;
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
