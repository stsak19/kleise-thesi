import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, R, alpha, s } from '../../ui';
import { LinkText } from '../parts';
import { k, useLoop, type V } from '../motion';

/* Κοινά κομμάτια των οθονών καλωσορίσματος. Κάθε εκδοχή τα κινεί με τον δικό της τρόπο. */

export type WelcomeProps = { onUp: () => void; onIn: () => void; onGuest: () => void; reduce: boolean };

export const TITLE = ['Όλα τα ραντεβού σου,', 'σε ένα μέρος'];
export const SUB = ['Βρες κατάστημα,', 'διάλεξε ώρα,', 'κλείσε θέση.'];

export const titleStyle = [s.title, { textAlign: 'center' as const, fontSize: 30 }];
export const subStyle = { color: C.mute, fontSize: 16, lineHeight: 23, textAlign: 'center' as const };

/* Ο σκελετός: λογότυπο πάνω, πλέγμα + κείμενα στη μέση, κουμπιά κάτω. */
export function Shell({ logo, grid, text, actions }: { logo: React.ReactNode; grid: React.ReactNode; text: React.ReactNode; actions: React.ReactNode }) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: top + 18, paddingBottom: bottom + 24, paddingHorizontal: 20, overflow: 'hidden' }]}>
      <View style={{ alignItems: 'center', zIndex: 2 }}>{logo}</View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 30 }}>
        {grid}
        <View style={{ gap: 8 }}>{text}</View>
      </View>
      <View style={{ gap: 10 }}>{actions}</View>
    </View>
  );
}

/* Τα κουμπιά. Κάθε ένα μπορεί να έχει δικό του style κίνησης (είσοδος, παλμός…). */
export function Actions({ p, styles = [], primaryExtra }: { p: WelcomeProps; styles?: any[]; primaryExtra?: React.ReactNode }) {
  return (
    <>
      <Animated.View style={styles[0]}>
        <Btn title="Δημιουργία λογαριασμού" onPress={p.onUp} />
        {primaryExtra}
      </Animated.View>
      <Animated.View style={styles[1]}><Btn kind="ghost" title="Έχω ήδη λογαριασμό" onPress={p.onIn} /></Animated.View>
      <View style={{ height: 6 }} />
      <Animated.View style={styles[2]}><LinkText title="Συνέχεια χωρίς λογαριασμό" onPress={p.onGuest} color={C.mute} /></Animated.View>
    </>
  );
}

/* Μια λωρίδα φωτός που περνάει πάνω από το κύριο κουμπί. */
export function Shine({ on, every = 3200 }: { on: boolean; every?: number }) {
  const t = useLoop(every, on);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: R.md, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', top: -20, bottom: -20, width: 46, backgroundColor: alpha(C.btnText, 0.28),
        transform: [{ translateX: k(t, [0, 0.45, 1], [-80, 420, 420]) }, { rotate: '18deg' }] }} />
    </View>
  );
}

/* Λογότυπο που «χτίζεται» γράμμα-γράμμα. */
export function LetterLogo({ vals, size = 30 }: { vals: V[]; size?: number }) {
  const letters = 'SpotOn'.split('');
  return (
    <View style={{ flexDirection: 'row' }}>
      {letters.map((ch, i) => (
        <Animated.Text key={i} style={{ fontSize: size, fontWeight: '900', letterSpacing: -size * 0.03, color: i >= 4 ? C.accent : C.text,
          opacity: vals[i], transform: [{ translateY: k(vals[i], [0, 1], [-26, 0]) }, { scale: k(vals[i], [0, 0.6, 1], [0.4, 1.15, 1]) }] }}>{ch}</Animated.Text>
      ))}
    </View>
  );
}

/* Ημιτονοειδής κίνηση από ένα ρολόι 0→1: amp·sin(2π(t + phase)). */
export function wave(t: V, phase: number, amp: number) {
  const n = 16, xs = [...Array(n + 1)].map((_, i) => i / n);
  return t.interpolate({ inputRange: xs, outputRange: xs.map((x) => amp * Math.sin(2 * Math.PI * (x + phase))) });
}

