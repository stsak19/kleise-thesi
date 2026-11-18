import { ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut, usePerson, useProfileExtras } from '../../../lib/profile/data';
import { Initials } from '../../../lib/profile/parts';
import { AppVersion, modeLabel } from '../../../lib/profile/Settings';
import { useSwitchTo } from '../../../lib/SwitchMode';
import { C, Group, Row, Section, T, s } from '../../../lib/ui';
import { useWide } from '../../../lib/wide';
import { DeskProfile } from '../../../lib/profile/Desk';
import { useMyWork } from '../../../lib/staff';

/* Προφίλ: ταυτότητα στο κέντρο και καθαρές ομάδες, όπως οι ρυθμίσεις του κινητού.
   Τα στοιχεία αλλάζουν στο /me, οι ρυθμίσεις της εφαρμογής (εμφάνιση κ.λπ.) στο /settings.
   Όποιος έχει επιχείρηση μπαίνει σε αυτή από το κουμπί «Επιχείρηση» της κάτω μπάρας (lib/MyBiz). */
export default function Profile() {
  const router = useRouter();
  const top = useSafeAreaInsets().top;
  const person = usePerson();
  const wide = useWide();
  const { hasBiz } = useProfileExtras(person.uid);
  const me = () => router.push('/me');
  const switchTo = useSwitchTo();
  const work = useMyWork().list ?? []; // υπάλληλος σε ομάδα (016)

  // Υπολογιστής: σελίδα λογαριασμού με ενότητες αριστερά και φόρμα δεξιά (lib/profile/Desk).
  if (wide) return <DeskProfile />;

  return (
    <View style={s.screen}>
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: top + 24 }]}>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Initials text={person.initials} size={92} />
        <Text style={{ color: C.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5, marginTop: 8 }} numberOfLines={1}>{person.name || 'Χωρίς όνομα'}</Text>
        <T mute style={{ fontSize: 14 }}>{person.email}</T>
      </View>

      <Section title="Λογαριασμός" />
      <Group>
        <Row icon="user" title="Τα στοιχεία μου" sub={person.p.phone ? `Κινητό ${person.p.phone} · κωδικός` : 'Πρόσθεσε το κινητό σου · κωδικός'} onPress={me} last />
      </Group>

      <Section title="Για επιχειρήσεις" />
      <Group>
        {work.length > 0 && <Row icon="calendar" title="Η δουλειά μου" sub={`Το πρόγραμμά σου · ${work.map((w) => w.business).join(', ')}`} onPress={() => router.push('/work')} />}
        {hasBiz === false
          ? <Row icon="store" title="Έχω επιχείρηση" sub="Φτιάξε τη σελίδα σου βήμα-βήμα, σε λίγα λεπτά" onPress={() => router.push('/new-business')} last />
          : <Row icon="store" title="Λειτουργία επιχείρησης" sub="Πρόγραμμα, κρατήσεις, μηνύματα και σελίδα" onPress={() => switchTo('biz')} last />}
      </Group>

      <Section title="Εφαρμογή" />
      <Group><Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()} · κίνηση · ειδοποιήσεις`} onPress={() => router.push('/settings')} last /></Group>

      <View style={{ marginTop: 10 }}>
        <Group><Row title="Αποσύνδεση" danger last onPress={signOut} right={<View />} /></Group>
        <AppVersion />
      </View>
    </ScrollView>
    </View>
  );
}
