import { Text, View } from 'react-native';
import { Btn, C, Card, Input, alpha, s } from '../ui';
import { usePerson } from './data';

/* Κομμάτια του προφίλ. */

/* Στρογγυλό avatar με τα αρχικά. */
export const Initials = ({ text, size = 64 }: { text: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    boxShadow: `0px 8px 18px ${alpha(C.accent, 0.3)}` }}>
    <Text style={{ color: C.onAccent, fontWeight: '900', fontSize: size * 0.36 }}>{text}</Text>
  </View>
);

/* Φόρμα «Τα στοιχεία μου». */
export function MeForm({ person, onSaved, card = true }: { person: ReturnType<typeof usePerson>; onSaved?: () => void; card?: boolean }) {
  const { p, setP, save } = person;
  const body = (
    <View style={{ gap: 14 }}>
      <View style={[s.row, { gap: 10 }]}>
        <View style={{ flex: 1 }}><Input label="Όνομα" placeholder="Μαρία" value={p.first_name} onChangeText={(v) => setP({ ...p, first_name: v })} /></View>
        <View style={{ flex: 1 }}><Input label="Επώνυμο" placeholder="Παπαδοπούλου" value={p.last_name} onChangeText={(v) => setP({ ...p, last_name: v })} /></View>
      </View>
      <Input label="Κινητό" icon="phone" placeholder="69xxxxxxxx" keyboardType="phone-pad" value={p.phone} onChangeText={(v) => setP({ ...p, phone: v })} />
      <Text style={{ color: C.mute, fontSize: 13 }}>Τα βλέπει η επιχείρηση όταν κλείνεις θέση.</Text>
      <Btn title="Αποθήκευση" onPress={async () => { if (await save()) onSaved?.(); }} />
    </View>
  );
  return card ? <Card style={{ gap: 14 }}>{body}</Card> : body;
}
