import { Animated, Text, View, useWindowDimensions } from 'react-native';
import { C } from '../../ui';
import { CATS, GAP, TH, TW, Tile, k, rise, useLoop, useStagger, type V } from '../motion';
import { Actions, LetterLogo, SUB, Shell, TITLE, WelcomeProps, subStyle, titleStyle } from './common';

/* 3 — «Ταινία»: οι κατηγορίες κυλάνε σε τρεις σειρές, η μεσαία ανάποδα από τις άλλες,
   σαν ταινία που δεν τελειώνει. Στη μεσαία σειρά, όποιο πλακίδιο περνάει από το κέντρο γίνεται μπλε.
   Το λογότυπο χτίζεται γράμμα-γράμμα και ο τίτλος ανεβαίνει λέξη-λέξη. */

const STEP = TW + GAP, W = CATS.length * STEP;

function Row({ r, dir, ms, enter, width, lit, reduce }: { r: number; dir: 1 | -1; ms: number; enter: V; width: number; lit: boolean; reduce: boolean }) {
  const t = useLoop(ms, !reduce);
  const order = CATS.map((_, j) => CATS[(j + r * 3) % CATS.length]);
  const items = [...order, ...order];
  const from = dir === 1 ? 0 : -W, to = dir === 1 ? -W : 0;
  const cx = width / 2 - TW / 2;      // πού πρέπει να βρίσκεται ένα πλακίδιο για να είναι στο κέντρο
  return (
    <Animated.View style={{ height: TH, opacity: enter, transform: [{ translateX: k(enter, [0, 1], [dir * 120, 0]) }] }}>
      <Animated.View style={{ flexDirection: 'row', gap: GAP, width: W * 2, transform: [{ translateX: k(t, [0, 1], [from, to]) }] }}>
        {items.map((c, j) => {
          let on;
          if (lit) {
            // x(t) = j·STEP + from + (to − from)·t  →  πότε περνάει από το κέντρο
            const t0 = (cx - j * STEP - from) / (to - from), d = STEP / W;
            on = k(t, [t0 - d * 0.55, t0 - d * 0.2, t0 + d * 0.2, t0 + d * 0.55], [0, 1, 1, 0]);
          }
          return <Tile key={j} c={c} on={on} />;
        })}
      </Animated.View>
    </Animated.View>
  );
}

/* Απαλό σβήσιμο στις άκρες, φτιαγμένο από λωρίδες στο χρώμα του φόντου. */
const Fade = ({ side }: { side: 'left' | 'right' }) => (
  <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 56, flexDirection: side === 'left' ? 'row' : 'row-reverse' }}>
    {[1, 0.86, 0.7, 0.55, 0.4, 0.27, 0.15, 0.06].map((a, i) => (
      <View key={i} style={{ flex: 1, backgroundColor: C.bg, opacity: a }} />
    ))}
  </View>
);

export default function Reel(p: WelcomeProps) {
  const { width } = useWindowDimensions();
  const letters = useStagger(6, { delay: 60, step: 70, spring: true });
  const rows = useStagger(3, { delay: 200, step: 120, ms: 700 });
  const words = TITLE.map((l) => l.split(' '));
  const wv = useStagger(words.flat().length, { delay: 560, step: 70 });
  const parts = useStagger(4, { delay: 1000, step: 90, spring: true });
  let w = 0;

  return (
    <Shell
      logo={<LetterLogo vals={letters} size={30} />}
      grid={
        <View style={{ marginHorizontal: -20, gap: GAP }}>
          <Row r={0} dir={1} ms={30000} enter={rows[0]} width={width} lit={false} reduce={p.reduce} />
          <Row r={1} dir={-1} ms={24000} enter={rows[1]} width={width} lit reduce={p.reduce} />
          <Row r={2} dir={1} ms={34000} enter={rows[2]} width={width} lit={false} reduce={p.reduce} />
          <Fade side="left" /><Fade side="right" />
        </View>
      }
      text={<>
        <View>
          {words.map((line, li) => (
            <View key={li} style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: 8 }}>
              {line.map((word) => {
                const v = wv[w++];
                return <Animated.Text key={word} style={[titleStyle, { opacity: v, transform: [{ translateY: k(v, [0, 1], [22, 0]) }] }]}>{word}</Animated.Text>;
              })}
            </View>
          ))}
        </View>
        <Animated.View style={rise(parts[0], 10)}><Text style={subStyle}>{SUB.join(' ')}</Text></Animated.View>
      </>}
      actions={<Actions p={p} styles={[rise(parts[1], 60), rise(parts[2], 60), rise(parts[3], 30)]} />}
    />
  );
}
