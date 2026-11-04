import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, C, fmtDay } from '../../../lib/ui';

/* Επιβεβαίωση μετά την κράτηση, με επιλογές «Δες τις κρατήσεις μου» / «Βρες άλλο κατάστημα». */
export default function Booked() {
  const router = useRouter();
  const p = useLocalSearchParams<{ biz: string; service: string; date: string; time: string; color?: string }>();
  const color = p.color || C.accent;
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, friction: 4, tension: 60, useNativeDriver: false }).start(); }, []);
  const easeIn = (d: number) => { const v = new Animated.Value(0);
    Animated.timing(v, { toValue: 1, duration: 450, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); return v; };
  const t1 = useRef(easeIn(250)).current, t2 = useRef(easeIn(450)).current;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 28 }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <Animated.View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: color, alignItems: 'center', justifyContent: 'center',
          transform: [{ scale: a }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
          <Text style={{ fontSize: 60, color: '#fff', fontWeight: '900' }}>✓</Text>
        </Animated.View>
        <Animated.View style={{ alignItems: 'center', gap: 8, opacity: t1, transform: [{ translateY: t1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <Text style={{ color: C.text, fontSize: 28, fontWeight: '800' }}>Κλείστηκε! 🎉</Text>
          <Text style={{ color: C.mute, fontSize: 16, textAlign: 'center' }}>Σε περιμένουν</Text>
        </Animated.View>
        <Animated.View style={{ alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 16, gap: 4,
          opacity: t2, transform: [{ translateY: t2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>{p.biz}</Text>
          <Text style={{ color: C.mute }}>{p.service}</Text>
          <Text style={{ color, fontWeight: '800', fontSize: 18, marginTop: 4 }}>{p.date ? fmtDay(p.date) : ''} · {p.time}</Text>
        </Animated.View>
      </View>
      <View style={{ gap: 12 }}>
        <Btn title="Δες τις κρατήσεις μου" style={{ backgroundColor: color, borderColor: color }}
          onPress={() => { router.dismissAll(); router.navigate('/bookings'); }} />
        <Btn kind="ghost" title="Βρες άλλο κατάστημα" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}
