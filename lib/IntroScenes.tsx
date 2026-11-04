import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { C } from './ui';

/* Οι 4 κινούμενες σκηνές της ξενάγησης. Κάθε σκηνή είναι ένα «φιλμάκι» που παίζει σε loop
   όσο είναι ενεργό το βήμα. Όλα οδηγούνται από μία τιμή t (0→1) με keyframes. */

export const W = 280, H = 250;
type V = Animated.Value;
const k = (t: V, i: number[], o: (number | string)[]) => t.interpolate({ inputRange: i, outputRange: o as any, extrapolate: 'clamp' });

function useClock(active: boolean, ms: number) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { t.setValue(0); return; }
    t.setValue(0);
    const a = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false }));
    a.start(); return () => a.stop();
  }, [active]);
  return t;
}

const Badge = ({ t, at, text, top }: { t: V; at: number; text: string; top: number }) => (
  <Animated.View style={{ position: 'absolute', top, alignSelf: 'center', backgroundColor: C.ok, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, zIndex: 30,
    opacity: k(t, [at, at + 0.04, 0.9, 0.95], [0, 1, 1, 0]),
    transform: [{ scale: k(t, [at, at + 0.04, at + 0.07, at + 0.1], [0.3, 1.2, 0.95, 1]) }] }}>
    <Text style={{ color: '#fff', fontWeight: '800' }}>{text}</Text>
  </Animated.View>
);

