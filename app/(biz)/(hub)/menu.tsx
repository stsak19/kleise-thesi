import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { signOut, usePerson } from '../../../lib/profile/data';
import { Initials } from '../../../lib/profile/parts';
import { modeLabel } from '../../../lib/profile/Settings';
import { SwitchPill } from '../../../lib/SwitchMode';
import { C, Card, Group, Row, ScreenHeader, Section, T, TAB_SPACE, s } from '../../../lib/ui';

/* «Μενού» της επιχείρησης: ο λογαριασμός, οι ρυθμίσεις της εφαρμογής και η επιστροφή στη λειτουργία πελάτη. */
export default function Menu() {
  const router = useRouter();
  const person = usePerson();
  return (
    <View style={s.screen}>
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0, paddingBottom: TAB_SPACE + 60 }]}>
        <View style={{ marginHorizontal: -20 }}>
          <ScreenHeader title="Μενού" />
        </View>
        <Card onPress={() => router.push('/account')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
          <Initials text={person.initials} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>{person.name || 'Χωρίς όνομα'}</Text>
            <T mute style={{ fontSize: 14 }}>{person.email}</T>
          </View>
        </Card>

        <Section title="Εφαρμογή" />
        <Group>
          <Row icon="user" title="Τα στοιχεία μου" sub={person.p.phone ? `Κινητό ${person.p.phone}` : 'Πρόσθεσε το κινητό σου'} onPress={() => router.push('/account')} />
          <Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()} · κίνηση · κωδικός`} onPress={() => router.push('/app-settings')} last />
        </Group>

        <View style={{ marginTop: 10 }}>
          <Group><Row title="Αποσύνδεση" danger last onPress={signOut} right={<View />} /></Group>
        </View>
      </ScrollView>
      <SwitchPill to="client" />
    </View>
  );
}
