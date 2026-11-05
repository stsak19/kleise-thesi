import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from './Txt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, C } from './ui';
import { H as SH, SCENES, W as SW } from './IntroScenes';

/* Ξενάγηση με κίνηση που εμφανίζεται μόνο την πρώτη φορά που ανοίγει η εφαρμογή.
   Swipe ή κουμπιά για αλλαγή βήματος· κάθε βήμα έχει δικό του κινούμενο «φιλμάκι» (lib/IntroScenes.tsx). */
const KEY = 'intro.seen.v1';
const ND = Platform.OS !== 'web';
const STEPS = [
  { title: 'Καλώς ήρθες στο SpotOn', text: 'Κλείνεις θέση σε γυμναστήρια, κομμωτήρια, νυχάδικα και ό,τι άλλο χρειάζεσαι — με ένα πάτημα, χωρίς τηλέφωνα.' },
  { title: 'Βρες αυτό που θέλεις', text: 'Ψάξε με όνομα ή διάλεξε κατηγορία και βρες αμέσως την επιχείρηση που σου ταιριάζει.' },
  { title: 'Διάλεξε μέρα και ώρα', text: 'Βλέπεις τις ελεύθερες θέσεις live και κλείνεις με ένα πάτημα. Αν είναι γεμάτο, μπαίνεις σε λίστα ενδιαφέροντος.' },
  { title: 'Όλα σε ένα σημείο', text: 'Όλες οι κρατήσεις σου μαζί, με υπενθυμίσεις πριν το ραντεβού — και ακύρωση με ένα πάτημα.' },
];

const replay = new Set<() => void>();
/* Ρυθμίσεις → «Δες ξανά την ξενάγηση». */
export const replayIntro = () => { AsyncStorage.removeItem(KEY).catch(() => {}); replay.forEach((f) => f()); };

export function useIntroSeen(): [boolean | null, () => void] {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setSeen(v === '1')).catch(() => setSeen(true));
    const f = () => setSeen(false); replay.add(f); return () => { replay.delete(f); };
  }, []);
  return [seen, () => { setSeen(true); AsyncStorage.setItem(KEY, '1').catch(() => {}); }];
}

export default function Intro({ onDone }: { onDone: () => void }) {
  const { width: W } = useWindowDimensions();
  const [i, setI] = useState(0);
  const x = useRef(new Animated.Value(0)).current;         // θέση του swipe (σε px)
  const txt = useRef(new Animated.Value(1)).current;       // είσοδος κειμένου
  const scroller = useRef<any>(null);
  const last = i === STEPS.length - 1;

  useEffect(() => {
    txt.setValue(0);
    Animated.timing(txt, { toValue: 1, duration: 550, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [i]);

  // Ύψος της περιοχής των σκηνών: η σκηνή μικραίνει αν δεν χωράει μαζί με το κείμενο.
  const [ph, setPh] = useState(600);
  const sc = Math.max(0.55, Math.min(1, (ph - (W < 360 ? 250 : 190)) / SH));
  const go = (k: number) => { setI(k); scroller.current?.scrollTo({ x: k * W, animated: true }); };
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
    useNativeDriver: false,
    listener: (e: any) => { const k = Math.round(e.nativeEvent.contentOffset.x / W); if (k !== i && k >= 0 && k < STEPS.length) setI(k); },
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, overflow: 'hidden' }}>
      <View style={{ alignItems: 'flex-end', minHeight: 24, paddingHorizontal: 24, paddingTop: 24 }}>
        {!last && <Pressable onPress={onDone}><Text style={{ color: C.mute, fontWeight: '600' }}>Παράλειψη</Text></Pressable>}
      </View>

      <Animated.ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }}
        onLayout={(e) => setPh(e.nativeEvent.layout.height)}>
        {STEPS.map((st, k) => {
          const r = [(k - 1) * W, k * W, (k + 1) * W];
          return (
            <View key={k} style={{ width: W, height: ph, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 12 * sc, gap: 22 * sc }}>
              <Animated.View style={{
                opacity: x.interpolate({ inputRange: r, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                transform: [
                  { translateX: x.interpolate({ inputRange: r, outputRange: [W * 0.4, 0, -W * 0.4], extrapolate: 'clamp' }) },
                  { scale: x.interpolate({ inputRange: r, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' }) },
                ] }}>
                <View style={{ width: SW * sc, height: SH * sc, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ transform: [{ scale: sc }] }}>
                    {(() => { const Scene = SCENES[k]; return <Scene active={k === i} />; })()}
                  </View>
                </View>
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
