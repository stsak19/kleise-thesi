import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sb } from '../../../lib/supabase';
import { C, CATEGORIES, Card, Empty, Icon, Input, alpha, catLabel, s, shadow } from '../../../lib/ui';

import { styleOf } from '../../../lib/presets';
import { Photo } from '../../../lib/Photo';
type Biz = { theme?: string | null; layout?: string | null; id: string; name: string; category: string; city: string; address: string | null; brand_color?: string | null; logo_url?: string | null; cover_url?: string | null };

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Καλημέρα ☀️' : h < 19 ? 'Καλησπέρα 👋' : 'Καλό βράδυ 🌙'; };

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

  const head = (
    <View style={{ gap: 16 }}>
      {/* Πάνω μέρος: απαλή ζώνη στο κύριο χρώμα με χαιρετισμό, τίτλο και αναζήτηση. */}
      <View style={{ marginHorizontal: -20, paddingTop: top + 16, paddingHorizontal: 20, paddingBottom: 22, gap: 16,
        backgroundColor: alpha(C.accent, 0.07), borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <View style={[s.row, { alignItems: 'flex-start', gap: 12 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: C.mute, fontSize: 14, fontWeight: '600' }}>{hello()}</Text>
            <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 }}>Πού θα κλείσεις;</Text>
          </View>
          <Pressable onPress={() => router.push('/bookings')} accessibilityRole="button" accessibilityLabel="Οι κρατήσεις μου" hitSlop={6}
            style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.75 : 1 }, shadow(1)]}>
            <Icon name="calendar" size={20} color={C.accent} />
          </Pressable>
        </View>
        <Input icon="search" placeholder="Κομμωτήριο, γυμναστήριο, ιατρείο…" value={q} onChangeText={setQ} returnKeyType="search"
          style={{ fontSize: 15 }} box={{ backgroundColor: C.bg, borderColor: C.bg, ...shadow(1) }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
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
      <View style={s.row}>
        <Text style={[s.h, { flex: 1 }]}>{cat ? catLabel(cat) : q.trim() ? 'Αποτελέσματα' : 'Όλα τα καταστήματα'}</Text>
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
