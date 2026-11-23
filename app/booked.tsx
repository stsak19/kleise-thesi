import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, useWindowDimensions } from 'react-native';
import { canDownloadIcs, downloadIcs, openGoogle, type CalEvent } from '../lib/calendar';
import { Text } from '../lib/Txt';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, C, Icon, alpha, fmtLong, onColor, shadow } from '../lib/ui';

/* Η οθόνη μετά την κράτηση (αντί για αναδυόμενο μήνυμα): κατάστημα, υπηρεσία, μέρα και ώρα,
   και «Δες τις κρατήσεις μου» / «Πίσω στο κατάστημα». Ανοίγει από το showBooked (lib/store/data).
   pending=1: το κατάστημα εγκρίνει τις κρατήσεις, άρα «Το αίτημα στάλθηκε». */
export default function Booked() {
  // Υπολογιστής: κάρτα και κουμπιά σε στήλη 480 στη μέση, όχι σε όλο το πλάτος (στο κινητό ίδιο με πριν).
  const { width } = useWindowDimensions();
  const router = useRouter();
  const p = useLocalSearchParams<{ biz: string; service: string; date: string; time: string; color?: string; pending?: string; store?: string; dur?: string; addr?: string }>();
  // Μέσα σε κατάστημα: κλείνει αυτή η οθόνη και ανοίγει η καρτέλα Κρατήσεις του καταστήματος (έλεγχος 2026-11-18).
  const mine = () => {
    if (!p.store) return router.replace('/bookings');
    if (router.canGoBack()) router.back();
    setTimeout(() => router.navigate(`/store/${p.store}/bookings` as any), 0);
  };
  const color = p.color || C.tint;
  const pending = p.pending === '1';
  /* Πρόσθεσε στο ημερολόγιο (lib/calendar.ts). Στο web δύο επιλογές (Google ή αρχείο για Apple/Outlook), στο κινητό Google. */
  const [cal, setCal] = useState(false);
  const ev: CalEvent = { title: `${p.service} · ${p.biz}`, date: p.date, time: p.time, minutes: Number(p.dur) || 30, place: p.addr || undefined, details: 'Κράτηση από το SpotOn' };
  const addCal = () => (canDownloadIcs ? setCal(!cal) : openGoogle(ev));
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, friction: 4, tension: 60, useNativeDriver: false }).start(); }, []);
  const easeIn = (d: number) => { const v = new Animated.Value(0);
    Animated.timing(v, { toValue: 1, duration: 450, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); return v; };
  const t1 = useRef(easeIn(250)).current, t2 = useRef(easeIn(450)).current;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, paddingHorizontal: Math.max(24, (width - 480) / 2), justifyContent: 'center', gap: 28 }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: alpha(color, 0.1), alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: color, alignItems: 'center', justifyContent: 'center',
            boxShadow: `0px 14px 30px ${alpha(color, 0.4)}`,
            transform: [{ scale: a }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
            <Icon name="check" size={58} color={onColor(color)} />
          </Animated.View>
        </View>
        <Animated.View style={{ alignItems: 'center', gap: 8, opacity: t1, transform: [{ translateY: t1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <Text style={{ color: C.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 }}>{pending ? 'Το αίτημα στάλθηκε' : 'Κλείστηκε! 🎉'}</Text>
          <Text style={{ color: C.mute, fontSize: 16, textAlign: 'center' }}>{pending ? 'Θα σε ειδοποιήσουμε μόλις το εγκρίνει το κατάστημα.' : 'Σε περιμένουν. Θα το βρεις στις Κρατήσεις σου.'}</Text>
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
        <Btn title="Δες τις κρατήσεις μου" color={color} onPress={mine} />
        {!!p.date && !!p.time && <Btn kind="ghost" icon="calendar" title="Πρόσθεσε στο ημερολόγιο" onPress={addCal} />}
        {cal && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn size="sm" kind="tint" color={color} title="Google Calendar" onPress={() => { setCal(false); openGoogle(ev); }} style={{ flex: 1 }} />
            <Btn size="sm" kind="tint" color={color} title="Apple · Outlook" onPress={() => { setCal(false); downloadIcs(ev); }} style={{ flex: 1 }} />
          </View>
        )}
        <Btn kind="ghost" title="Πίσω στο κατάστημα" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </View>
  );
}
