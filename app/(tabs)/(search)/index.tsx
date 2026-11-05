import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, View } from 'react-native';
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


/* Το όνομα της εφαρμογής ως λογότυπο-κείμενο: το «On» είναι πράσινο (σε μαύρο κουτάκι στην ανοιχτή εμφάνιση). */
const Logo = () => {
  const light = isLight(C.bg);
  return (
    <View style={[s.row, { gap: 2 }]}>
      <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: -1.2, color: C.text }}>Spot</Text>
      <View>
        <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: -1.2, color: C.mute }}>On</Text>
      </View>
    </View>
  );
};

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

/* Κάρτα «Επόμενη κράτηση»: σκούρα με πράσινη διαβάθμιση και λάμψη από κάτω. */
const NextBooking = ({ b, onPress }: { b: Next; onPress: () => void }) => {
  const light = isLight(C.bg);
  const d = new Date(b.date + 'T00:00');
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, { gap: 14, padding: 12, paddingRight: 16, borderRadius: 22, opacity: pressed ? 0.85 : 1,
      boxShadow: `0px 8px 24px ${alpha('#000000', light ? 0.12 : 0.3)}` },
      { backgroundColor: C.ink, borderWidth: 1, borderColor: C.inkLine }]}>
      <View style={{ width: 50, height: 54, borderRadius: 16, backgroundColor: alpha(C.inkText, 0.08), alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.inkText, fontSize: 12, fontWeight: '600' }}>{DAYS[d.getDay()]}</Text>
        <Text style={{ color: C.inkText, fontSize: 21, fontWeight: '800', marginTop: -3 }}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: alpha(C.inkText, 0.7), fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 }}>ΕΠΟΜΕΝΗ ΚΡΑΤΗΣΗ · {b.time}</Text>
        <Text style={{ color: C.inkText, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{b.business}</Text>
        <Text style={{ color: alpha(C.inkText, 0.72), fontSize: 13 }} numberOfLines={1}>{b.service}</Text>
      </View>
      <Icon name="chevron" size={16} color={C.inkText} />
    </Pressable>
  );
};

/* Χαιρετισμός με το μικρό όνομα του χρήστη, ανάλογα με την ώρα. */
function Hello() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  useEffect(() => {
    const uid = session?.user.id; if (!uid) return;
    sb.from('profiles').select('first_name').eq('id', uid).maybeSingle().then(({ data }) => setName(data?.first_name ?? ''));
  }, [session?.user.id]);
  const h = new Date().getHours();
  const hi = h < 12 ? 'Καλημέρα' : h < 18 ? 'Καλό απόγευμα' : 'Καλησπέρα';
  return <Text style={{ color: C.mute, fontSize: 14, marginTop: -10 }}>{name ? `${hi}, ${name}` : hi}</Text>;
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
  const next = useNextBooking();

  /* Πάνω μέρος σταθερό: λογότυπο, αναζήτηση, επόμενη κράτηση και κατηγορίες μένουν στη θέση τους όσο κυλάει η λίστα. */
  const fixed = (
    <View style={{ backgroundColor: C.bg, paddingHorizontal: 20, paddingBottom: 12, gap: 14, zIndex: 1,
      borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ paddingTop: top + 12, gap: 14 }}>
        <View style={s.row}>
          <Logo />
        </View>
        <Hello />
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
      <FlatList style={{ flex: 1 }} data={list} keyExtractor={(b) => b.id} contentContainerStyle={[s.pad, { paddingTop: 16, gap: 16 }]}
        ListHeaderComponent={head} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loaded ? <Empty emoji="🔎" title="Δεν βρέθηκαν καταστήματα" text="Δοκίμασε άλλο όνομα ή άλλη κατηγορία."
          action={cat || q ? 'Καθαρισμός φίλτρων' : undefined} onAction={() => { setCat(null); setQ(''); }} /> : undefined}
        renderItem={({ item }) => <BizCard b={item} onPress={() => router.push(`/business/${item.id}`)} />} />
    </View>
  );
}
