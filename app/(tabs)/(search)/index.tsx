import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { sb } from '../../../lib/supabase';
import { Btn, C, CATEGORIES, Card, Input, catLabel, s, T } from '../../../lib/ui';

type Biz = { id: string; name: string; category: string; city: string; address: string | null; brand_color?: string | null; logo_url?: string | null };

export default function Home() {
  const router = useRouter();
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [list, setList] = useState<Biz[]>([]);

  const load = useCallback(async () => {
    let query = sb.from('businesses').select('*').eq('is_published', true).order('name').limit(100);
    if (cat) query = query.eq('category', cat);
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    const { data } = await query;
    setList((data as Biz[]) ?? []);
  }, [cat, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <View style={s.screen}>
      <View style={[s.pad, { paddingBottom: 0 }]}>
        <Input placeholder="🔎 Αναζήτηση καταστήματος" value={q} onChangeText={setQ} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.key} onPress={() => setCat(cat === c.key ? null : c.key)}
              style={[s.chip, cat === c.key && { backgroundColor: C.accent, borderColor: C.accent }]}>
              <Text style={{ color: cat === c.key ? C.onAccent : C.text }}>{c.emoji} {c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList data={list} keyExtractor={(b) => b.id} contentContainerStyle={s.pad}
        ListEmptyComponent={<T mute>Δεν βρέθηκαν επιχειρήσεις.</T>}
        renderItem={({ item }) => (
          <Link href={`/business/${item.id}`} asChild>
            <Pressable><Card style={{ borderLeftWidth: 5, borderLeftColor: item.brand_color || C.accent, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {item.logo_url
                ? <Image source={{ uri: item.logo_url }} style={{ width: 46, height: 46, borderRadius: 23 }} />
                : <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: item.brand_color || C.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{item.name.slice(0, 1)}</Text></View>}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
                <T mute>{catLabel(item.category)} · {item.city}{item.address ? ` · ${item.address}` : ''}</T>
              </View>
            </Card></Pressable>
          </Link>
        )} />
    </View>
  );
}
