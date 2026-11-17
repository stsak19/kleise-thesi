import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../Txt';
import { Photo } from '../Photo';
import { C, s } from '../ui';
import { styleOf } from '../presets';
import { useFavorites } from '../favorites';

/* «Τα αγαπημένα σου» στην κορυφή της αρχικής: στρογγυλά λογότυπα (σαν stories), ένα πάτημα και ανοίγει το κατάστημα.
   Φαίνεται μόνο όταν ο πελάτης έχει πατήσει την καρδιά σε τουλάχιστον ένα κατάστημα. */
export function FavRow({ pad = 16 }: { pad?: number }) {
  const favs = useFavorites();
  const router = useRouter();
  if (!favs.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <Text style={[s.h, { paddingHorizontal: pad }]}>Τα αγαπημένα σου</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: pad }}>
        {favs.map((b) => (
          <Pressable key={b.id} onPress={() => router.push(`/store/${b.id}`)} accessibilityLabel={b.name}
            style={({ pressed, hovered }: any) => ({ width: 74, alignItems: 'center', gap: 6, opacity: pressed || hovered ? 0.75 : 1 })}>
            <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: C.text, padding: 3 }}>
              <View style={{ flex: 1, borderRadius: 35, overflow: 'hidden' }}>
                <Photo uri={b.logo_url ?? b.cover_url} color={styleOf(b).color} letter={b.logo_url || b.cover_url ? undefined : b.name.slice(0, 1)} />
              </View>
            </View>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: '700', textAlign: 'center', width: 74 }} numberOfLines={1}>{b.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
