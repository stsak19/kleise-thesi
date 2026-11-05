import { Animated, Text, View } from 'react-native';
import { CATS, GH, GW, Tile, k, rise, tx, ty, useFollow, useLoop, useStagger, useTick, type V } from '../motion';
import { Logo } from '../parts';
import { Actions, SUB, Shell, TITLE, WelcomeProps, subStyle, titleStyle, wave } from './common';

/* 1 — «Κύμα»: τα πλακίδια σκάνε ένα-ένα διαγώνια, μετά «επιπλέουν» σαν κύμα
   και το μπλε περνάει από πλακίδιο σε πλακίδιο κάνοντας κύκλο γύρω από το πλέγμα.
   Το κύριο κουμπί «αναπνέει» απαλά. */

const ORDER = [4, 1, 2, 5, 8, 7, 6, 3, 0];      // το μπλε ξεκινά από το κέντρο και γυρίζει γύρω-γύρω
const DIAG = [0, 1, 3, 2, 4, 6, 5, 7, 8];       // σειρά εμφάνισης: από πάνω-αριστερά προς τα κάτω-δεξιά

function WaveTile({ i, enter, t, sel }: { i: number; enter: V; t: V; sel: boolean }) {
  const on = useFollow(sel ? 1 : 0, 420);
  const phase = ((i % 3) + Math.floor(i / 3)) / 8;
  return (
    <Animated.View style={{ position: 'absolute', left: tx(i), top: ty(i), opacity: k(enter, [0, 0.4], [0, 1]),
      transform: [{ translateY: wave(t, phase, 5) }, { scale: k(enter, [0, 1], [0.3, 1]) }, { scale: k(on, [0, 1], [1, 1.07]) }] }}>
      <Tile c={CATS[i]} on={on} />
    </Animated.View>
  );
}

export default function Wave(p: WelcomeProps) {
  const tiles = useStagger(9, { delay: 180, step: 65, spring: true });
  const parts = useStagger(6, { delay: 650, step: 90 });
  const t = useLoop(3600, !p.reduce);
  const breathe = useLoop(2600, !p.reduce);
  const tick = useTick(1500, !p.reduce);
  const sel = ORDER[tick % ORDER.length];

  return (
    <Shell
      logo={<Animated.View style={rise(parts[0], -14)}><Logo size={30} /></Animated.View>}
      grid={
        <View style={{ width: GW, height: GH, alignSelf: 'center' }}>
          {CATS.map((_, i) => <WaveTile key={i} i={i} enter={tiles[DIAG.indexOf(i)]} t={t} sel={sel === i} />)}
        </View>
      }
      text={<>
        <Animated.View style={rise(parts[1])}><Text style={titleStyle}>{TITLE[0]}{'\n'}{TITLE[1]}</Text></Animated.View>
        <Animated.View style={rise(parts[2])}><Text style={subStyle}>{SUB.join(' ')}</Text></Animated.View>
      </>}
      actions={<Actions p={p} styles={[
        { opacity: parts[3], transform: [{ translateY: k(parts[3], [0, 1], [24, 0]) }, { scale: k(breathe, [0, 0.5, 1], [1, 1.025, 1]) }] },
        rise(parts[4], 24), rise(parts[5], 24),
      ]} />}
    />
  );
}
