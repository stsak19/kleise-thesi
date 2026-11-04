import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, C } from './ui';

/* Ξενάγηση με κίνηση που εμφανίζεται μόνο την πρώτη φορά που ανοίγει η εφαρμογή.
   Swipe ή κουμπιά για αλλαγή βήματος· κάθε βήμα έχει δικά του αιωρούμενα εικονίδια. */
const KEY = 'intro.seen.v1';
const ND = Platform.OS !== 'web';
const STEPS = [
  { emoji: '📅', orbit: ['💪', '💇', '💅', '🧘'], title: 'Καλώς ήρθες στο SpotOn', text: 'Κλείνεις ραντεβού σε γυμναστήρια, κομμωτήρια, νυχάδικα και ό,τι άλλο χρειάζεσαι — χωρίς τηλέφωνα.' },
  { emoji: '🔎', orbit: ['🏋️', '💈', '✨', '🦷'], title: 'Βρες αυτό που θέλεις', text: 'Ψάξε με όνομα ή διάλεξε κατηγορία για να δεις τις επιχειρήσεις κοντά σου.' },
  { emoji: '🕒', orbit: ['✅', '⏰', '📍', '🙋'], title: 'Διάλεξε μέρα και ώρα', text: 'Βλέπεις τις ελεύθερες θέσεις live και κλείνεις με ένα πάτημα. Αν είναι γεμάτο, μπαίνεις σε λίστα ενδιαφέροντος.' },
  { emoji: '🔔', orbit: ['📲', '💬', '📆', '⭐'], title: 'Όλα σε ένα σημείο', text: 'Στο «Οι κρατήσεις μου» βλέπεις τα ραντεβού σου, τις ειδοποιήσεις και μπορείς να ακυρώσεις.' },
  { emoji: '🏪', orbit: ['📈', '🗓️', '👥', '💶'], title: 'Έχεις επιχείρηση;', text: 'Από το «Επιχείρηση» στήνεις υπηρεσίες, ωράριο και θέσεις, και βλέπεις τις κρατήσεις σου.' },
];

export function useIntroSeen(): [boolean | null, () => void] {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => setSeen(v === '1')).catch(() => setSeen(true)); }, []);
  return [seen, () => { setSeen(true); AsyncStorage.setItem(KEY, '1').catch(() => {}); }];
}

const loop = (v: Animated.Value, ms: number) =>
  Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: ND }));
const wave = (v: Animated.Value, ms: number) =>
  Animated.loop(Animated.sequence([
    Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
  ]));

/* Χρωματιστές «φούσκες» που κινούνται αργά στο φόντο. */
function Blobs({ w, h }: { w: number; h: number }) {
  const a = useRef(new Animated.Value(0)).current, b = useRef(new Animated.Value(0)).current;
  useEffect(() => { const x = wave(a, 4000), y = wave(b, 5500); x.start(); y.start(); return () => { x.stop(); y.stop(); }; }, []);
  const blob = (v: Animated.Value, size: number, top: number, left: number, dx: number, dy: number, color: string) => (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', top, left, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.14,
      transform: [
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
      ] }} />
  );
  return <>
    {blob(a, w * 0.9, -w * 0.3, -w * 0.3, 40, 60, C.accent)}
    {blob(b, w * 0.7, h * 0.55, w * 0.5, -50, -40, C.btn)}
    {blob(a, w * 0.4, h * 0.35, -w * 0.15, 30, -30, C.accent)}
  </>;
}

