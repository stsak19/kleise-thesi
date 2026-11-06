import { isLight } from '../../theme';
import { Animated, View } from 'react-native';
import { Text, AText } from '../../Txt';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, s } from '../../ui';
import { LinkText } from '../parts';
import { k, type V } from '../motion';
// Στην ιστοσελίδα τα καταστήματα ανοίγουν ήδη χωρίς λογαριασμό· εδώ μένει μόνο το demo με δοκιμαστικά δεδομένα.
import { GUEST_OK } from '../../guest';

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
      <Animated.View style={styles[2]}><LinkText title={GUEST_OK ? 'Δες το demo' : 'Συνέχεια χωρίς λογαριασμό'} onPress={p.onGuest} color={C.mute} /></Animated.View>
    </>
  );
}

/* Λογότυπο που «χτίζεται» γράμμα-γράμμα. */
export function LetterLogo({ vals, size = 30 }: { vals: V[]; size?: number }) {
  const letters = 'SpotOn'.split('');
  const L = (i: number) => (
    <AText key={i} style={{ fontSize: size, fontWeight: '800', letterSpacing: -size * 0.04, color: i >= 4 ? C.mute : C.text,
      opacity: vals[i], transform: [{ translateY: k(vals[i], [0, 1], [-26, 0]) }, { scale: k(vals[i], [0, 0.6, 1], [0.4, 1.15, 1]) }] }}>{letters[i]}</AText>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[0, 1, 2, 3].map(L)}
      <Animated.View style={[{ flexDirection: 'row', opacity: vals[4] }]}>{[4, 5].map(L)}</Animated.View>
    </View>
  );
}
