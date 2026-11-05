import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { CATS, GH, GW, ND, Tile, k, rise, tx, ty, useFollow, useStagger, useTick, type V } from '../motion';
import { Logo } from '../parts';
import { Actions, SUB, Shell, TITLE, WelcomeProps, subStyle, titleStyle } from './common';

/* 4 — «Ανακάτεμα»: τα πλακίδια μπαίνουν γυρνώντας σαν κάρτες. Μετά, κάθε λίγο, ένα πλακίδιο
   γλιστράει στο κέντρο και γίνεται μπλε, ενώ ένα άλλο ζευγάρι αλλάζει θέσεις — σαν να ανακατεύεται η τράπουλα.
   Ο τίτλος μπαίνει από τα πλάγια, η πρώτη γραμμή από αριστερά και η δεύτερη από δεξιά. */

const CENTER = 4;

function ShuffleTile({ i, slot, enter, moving }: { i: number; slot: number; enter: V; moving: boolean }) {
  const x = useFollow(tx(slot), 0, true), y = useFollow(ty(slot), 0, true);
  const on = useFollow(slot === CENTER ? 1 : 0, 450);
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving) return;
    Animated.sequence([
      Animated.timing(lift, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(lift, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
    ]).start();
  }, [slot]);
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, zIndex: moving ? 3 : 1, opacity: k(enter, [0, 0.5], [0, 1]),
      transform: [{ translateX: x }, { translateY: y }, { perspective: 600 }, { rotateY: k(enter, [0, 1], ['-100deg', '0deg']) },
        { scale: k(lift, [0, 1], [1, 1.1]) }, { rotate: k(lift, [0, 1], ['0deg', `${i % 2 ? 5 : -5}deg`]) }] }}>
      <Tile c={CATS[i]} on={on} />
    </Animated.View>
  );
}

export default function Shuffle(p: WelcomeProps) {
  const tiles = useStagger(9, { delay: 150, step: 80, ms: 600 });
  const logo = useStagger(1, { delay: 0, ms: 700 })[0];
  const [l1, l2, sub, b1, b2, b3] = useStagger(6, { delay: 700, step: 100, ms: 600 });
  const tick = useTick(2200, !p.reduce);
  // slots[i] = η θέση (0–8) όπου βρίσκεται τώρα το πλακίδιο i
  const [slots, setSlots] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const [moving, setMoving] = useState<number[]>([]);
  const cur = useRef(slots);
  useEffect(() => {
    if (tick === 0) return;
    const s = [...cur.current];
    const at = (slot: number) => s.indexOf(slot);
    const swap = (a: number, b: number) => { const t = s[a]; s[a] = s[b]; s[b] = t; };
    const pick = (xs: number[]) => xs[Math.floor(Math.random() * xs.length)];
    const outer = [0, 1, 2, 3, 5, 6, 7, 8];
    const a = pick(outer);                                     // θέση που έρχεται στο κέντρο
    const b = pick(outer.filter((o) => o !== a));
    const c = pick(outer.filter((o) => o !== a && o !== b));   // κι ένα ακόμα ζευγάρι αλλάζει θέσεις
    const m = [at(CENTER), at(a), at(b), at(c)];
    swap(m[0], m[1]); swap(m[2], m[3]);
    cur.current = s; setSlots(s); setMoving(m);
  }, [tick]);

  const order = [0, 1, 2, 5, 4, 3, 6, 7, 8];       // σειρά που γυρνάνε οι κάρτες (σαν φίδι)
  return (
    <Shell
      logo={<Animated.View style={{ opacity: logo, transform: [{ perspective: 400 }, { rotateX: k(logo, [0, 1], ['90deg', '0deg']) }] }}><Logo size={30} /></Animated.View>}
      grid={
        <View style={{ width: GW, height: GH, alignSelf: 'center' }}>
          {CATS.map((_, i) => <ShuffleTile key={i} i={i} slot={slots[i]} enter={tiles[order.indexOf(i)]} moving={moving.includes(i)} />)}
        </View>
      }
      text={<>
        <View>
          <Animated.Text style={[titleStyle, { opacity: l1, transform: [{ translateX: k(l1, [0, 1], [-60, 0]) }] }]}>{TITLE[0]}</Animated.Text>
          <Animated.Text style={[titleStyle, { opacity: l2, transform: [{ translateX: k(l2, [0, 1], [60, 0]) }] }]}>{TITLE[1]}</Animated.Text>
        </View>
        <Animated.View style={rise(sub, 10)}><Text style={subStyle}>{SUB.join(' ')}</Text></Animated.View>
      </>}
      actions={<Actions p={p} styles={[rise(b1, 24), rise(b2, 24), rise(b3, 24)]} />}
    />
  );
}
