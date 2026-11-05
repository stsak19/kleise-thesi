import { View } from 'react-native';
import { usePerson, useProfileExtras } from '../../../lib/profile/data';
import { VariantBar, useVariant } from '../../../lib/profile/parts';
import { VARIANTS } from '../../../lib/profile/variants';
import { s } from '../../../lib/ui';

/* Προφίλ. ΠΡΟΣΩΡΙΝΑ: η μπάρα κάτω αλλάζει ανάμεσα σε 4 εκδοχές (lib/profile/variants.tsx), μέχρι να διαλεχτεί μία.
   Οι ρυθμίσεις της εφαρμογής (εμφάνιση κ.λπ.) είναι στο /settings. */
export default function Profile() {
  const person = usePerson();
  const extras = useProfileExtras(person.uid);
  const [v, setV] = useVariant();
  const V = (VARIANTS[v] ?? VARIANTS[0]).C;
  return (
    <View style={s.screen}>
      <V person={person} extras={extras} />
      <VariantBar names={VARIANTS.map((x) => x.name)} v={v} setV={setV} />
    </View>
  );
}