const Frame = ({ children, bg = C.card }: { children: React.ReactNode; bg?: string }) => (
  <View style={{ width: W, height: H, borderRadius: 24, backgroundColor: bg, borderWidth: 1, borderColor: C.line, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>{children}</View>
);

/* 1 — Κλείνεις θέση: λίστα ωρών, το δάχτυλο πατάει μια ελεύθερη, γίνεται δική σου. */
export function SceneBook({ active }: { active: boolean }) {
  const t = useClock(active, 4200);
  const rows = [{ h: '17:00', s: 'Γεμάτο', full: true }, { h: '18:00', s: '1 θέση ελεύθερη' }, { h: '19:00', s: '3 θέσεις ελεύθερες' }];
  const RY = 64, RH = 52;
  return (
    <Frame>
      <View style={{ padding: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>💇</Text></View>
        <View><Text style={{ color: C.text, fontWeight: '800' }}>Κομμωτήριο Ελένη</Text><Text style={{ color: C.mute, fontSize: 12 }}>Κούρεμα · 30′</Text></View>
      </View>
      {rows.map((r, i) => {
        const sel = i === 1;
        return (
          <View key={i} style={{ position: 'absolute', left: 14, right: 14, top: RY + i * (RH + 8), height: RH, borderRadius: 14, borderWidth: 1, borderColor: C.line,
            backgroundColor: C.bg, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', opacity: r.full ? 0.5 : 1 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, width: 64 }}>{r.h}</Text>
            <Text style={{ color: C.mute, fontSize: 13 }}>{r.s}</Text>
            {sel && <Animated.View style={{ ...abs, borderRadius: 14, backgroundColor: C.accent, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
              opacity: k(t, [0.42, 0.47, 0.9, 0.95], [0, 1, 1, 0]) }}>
              <Text style={{ color: C.onAccent, fontWeight: '800', fontSize: 17, width: 64 }}>{r.h}</Text>
              <Text style={{ color: C.onAccent, fontWeight: '700', fontSize: 13 }}>Η θέση σου ✓</Text>
            </Animated.View>}
          </View>
        );
      })}
      <Badge t={t} at={0.55} text="🎉 Κλείστηκε!" top={10} />
    </Frame>
  );
}
const abs = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

/* 2 — Ψάχνεις: σκοτεινό πλαίσιο, ο φακός «φωτίζει» και ψάχνει· βρίσκει αυτό που θες και όλα ασπρίζουν. */
export function SceneSearch({ active }: { active: boolean }) {
  const t = useClock(active, 4800);
  const items = ['💈', '🏋️', '💅', '🧘', '💇', '🦷', '✨', '💆', '🩺'];
  const cx = (i: number) => 50 + 90 * (i % 3), cy = (i: number) => 45 + 72 * Math.floor(i / 3);
  const path = [0, 2, 8, 6, 4];                         // διαδρομή του φακού, καταλήγει στο 💇
  const ts = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
  const xs = [cx(0), ...path.map(cx)], ys = [cy(0), ...path.map(cy)];
  const lx = k(t, ts, xs), ly = k(t, ts, ys);
  const found = 0.56;
  const dark = k(t, [0, found, found + 0.08, 0.9, 1], [1, 1, 0, 0, 1]);
  const R = 38;
  return (
    <Frame bg="#ffffff">
      <Animated.View style={{ ...abs, backgroundColor: '#0d0d10', opacity: dark }} />
      {/* φως του φακού */}
      <Animated.View style={{ position: 'absolute', width: R * 2, height: R * 2, borderRadius: R, backgroundColor: '#ffffff',
        opacity: dark, transform: [{ translateX: Animated.subtract(lx, R) }, { translateY: Animated.subtract(ly, R) }] }} />
      {items.map((e, i) => {
        const target = i === 4;
        const near = Animated.add(Animated.multiply(Animated.subtract(lx, cx(i)), Animated.subtract(lx, cx(i))),
          Animated.multiply(Animated.subtract(ly, cy(i)), Animated.subtract(ly, cy(i))));
        const lit = near.interpolate({ inputRange: [0, 900, 2500], outputRange: [1, 0.8, 0.12], extrapolate: 'clamp' });
        return (
          <Animated.Text key={i} style={{ position: 'absolute', left: cx(i) - 20, top: cy(i) - 22, fontSize: 34, width: 40, textAlign: 'center',
            opacity: target ? Animated.add(lit, Animated.multiply(Animated.subtract(1, dark), 1)) : Animated.add(Animated.multiply(lit, dark), k(t, [found, found + 0.08, 0.9, 1], [0, 0.25, 0.25, 0])),
            transform: target ? [{ scale: k(t, [found, found + 0.06, found + 0.1, 0.9, 1], [1, 1.9, 1.6, 1.6, 1]) }] : [] }}>{e}</Animated.Text>
        );
      })}
      <Animated.View style={{ position: 'absolute', left: cx(4) - 42, top: cy(4) - 42, width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: C.accent,
        opacity: k(t, [found, found + 0.06, 0.9, 0.95], [0, 1, 1, 0]), transform: [{ scale: k(t, [found, found + 0.1], [0.5, 1]) }] }} />
      {/* ο φακός */}
      <Animated.View style={{ position: 'absolute', width: R * 2, height: R * 2, borderRadius: R, borderWidth: 5, borderColor: '#c9c9d1',
        opacity: dark, transform: [{ translateX: Animated.subtract(lx, R) }, { translateY: Animated.subtract(ly, R) }] }}>
        <View style={{ position: 'absolute', width: 34, height: 9, borderRadius: 5, backgroundColor: '#c9c9d1', right: -30, bottom: -14, transform: [{ rotate: '45deg' }] }} />
      </Animated.View>
      <Badge t={t} at={found + 0.06} text="Βρέθηκε! 💇 Κομμωτήριο" top={H - 46} />
    </Frame>
  );
}

/* 3 — Ημερολόγιο: πατάς μέρα, εμφανίζονται ώρες, πατάς ώρα, κλείνει. */
export function SceneCalendar({ active }: { active: boolean }) {
  const t = useClock(active, 5200);
  const days = ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ'];
  const CW = 34, CH = 27, X0 = 21, Y0 = 52, pick = 13;    // 14 του μήνα
  const dx = (n: number) => X0 + (n % 7) * CW + CW / 2, dy = (n: number) => Y0 + Math.floor(n / 7) * CH + CH / 2;
  const times = ['10:00', '12:30', '18:00'], TY = 166, tx = (i: number) => 22 + i * 82 + 37;
  return (
    <Frame>
      <Text style={{ color: C.text, fontWeight: '800', textAlign: 'center', marginTop: 12 }}>Νοέμβριος</Text>
      <View style={{ position: 'absolute', top: 34, left: X0, flexDirection: 'row' }}>
        {days.map((d, i) => <Text key={i} style={{ width: CW, textAlign: 'center', color: C.mute, fontSize: 11, fontWeight: '700' }}>{d}</Text>)}
      </View>
      <Animated.View style={{ position: 'absolute', left: dx(pick) - 13, top: dy(pick) - 13, width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent,
        opacity: k(t, [0.2, 0.24, 0.9, 0.95], [0, 1, 1, 0]), transform: [{ scale: k(t, [0.2, 0.25, 0.28], [0.2, 1.25, 1]) }] }} />
      {Array.from({ length: 28 }, (_, n) => (
        <Text key={n} style={{ position: 'absolute', left: dx(n) - 15, top: dy(n) - 8, width: 30, textAlign: 'center', fontSize: 12, fontWeight: '600',
          color: n === pick ? C.text : n < 5 ? C.line : C.text }}>{n + 1}</Text>
      ))}
      <Animated.Text style={{ position: 'absolute', left: dx(pick) - 15, top: dy(pick) - 8, width: 30, textAlign: 'center', fontSize: 12, fontWeight: '800', color: C.onAccent,
        opacity: k(t, [0.2, 0.24, 0.9, 0.95], [0, 1, 1, 0]) }}>{pick + 1}</Animated.Text>
      {times.map((h, i) => (
        <Animated.View key={i} style={{ position: 'absolute', top: TY, left: 22 + i * 82, width: 74, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.line,
          backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
          opacity: k(t, [0.3 + i * 0.04, 0.36 + i * 0.04, 0.9, 0.95], [0, 1, 1, 0]),
          transform: [{ translateY: k(t, [0.3 + i * 0.04, 0.36 + i * 0.04], [20, 0]) }] }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{h}</Text>
          {i === 2 && <Animated.View style={{ ...abs, borderRadius: 17, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
            opacity: k(t, [0.62, 0.66, 0.9, 0.95], [0, 1, 1, 0]) }}><Text style={{ color: C.onAccent, fontWeight: '800' }}>{h}</Text></Animated.View>}
        </Animated.View>
      ))}
      <Badge t={t} at={0.7} text="✅ Πεμ 14/11 · 18:00" top={H - 36} />
    </Frame>
  );
}

/* 4 — Όλα σε ένα σημείο: οι κρατήσεις σου μπαίνουν σε μια λίστα και έρχεται υπενθύμιση. */
export function SceneAll({ active }: { active: boolean }) {
  const t = useClock(active, 4800);
  const cards = [['💇', 'Κομμωτήριο Ελένη', 'Πεμ 14/11 · 18:00'], ['🏋️', 'FitZone Gym', 'Σαβ 16/11 · 09:00'], ['💅', 'Nails by Νίκη', 'Δευ 18/11 · 12:30']];
  const bell = k(t, [0.5, 0.53, 0.56, 0.59, 0.62, 0.65], [0, 1, -1, 1, -1, 0]);
  return (
    <Frame>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, margin: 16, marginBottom: 0 }}>Οι κρατήσεις μου</Text>
      {cards.map(([e, n, d], i) => {
        const a = 0.06 + i * 0.1;
        return (
          <Animated.View key={i} style={{ position: 'absolute', left: 14, right: 14, top: 50 + i * 62, height: 54, borderRadius: 14, backgroundColor: C.bg,
            borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12,
            opacity: k(t, [a, a + 0.06, 0.9, 0.95], [0, 1, 1, 0]),
            transform: [{ translateX: k(t, [a, a + 0.06, a + 0.09], [W, -8, 0]) }] }}>
            <Text style={{ fontSize: 24 }}>{e}</Text>
            <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{n}</Text><Text style={{ color: C.mute, fontSize: 12 }}>{d}</Text></View>
            <Text style={{ color: C.ok, fontWeight: '800' }}>✓</Text>
          </Animated.View>
        );
      })}
      <Animated.View style={{ position: 'absolute', left: 10, right: 10, top: 8, borderRadius: 16, backgroundColor: C.text, padding: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10,
        opacity: k(t, [0.44, 0.48, 0.9, 0.95], [0, 1, 1, 0]),
        transform: [{ translateY: k(t, [0.44, 0.5, 0.53], [-90, 6, 0]) }] }}>
        <Animated.Text style={{ fontSize: 24, transform: [{ rotate: bell.interpolate({ inputRange: [-1, 1], outputRange: ['-25deg', '25deg'] }) }] }}>🔔</Animated.Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.bg, fontWeight: '800' }}>Υπενθύμιση</Text>
          <Text style={{ color: C.bg, opacity: 0.8, fontSize: 12 }}>Αύριο 18:00 · Κομμωτήριο Ελένη</Text>
        </View>
      </Animated.View>
    </Frame>
  );
}

export const SCENES = [SceneBook, SceneSearch, SceneCalendar, SceneAll];