/* Το κεντρικό εικονίδιο: αναπηδά, «αναπνέει» με παλμό και έχει 4 εικονίδια σε τροχιά. */
function Hero({ step, active }: { step: (typeof STEPS)[number]; active: boolean }) {
  const pop = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ls = [wave(bob, 1400), loop(spin, 9000), loop(pulse, 1800)]; ls.forEach((l) => l.start());
    return () => ls.forEach((l) => l.stop());
  }, []);
  useEffect(() => {
    if (!active) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: ND }).start();
  }, [active]);
  const R = 95;
  return (
    <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 0.5].map((off) => {
        const p = Animated.modulo(Animated.add(pulse, off), 1);
        return <Animated.View key={off} style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: C.accent,
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }} />;
      })}
      <Animated.View style={{ position: 'absolute', width: 240, height: 240,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        {step.orbit.map((e, k) => {
          const ang = (k / step.orbit.length) * Math.PI * 2;
          return <Animated.Text key={k} style={{ position: 'absolute', fontSize: 28, left: 120 + R * Math.cos(ang) - 17, top: 120 + R * Math.sin(ang) - 17,
            transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) }, { scale: pop }] }}>{e}</Animated.Text>;
        })}
      </Animated.View>
      <Animated.View style={{ width: 130, height: 130, borderRadius: 65, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
        shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8,
        transform: [
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] }) },
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
        ] }}>
        <Text style={{ fontSize: 62 }}>{step.emoji}</Text>
      </Animated.View>
    </View>
  );
}

export default function Intro({ onDone }: { onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const [i, setI] = useState(0);
  const x = useRef(new Animated.Value(0)).current;         // θέση του swipe (σε px)
  const txt = useRef(new Animated.Value(1)).current;       // είσοδος κειμένου
  const scroller = useRef<any>(null);
  const last = i === STEPS.length - 1;

  useEffect(() => {
    txt.setValue(0);
    Animated.timing(txt, { toValue: 1, duration: 550, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [i]);

  const go = (k: number) => { setI(k); scroller.current?.scrollTo({ x: k * W, animated: true }); };
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
    useNativeDriver: false,
    listener: (e: any) => { const k = Math.round(e.nativeEvent.contentOffset.x / W); if (k !== i && k >= 0 && k < STEPS.length) setI(k); },
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, overflow: 'hidden' }}>
      <Blobs w={W} h={H} />
      <View style={{ alignItems: 'flex-end', minHeight: 24, paddingHorizontal: 24, paddingTop: 24 }}>
        {!last && <Pressable onPress={onDone}><Text style={{ color: C.mute, fontWeight: '600' }}>Παράλειψη</Text></Pressable>}
      </View>

      <Animated.ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
        {STEPS.map((st, k) => {
          const r = [(k - 1) * W, k * W, (k + 1) * W];
          return (
            <View key={k} style={{ width: W, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 18 }}>
              <Animated.View style={{
                opacity: x.interpolate({ inputRange: r, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                transform: [
                  { translateX: x.interpolate({ inputRange: r, outputRange: [W * 0.4, 0, -W * 0.4], extrapolate: 'clamp' }) },
                  { scale: x.interpolate({ inputRange: r, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' }) },
                ] }}>
                <Hero step={st} active={k === i} />
              </Animated.View>
              <Animated.View style={{ alignItems: 'center', gap: 10,
                opacity: k === i ? txt : 0,
                transform: [{ translateY: txt.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
                <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', textAlign: 'center' }}>{st.title}</Text>
                <Text style={{ color: C.mute, fontSize: 16, textAlign: 'center', lineHeight: 23 }}>{st.text}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={{ gap: 18, padding: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {STEPS.map((_, k) => {
            const r = [(k - 1) * W, k * W, (k + 1) * W];
            return <Pressable key={k} onPress={() => go(k)}>
              <Animated.View style={{ height: 8, borderRadius: 4,
                width: x.interpolate({ inputRange: r, outputRange: [8, 26, 8], extrapolate: 'clamp' }),
                backgroundColor: x.interpolate({ inputRange: r, outputRange: [C.line, C.accent, C.line], extrapolate: 'clamp' }) }} />
            </Pressable>;
          })}
        </View>
        <Btn title={last ? 'Ξεκίνα 🚀' : 'Επόμενο'} onPress={() => (last ? onDone() : go(i + 1))} />
        <View style={{ minHeight: 48 }}>{i > 0 && <Btn kind="ghost" title="Πίσω" onPress={() => go(i - 1)} />}</View>
      </View>
    </View>
  );
}
