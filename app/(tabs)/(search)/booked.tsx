import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, C, Icon, alpha, fmtLong, onColor, shadow } from '../../../lib/ui';

/* Επιβεβαίωση μετά την κράτηση, με επιλογές «Δες τις κρατήσεις μου» / «Βρες άλλο κατάστημα». */
export default function Booked() {
  const router = useRouter();
  const p = useLocalSearchParams<{ biz: string; service: string; date: string; time: string; color?: string }>();
  const color = p.color || C.tint;
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, friction: 4, tension: 60, useNativeDriver: false }).start(); }, []);
  const easeIn = (d: number) => { const v = new Animated.Value(0);
    Animated.timing(v, { toValue: 1, duration: 450, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); return v; };
  const t1 = useRef(easeIn(250)).current, t2 = useRef(easeIn(450)).current;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 28 }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: alpha(color, 0.1), alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: color, alignItems: 'center', justifyContent: 'center',
            boxShadow: `0px 14px 30px ${alpha(color, 0.4)}`,
            transform: [{ scale: a }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
            <Icon name="check" size={58} color={onColor(color)} />
          </Animated.View>
        </View>
        <Animated.View style={{ alignItems: 'center', gap: 8, opacity: t1, transform: [{ translateY: t1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <Text style={{ color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 }}>Κλείστηκε! 🎉</Text>
          <Text style={{ color: C.mute, fontSize: 16, textAlign: 'center' }}>Σε περιμένουν — θα το βρεις στις κρατήσεις σου.</Text>
        </Animated.View>
        <Animated.View style={{ alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...shadow(2),
          opacity: t2, transform: [{ translateY: t2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <View style={{ padding: 18, gap: 4 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{p.biz}</Text>
            <Text style={{ color: C.mute, fontSize: 15 }}>{p.service}</Text>
          </View>
          <View style={{ borderTopWidth: 1.5, borderTopColor: C.line, borderStyle: 'dashed', marginHorizontal: 18 }} />
          <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="calendar" size={20} color={color} />
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, flex: 1 }}>{p.date ? fmtLong(p.date) : ''}</Text>
            <View style={{ backgroundColor: alpha(color, 0.12), borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color, fontWeight: '900', fontSize: 17 }}>{p.time}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
      <View style={{ gap: 12 }}>
        <Btn title="Δες τις κρατήσεις μου" color={color}
          onPress={() => { router.dismissAll(); router.navigate('/bookings'); }} />
        <Btn kind="ghost" title="Βρες άλλο κατάστημα" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}
