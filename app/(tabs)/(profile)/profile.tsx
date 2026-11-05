import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut, usePerson, useProfileExtras } from '../../../lib/profile/data';
import { Initials } from '../../../lib/profile/parts';
import { modeLabel } from '../../../lib/profile/Settings';
import { Btn, C, Group, Row, Section, T, s } from '../../../lib/ui';

/* Προφίλ: ταυτότητα στο κέντρο και καθαρές ομάδες, όπως οι ρυθμίσεις του κινητού.
   Τα στοιχεία αλλάζουν στο /me, οι ρυθμίσεις της εφαρμογής (εμφάνιση κ.λπ.) στο /settings. */
export default function Profile() {
  const router = useRouter();
  const top = useSafeAreaInsets().top;
  const person = usePerson();
  const { hasBiz, upcoming } = useProfileExtras(person.uid);
  const me = () => router.push('/me');
  const upSub = upcoming == null ? undefined : upcoming === 0 ? 'Κανένα επερχόμενο ραντεβού'
    : `${upcoming} ${upcoming === 1 ? 'επερχόμενο ραντεβού' : 'επερχόμενα ραντεβού'}`;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: top + 24 }]}>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Initials text={person.initials} size={92} />
        <Text style={{ color: C.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5, marginTop: 8 }} numberOfLines={1}>{person.name || 'Χωρίς όνομα'}</Text>
        <T mute style={{ fontSize: 14 }}>{person.email}</T>
        <Btn kind="tint" size="sm" title="Επεξεργασία" onPress={me} style={{ marginTop: 8 }} />
      </View>

      <Section title="Λογαριασμός" />
      <Group>
        <Row icon="user" title="Τα στοιχεία μου" sub={person.p.phone ? `Κινητό ${person.p.phone}` : 'Πρόσθεσε το κινητό σου'} onPress={me} />
        <Row icon="calendar" title="Οι κρατήσεις μου" sub={upSub} onPress={() => router.navigate('/bookings')} last />
      </Group>

      <Section title="Για επιχειρήσεις" />
      <Group>
        {hasBiz === false
          ? <Row icon="store" title="Έχω επιχείρηση" sub="Φτιάξε τη σελίδα σου βήμα-βήμα, σε λίγα λεπτά" onPress={() => router.push('/new-business')} last />
          : <Row icon="store" title="Η επιχείρησή μου" sub="Ωράριο, υπηρεσίες και κρατήσεις" onPress={() => router.push('/owner')} last />}
      </Group>

      <Section title="Εφαρμογή" />
      <Group><Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()} · κίνηση · κωδικός`} onPress={() => router.push('/settings')} last /></Group>

      <View style={{ marginTop: 10 }}>
        <Group><Row title="Αποσύνδεση" danger last onPress={signOut} right={<View />} /></Group>
      </View>
    </ScrollView>
  );
}
