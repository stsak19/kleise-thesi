import { View } from 'react-native';
import { Text } from '../Txt';
import { C } from '../ui';

/* Οι θέσεις ενός μαθήματος ως κουτάκια με στρογγυλεμένες γωνίες: άσπρο = κενή θέση, μαύρο = κρατημένη, και δίπλα «7/12».
   Φαίνονται μόνο όταν το θέλει ο ιδιοκτήτης (services.show_seats, supabase/migrations/014).
   Πάνω από 24 θέσεις τα κουτάκια μικραίνουν και πάνε σε δεύτερη σειρά. */
export function Seats({ taken, capacity, size }: { taken: number; capacity: number; size?: number }) {
  const cap = Math.max(1, capacity), n = Math.min(cap, Math.max(0, taken));
  const sz = size ?? (cap > 24 ? 9 : 12);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      accessible accessibilityLabel={`${n} από ${cap} θέσεις κρατημένες`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flexShrink: 1 }}>
        {Array.from({ length: cap }, (_, i) => (
          <View key={i} style={{ width: sz, height: sz, borderRadius: Math.round(sz / 3), borderWidth: 1.5, borderColor: C.text,
            backgroundColor: i < n ? C.text : C.bg }} />
        ))}
      </View>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{n}/{cap}</Text>
    </View>
  );
}
