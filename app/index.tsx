import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { sb } from '../lib/supabase';
import { Btn, C, CATEGORIES, Card, Input, catLabel, s, T } from '../lib/ui';

type Biz = { id: string; name: string; category: string; city: string; address: string | null };

export default function Home() {
  const router = useRouter();
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [list, setList] = useState<Biz[]>([]);

  const load = useCallback(async () => {
    let query = sb.from('businesses').select('id,name,category,city,address').eq('is_published', true).order('name').limit(100);
    if (cat) query = query.eq('category', cat);
    if (city.trim()) query = query.ilike('city', `%${city.trim()}%`);
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    const { data } = await query;
    setList((data as Biz[]) ?? []);
  }, [cat, city, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <View style={s.screen}>
      <View style={[s.pad, { paddingBottom: 0 }]}>
        <View style={s.row}>
          <Btn kind="ghost" title="Οι κρατήσεις μου" onPress={() => router.push('/bookings')} style={{ flex: 1 }} />
          <Btn kind="ghost" title="Επιχείρηση" onPress={() => router.push('/owner')} />
          <Btn kind="ghost" title="👤" onPress={() => router.push('/profile')} />
        </View>
        <Input placeholder="Αναζήτηση ονόματος" value={q} onChangeText={setQ} />
        <Input placeholder="Πόλη (π.χ. Αθήνα, Θεσσαλονίκη)" value={city} onChangeText={setCity} />
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
            <Pressable><Card>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
              <T mute>{catLabel(item.category)} · {item.city}{item.address ? ` · ${item.address}` : ''}</T>
            </Card></Pressable>
          </Link>
        )} />
    </View>
  );
}
