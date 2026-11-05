import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rpc, sb } from '../../../lib/supabase';
import { C, CATEGORIES, Card, DAYS, Empty, Icon, Input, alpha, catEmoji, catLabel, iso, s } from '../../../lib/ui';
import { grad, isLight } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';

import { styleOf } from '../../../lib/presets';
import { Photo } from '../../../lib/Photo';
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

  /* Πάνω μέρος σταθερό: αναζήτηση και κατηγορίες μένουν στη θέση τους όσο κυλάει η λίστα. */
  const fixed = (
    <View style={{ backgroundColor: C.bg, paddingHorizontal: 20, paddingBottom: 12, gap: 14, zIndex: 1,
      borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ paddingTop: top + 12, gap: 14 }}>
        <Input icon="search" placeholder="Κομμωτήριο, γυμναστήριο, ιατρείο…" value={q} onChangeText={setQ} returnKeyType="search" style={{ fontSize: 15 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {cats.map((c) => {
          const on = cat === c.key;
          return (
            <Pressable key={c.key ?? 'all'} onPress={() => setCat(c.key === null || on ? null : c.key)}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingLeft: 12, paddingRight: 14,
                borderRadius: 999, borderWidth: 1, backgroundColor: on ? C.accent : C.bg, borderColor: on ? C.accent : C.line,
                opacity: pressed ? 0.75 : 1 }]}>
              <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
              <Text style={{ color: on ? C.onAccent : C.text, fontSize: 14, fontWeight: on ? '700' : '600' }}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const head = (
    <View style={s.row}>
      <Text style={[s.h, { flex: 1 }]}>{cat ? catLabel(cat) : q.trim() ? 'Αποτελέσματα' : 'Όλα τα καταστήματα'}</Text>
      {loaded && <Text style={{ color: C.mute, fontWeight: '600', fontSize: 14 }}>{list.length} {list.length === 1 ? 'κατάστημα' : 'καταστήματα'}</Text>}
    </View>
  );

  return (
    <View style={s.screen}>
      {fixed}
      {next && <TodayToast b={next} onPress={() => router.push('/bookings')} />}
      <FlatList style={{ flex: 1 }} data={list} keyExtractor={(b) => b.id} contentContainerStyle={[s.pad, { paddingTop: 16, gap: 16 }]}
        ListHeaderComponent={head} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loaded ? <Empty emoji="🔎" title="Δεν βρέθηκαν καταστήματα" text="Δοκίμασε άλλο όνομα ή άλλη κατηγορία."
          action={cat || q ? 'Καθαρισμός φίλτρων' : undefined} onAction={() => { setCat(null); setQ(''); }} /> : undefined}
        renderItem={({ item }) => <BizCard b={item} onPress={() => router.push(`/business/${item.id}`)} />} />
    </View>
  );
}
