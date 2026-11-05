import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { C } from '../../ui';
import { CATS, GH, GW, ND, Tile, k, rise, tx, ty, useFollow, useStagger, useTick, type V } from '../motion';
import { Actions, SUB, Shell, Shine, TITLE, WelcomeProps, subStyle, titleStyle } from './common';

/* 2 — «Επιλογή»: τα πλακίδια ξεπετάγονται από το κέντρο και απλώνονται στη θέση τους.
   Μετά, σαν να τα πατάει κάποιος, ένα-ένα «πατιέται» και γίνεται μπλε, ενώ στον υπότιτλο
   ανάβει με τη σειρά «Βρες κατάστημα» → «διάλεξε ώρα» → «κλείσε θέση». Φως περνάει από το κουμπί. */

const SEQ = [4, 0, 8, 2, 6, 1, 7, 3, 5];

function PickTile({ i, enter, sel }: { i: number; enter: V; sel: boolean }) {
  const on = useFollow(sel ? 1 : 0, 260);
  const press = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!sel) { Animated.timing(press, { toValue: 1, duration: 300, useNativeDriver: ND }).start(); return; }
    Animated.sequence([
      Animated.timing(press, { toValue: 0.88, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.spring(press, { toValue: 1.07, friction: 4, tension: 160, useNativeDriver: ND }),
    ]).start();
  }, [sel]);
  const dx = tx(4) - tx(i), dy = ty(4) - ty(i);
  return (
    <Animated.View style={{ position: 'absolute', left: tx(i), top: ty(i), zIndex: sel ? 2 : 1, opacity: k(enter, [0, 0.15], [0, 1]),
      transform: [{ translateX: k(enter, [0, 1], [dx, 0]) }, { translateY: k(enter, [0, 1], [dy, 0]) },
        { scale: k(enter, [0, 1], [0.5, 1]) }, { rotate: k(enter, [0, 1], [`${(i - 4) * 6}deg`, '0deg']) }, { scale: press }] }}>
      <Tile c={CATS[i]} on={on} />
    </Animated.View>
  );
}

/* Μια φράση του υπότιτλου που ανάβει στο κύριο χρώμα, με μια γραμμή από κάτω. */
function Phrase({ text, lit }: { text: string; lit: boolean }) {
  const v = useFollow(lit ? 1 : 0, 320);
  return (
    <View>
      <Text style={subStyle}>{text}</Text>
      <Animated.Text style={[subStyle, { position: 'absolute', left: 0, right: 0, color: C.accent, opacity: v }]}>{text}</Animated.Text>
      <Animated.View style={{ height: 2, borderRadius: 1, backgroundColor: C.accent, marginTop: 1, opacity: v, transform: [{ scaleX: v }] }} />
    </View>
  );
}

export default function Pick(p: WelcomeProps) {
  // Κεντρικό πλακίδιο πρώτο, μετά όλα μαζί σχεδόν ταυτόχρονα.
  const tiles = useStagger(9, { delay: 120, step: 35, spring: true });
  const parts = useStagger(6, { delay: 520, step: 90 });
  const tick = useTick(1700, !p.reduce);
  const sel = SEQ[tick % SEQ.length];
  const phrase = tick % 3;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (tick === 0) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.18, duration: 140, useNativeDriver: ND }),
      Animated.spring(pulse, { toValue: 1, friction: 4, useNativeDriver: ND }),
    ]).start();
  }, [tick]);

  return (
    <Shell
      logo={
        <Animated.View style={[rise(parts[0], -14), { flexDirection: 'row', alignItems: 'baseline' }]}>
          <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.9, color: C.text }}>Spot</Text>
          <Animated.Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.9, color: C.accent, transform: [{ scale: pulse }] }}>On</Animated.Text>
        </Animated.View>
      }
      grid={
        <View style={{ width: GW, height: GH, alignSelf: 'center' }}>
          {CATS.map((_, i) => <PickTile key={i} i={i} enter={tiles[i === 4 ? 0 : i < 4 ? i + 1 : i]} sel={sel === i} />)}
        </View>
      }
      text={<>
        <Animated.View style={rise(parts[1])}><Text style={titleStyle}>{TITLE[0]}{'\n'}{TITLE[1]}</Text></Animated.View>
        <Animated.View style={[rise(parts[2]), { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 5 }]}>
          {SUB.map((s, i) => <Phrase key={i} text={s} lit={!p.reduce && phrase === i} />)}
        </Animated.View>
      </>}
      actions={<Actions p={p} styles={[rise(parts[3], 24), rise(parts[4], 24), rise(parts[5], 24)]}
        primaryExtra={<Shine on={!p.reduce} every={3400} />} />}
    />
  );
}
