import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rpc, sb } from '../../../lib/supabase';
import { C, CATEGORIES, Card, DAYS, Empty, Icon, Input, TAB_SPACE, alpha, catEmoji, catLabel, iso, s } from '../../../lib/ui';
import { grad, isLight } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';

import { styleOf } from '../../../lib/presets';
import { Photo } from '../../../lib/Photo';
import { CAT_ART } from '../../../lib/catArt';
type Biz = { theme?: string | null; layout?: string | null; id: string; name: string; category: string; city: string; address: string | null; brand_color?: string | null; logo_url?: string | null; cover_url?: string | null };


/* Κάρτα καταστήματος: εξώφυλλο (ή σκούρο πλαίσιο με λάμψη στο χρώμα του), ετικέτα κατηγορίας
   πάνω του, και από κάτω λογότυπο, όνομα και διεύθυνση. */
function BizCard({ b, onPress }: { b: Biz; onPress: () => void }) {
  const brand = styleOf(b).color;
  return (
    <Card onPress={onPress} style={{ padding: 0, gap: 0, overflow: 'hidden', borderRadius: 24 }}>
      <View style={{ height: 136, backgroundColor: '#0d0d0d', overflow: 'hidden' }}>
        <Photo uri={b.cover_url} color={brand} />
        <View style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 11,
          borderRadius: 999, backgroundColor: alpha('#0a0a0a', 0.7) }}>
          <Text style={{ fontSize: 12 }}>{catEmoji(b.category)}</Text>
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>{catLabel(b.category)}</Text>
        </View>
      </View>
      <View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, overflow: 'hidden', backgroundColor: alpha(brand, 0.12) }}>
          <Photo uri={b.logo_url} color={isLight(C.bg) ? brand : C.text} letter={b.name.slice(0, 1)} style={{ borderRadius: 14 }} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 17, letterSpacing: -0.2 }} numberOfLines={1}>{b.name}</Text>
          <View style={[s.row, { gap: 4 }]}>
            <Icon name="pin" size={13} color={C.mute} />
            <Text style={{ color: C.mute, fontSize: 13, flex: 1 }} numberOfLines={1}>{b.city}{b.address ? ` · ${b.address}` : ''}</Text>
          </View>
        </View>
        <Icon name="chevron" size={16} color={C.mute} />
      </View>
    </Card>
  );
}


type Next = { date: string; time: string; service: string; business: string };
/* Η επόμενη κράτηση του χρήστη για ΣΗΜΕΡΑ (ή τίποτα). */
function useTodayBooking() {
  const [n, setN] = useState<Next | null>(null);
  useFocusEffect(useCallback(() => {
    rpc('my_bookings').then((m: any) => {
      const d = new Date(), today = iso(d), now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      setN(((m?.bookings ?? []) as any[]).filter((b) => b.status === 'booked' && b.date === today && b.time >= now)
        .sort((x, z) => x.time.localeCompare(z.time))[0] ?? null);
    }).catch(() => {});
  }, []));
  return n;
}

/* Ειδοποίηση από πάνω όταν ανοίγει η αρχική: μόνο κατάστημα και ώρα της σημερινής κράτησης.
   Κατεβαίνει, μένει λίγα δευτερόλεπτα και ανεβαίνει ξανά. Πατώντας την ανοίγουν οι κρατήσεις. */
