import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { sb } from '../../../lib/supabase';
import { C, CATEGORIES, Card, Empty, Icon, Input, ScreenHeader, alpha, catEmoji, catLabel, s, shadow } from '../../../lib/ui';

import { styleOf } from '../../../lib/presets';
type Biz = { theme?: string | null; layout?: string | null; id: string; name: string; category: string; city: string; address: string | null; brand_color?: string | null; logo_url?: string | null; cover_url?: string | null };

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Καλημέρα ☀️' : h < 19 ? 'Καλησπέρα 👋' : 'Καλό βράδυ 🌙'; };

/* Κάρτα καταστήματος: εξώφυλλο (ή το χρώμα του με το σύμβολο της κατηγορίας) και στοιχεία. */
function BizCard({ b, onPress }: { b: Biz; onPress: () => void }) {
  const brand = styleOf(b).color;
  return (
    <Card onPress={onPress} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
      <View style={{ height: 112, backgroundColor: brand, overflow: 'hidden' }}>
        {b.cover_url
          ? <Image source={{ uri: b.cover_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <>
              <View style={{ position: 'absolute', right: -30, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ position: 'absolute', right: 60, bottom: -60, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ position: 'absolute', right: 22, top: 22, fontSize: 52 }}>{catEmoji(b.category)}</Text>
            </>}
      </View>
      <View style={{ padding: 16, paddingTop: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
        <View style={{ marginTop: -40, width: 60, height: 60, borderRadius: 18, backgroundColor: C.card, padding: 3, ...shadow(1) }}>
          {b.logo_url
            ? <Image source={{ uri: b.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 15 }} />
            : <View style={{ flex: 1, borderRadius: 15, backgroundColor: alpha(brand, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: brand, fontWeight: '900', fontSize: 24 }}>{b.name.slice(0, 1)}</Text>
              </View>}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, letterSpacing: -0.2 }} numberOfLines={1}>{b.name}</Text>
          <Text style={{ color: brand, fontWeight: '700', fontSize: 13 }}>{catLabel(b.category)}</Text>
        </View>
      </View>
      <View style={[s.row, { paddingHorizontal: 16, paddingBottom: 14, gap: 6 }]}>
        <Icon name="pin" size={15} color={C.mute} />
        <Text style={{ color: C.mute, fontSize: 14, flex: 1 }} numberOfLines={1}>{b.city}{b.address ? ` · ${b.address}` : ''}</Text>
      </View>
    </Card>
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

  const head = (
    <View style={{ gap: 14 }}>
      <View style={{ marginHorizontal: -20 }}><ScreenHeader eyebrow={hello()} title="Πού θα κλείσεις;" /></View>
      <Input icon="search" placeholder="Αναζήτηση καταστήματος" value={q} onChangeText={setQ} returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ gap: 4, paddingHorizontal: 14 }}>
        {CATEGORIES.map((c) => {
          const on = cat === c.key;
          return (
            <Pressable key={c.key} onPress={() => setCat(on ? null : c.key)} style={({ pressed }) => ({ width: 78, alignItems: 'center', gap: 7, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
                backgroundColor: on ? alpha(C.accent, 0.14) : C.soft, borderColor: on ? C.accent : C.soft }}>
                <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
              </View>
              <Text style={{ color: on ? C.accent : C.text, fontSize: 12, fontWeight: on ? '800' : '600', textAlign: 'center' }} numberOfLines={2}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[s.row, { marginTop: 6 }]}>
        <Text style={[s.h, { flex: 1 }]}>{cat ? catLabel(cat) : q.trim() ? 'Αποτελέσματα' : 'Καταστήματα'}</Text>
        {loaded && <Text style={{ color: C.mute, fontWeight: '600' }}>{list.length}</Text>}
      </View>
    </View>
  );

  return (
    <FlatList style={s.screen} data={list} keyExtractor={(b) => b.id} contentContainerStyle={[s.pad, { paddingTop: 0, gap: 16 }]}
      ListHeaderComponent={head} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={loaded ? <Empty emoji="🔎" title="Δεν βρέθηκαν καταστήματα" text="Δοκίμασε άλλο όνομα ή άλλη κατηγορία."
        action={cat || q ? 'Καθαρισμός φίλτρων' : undefined} onAction={() => { setCat(null); setQ(''); }} /> : undefined}
      renderItem={({ item }) => <BizCard b={item} onPress={() => router.push(`/business/${item.id}`)} />} />
  );
}
