import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, s } from '../../ui';
import { LinkText } from '../parts';
import { k, type V } from '../motion';

/* Κομμάτια του καλωσορίσματος: σκελετός, κείμενα, κουμπιά, λογότυπο γράμμα-γράμμα. */

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