function TodayToast({ b, onPress }: { b: Next; onPress: () => void }) {
  const top = useSafeAreaInsets().top;
  const y = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 8 }),
      Animated.delay(4500),
      Animated.timing(y, { toValue: -120, duration: 260, useNativeDriver: true }),
    ]);
    anim.start(); return () => anim.stop();
  }, [b.business, b.time]);
  return (
    <Animated.View style={{ position: 'absolute', left: 16, right: 16, top: top + 8, zIndex: 20, transform: [{ translateY: y }] }}>
      <Pressable onPress={onPress} style={({ pressed }) => [s.row, { gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, opacity: pressed ? 0.85 : 1,
        backgroundColor: C.ink, borderWidth: 1, borderColor: C.inkLine, boxShadow: `0px 8px 24px ${alpha('#000000', 0.15)}` }]}>
        <Icon name="calendar" size={16} color={C.inkText} />
        <Text style={{ flex: 1, color: C.inkText, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{b.business}</Text>
        <Text style={{ color: C.inkText, fontSize: 15, fontWeight: '800' }}>{b.time}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Home() {
  const router = useRouter();
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [list, setList] = useState<Biz[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    let query = sb.from('businesses').select('*').eq('is_published', true).order('name').limit(100);
    if (cat) query = query.eq('category', cat);
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    const { data } = await query;
    setList((data as Biz[]) ?? []); setLoaded(true);
  }, [cat, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const top = useSafeAreaInsets().top;
  const cats = [{ key: null as string | null, label: 'Όλα', emoji: '✨' }, ...CATEGORIES];
  const next = useTodayBooking();

  const filtering = !!cat || !!q.trim();
  /* Πάνω μέρος σε στιλ Wolt: προφίλ αριστερά, στρογγυλή μπάρα αναζήτησης στο κέντρο. */
  const fixed = (
    <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: top + 10, paddingBottom: 10, zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Προφίλ"
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.7 : 1 })}>
        <Icon name="user" size={20} color={C.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Input icon="search" placeholder="Αναζήτηση στο SpotOn" value={q} onChangeText={setQ} returnKeyType="search"
          box={{ borderRadius: 999 }} style={{ fontSize: 15 }} />
      </View>
    </View>
  );

  /* Φίλτρα σε στιλ Wolt: τετράγωνα πλακίδια με μεγάλο εικονίδιο και τίτλο από κάτω. */
  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
      {cats.map((c) => {
        const on = cat === c.key || (c.key === null && !cat);
        const art = CAT_ART[c.key ?? 'all'] ?? CAT_ART.other;
        return (
          <Pressable key={c.key ?? 'all'} onPress={() => setCat(c.key === null || cat === c.key ? null : c.key)}
            style={({ pressed }) => ({ width: 76, alignItems: 'center', gap: 6, opacity: pressed ? 0.75 : 1 })}>
            <View style={{ width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              backgroundColor: isLight(C.bg) ? art.bg : art.bgDark, borderWidth: 2, borderColor: on ? C.text : 'transparent' }}>
              <Image source={art.img} style={{ width: 50, height: 50 }} resizeMode="contain" />
            </View>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: on ? '800' : '600' }} numberOfLines={1}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  /* Ενότητες με οριζόντια κύλιση, όπως στη Wolt. */
  const sections: { title: string; items: Biz[] }[] = [
    { title: 'Κοντά σου', items: list.slice(0, 10) },
    { title: 'Δημοφιλή', items: [...list].reverse().slice(0, 10) },
    ...CATEGORIES.map((c) => ({ title: `${c.emoji} ${c.label}`, items: list.filter((b) => b.category === c.key) })),
  ].filter((x) => x.items.length > 0);

  const row = (x: { title: string; items: Biz[] }) => (
    <View key={x.title} style={{ gap: 10 }}>
      <Text style={[s.h, { paddingHorizontal: 16 }]}>{x.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
        {x.items.map((b) => <View key={b.id} style={{ width: 270 }}><BizCard b={b} onPress={() => router.push(`/business/${b.id}`)} /></View>)}
      </ScrollView>
    </View>
  );

  const empty = <Empty emoji="🔎" title="Δεν βρέθηκαν καταστήματα" text="Δοκίμασε άλλο όνομα ή άλλη κατηγορία."
    action={filtering ? 'Καθαρισμός φίλτρων' : undefined} onAction={() => { setCat(null); setQ(''); }} />;

  return (
    <View style={s.screen}>
      {fixed}
      {next && <TodayToast b={next} onPress={() => router.push('/bookings')} />}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: TAB_SPACE, gap: 24 }} keyboardShouldPersistTaps="handled">
        {chips}
        {!loaded ? null : list.length === 0 ? <View style={{ paddingHorizontal: 16 }}>{empty}</View>
          : filtering ? (
            <View style={{ paddingHorizontal: 16, gap: 16 }}>
              <View style={s.row}>
                <Text style={[s.h, { flex: 1 }]}>{cat ? catLabel(cat) : 'Αποτελέσματα'}</Text>
                <Text style={{ color: C.mute, fontWeight: '600', fontSize: 14 }}>{list.length} {list.length === 1 ? 'κατάστημα' : 'καταστήματα'}</Text>
              </View>
              {list.map((b) => <BizCard key={b.id} b={b} onPress={() => router.push(`/business/${b.id}`)} />)}
            </View>
          ) : sections.map(row)}
      </ScrollView>
    </View>
  );
}
