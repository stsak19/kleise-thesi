import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MeForm } from '../../../lib/profile/parts';
import { usePerson } from '../../../lib/profile/data';
import { s } from '../../../lib/ui';

/* «Τα στοιχεία μου»: όνομα, επώνυμο, κινητό. */
export default function Me() {
  const router = useRouter();
  const person = usePerson();
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 4 }]} keyboardShouldPersistTaps="handled">
      <MeForm person={person} onSaved={() => router.back()} />
    </ScrollView>
  );
}
