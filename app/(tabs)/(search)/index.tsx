import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rpc, sb } from '../../../lib/supabase';
import { C, CATEGORIES, Card, DAYS, Empty, Icon, Input, alpha, catLabel, iso, s, shadow } from '../../../lib/ui';

import { styleOf } from '../../../lib/presets';
import { Photo } from '../../../lib/Photo';
type Biz = { theme?: string | null; layout?: string | null; id: string; name: string; category: string; city: string; address: string | null; brand_color?: string | null; logo_url?: string | null; cover_url?: string | null };


/* Κάρτα καταστήματος: εξώφυλλο (ή το χρώμα του με το σύμβολο της κατηγορίας) και στοιχεία. */
function BizCard({ b, onPress }: { b: Biz; onPress: () => void }) {
  const brand = styleOf(b).color;
  return (
    <Card onPress={onPress} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
      <View style={{ height: 150, backgroundColor: brand, overflow: 'hidden' }}>
        <Photo uri={b.cover_url} color={brand} />
      </View>
      <View style={{ padding: 16, paddingTop: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        <View style={{ marginTop: -40, width: 60, height: 60, borderRadius: 16, backgroundColor: '#ffffff', padding: 3, ...shadow(1) }}>
          <Photo uri={b.logo_url} color={brand} letter={b.name.slice(0, 1)} style={{ borderRadius: 13 }} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, letterSpacing: -0.2 }} numberOfLines={1}>{b.name}</Text>
          <Text style={{ color: C.mute, fontWeight: '600', fontSize: 13 }}>{catLabel(b.category)}</Text>
        </View>
      </View>
      <View style={[s.row, { paddingHorizontal: 16, paddingBottom: 14, gap: 6 }]}>
        <Icon name="pin" size={15} color={C.mute} />
        <Text style={{ color: C.mute, fontSize: 14, flex: 1 }} numberOfLines={1}>{b.city}{b.address ? ` · ${b.address}` : ''}</Text>
      </View>
    </Card>
  );
}


/* Το όνομα της εφαρμογής ως λογότυπο-κείμενο. */
const Logo = () => (
  <Text style={{ fontSize: 26, fontWeight: '900', letterSpacing: -0.8, color: C.text }}>
    Spot<Text style={{ color: C.accent }}>On</Text>
  </Text>
);

type Next = { date: string; time: string; service: string; business: string };
/* Η πιο κοντινή επερχόμενη κράτηση του χρήστη (ή τίποτα). */
function useNextBooking() {
  const [n, setN] = useState<Next | null>(null);
  useFocusEffect(useCallback(() => {
    rpc('my_bookings').then((m: any) => {
      const today = iso(new Date());
      setN(((m?.bookings ?? []) as any[]).find((b) => b.status === 'booked' && b.date >= today) ?? null);
    }).catch(() => {});
  }, []));
  return n;
}

/* Μικρή κάρτα «Επόμενη κράτηση». */
const NextBooking = ({ b, onPress }: { b: Next; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.row, { gap: 12, padding: 12, paddingRight: 14, borderRadius: 18,
    backgroundColor: alpha(C.accent, 0.08), opacity: pressed ? 0.8 : 1 }]}>
    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>{DAYS[new Date(b.date + 'T00:00').getDay()]}</Text>
      <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '800', marginTop: -2 }}>{new Date(b.date + 'T00:00').getDate()}</Text>
    </View>
    <View style={{ flex: 1, gap: 1 }}>
      <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>Επόμενη κράτηση · {b.time}</Text>
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{b.business}</Text>
      <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{b.service}</Text>
    </View>
    <Icon name="chevron" size={16} color={C.mute} />
  </Pressable>
);

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
  const next = useNextBooking();

  /* Πάνω μέρος σταθερό: λογότυπο, αναζήτηση, επόμενη κράτηση και κατηγορίες μένουν στη θέση τους όσο κυλάει η λίστα. */
  const fixed = (
    <View style={{ backgroundColor: C.bg, paddingHorizontal: 20, paddingBottom: 12, gap: 14, zIndex: 1,
      boxShadow: `0px 6px 14px ${alpha(C.shade, 0.06)}` }}>
      <View style={{ paddingTop: top + 12, gap: 14 }}>
        <View style={s.row}>
          <Logo />
        </View>
        <Input icon="search" placeholder="Κομμωτήριο, γυμναστήριο, ιατρείο…" value={q} onChangeText={setQ} returnKeyType="search" style={{ fontSize: 15 }} />
        {next && <NextBooking b={next} onPress={() => router.push('/bookings')} />}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {cats.map((c) => {
          const on = cat === c.key;
          return (
            <Pressable key={c.key ?? 'all'} onPress={() => setCat(c.key === null || on ? null : c.key)}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingLeft: 12, paddingRight: 14,
                borderRadius: 999, borderWidth: 1.5, backgroundColor: on ? alpha(C.accent, 0.12) : C.soft, borderColor: on ? C.accent : C.soft,
                opacity: pressed ? 0.75 : 1 }]}>
              <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
              <Text style={{ color: on ? C.accent : C.text, fontSize: 14, fontWeight: on ? '800' : '600' }}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const head = (
    <View style={s.row}>
      <Text style={[s.h, { flex: 1 }]}>{cat ? catLabel(cat) : q.trim() ? 'Αποτελέσματα' : 'Όλα τα καταστήματα'}</Text>
      {loaded && <Text style={{ color: C.mute, fontWeight: '600' }}>{list.length}</Text>}
    </View>
  );

  return (
    <View style={s.screen}>
      {fixed}
      <FlatList style={{ flex: 1 }} data={list} keyExtractor={(b) => b.id} contentContainerStyle={[s.pad, { paddingTop: 16, gap: 16 }]}
        ListHeaderComponent={head} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loaded ? <Empty emoji="🔎" title="Δεν βρέθηκαν καταστήματα" text="Δοκίμασε άλλο όνομα ή άλλη κατηγορία."
          action={cat || q ? 'Καθαρισμός φίλτρων' : undefined} onAction={() => { setCat(null); setQ(''); }} /> : undefined}
        renderItem={({ item }) => <BizCard b={item} onPress={() => router.push(`/business/${item.id}`)} />} />
    </View>
  );
}
