import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMode, setMode } from '../theme';
import { Btn, C, Card, Group, Icon, Row, ScreenHeader, Section, T, Toggle, alpha, onColor, s, shadow } from '../ui';
import { signOut, usePerson, useProfileExtras } from './data';
import { Initials, MeForm, NextCard, Segments, Stats, Tile } from './parts';
import { SettingsBody, modeLabel } from './Settings';

/* Οι εκδοχές του προφίλ. Όλες έχουν τα ίδια στοιχεία (εγώ, κρατήσεις, επιχείρηση, ρυθμίσεις)
   με διαφορετική οργάνωση. ΠΡΟΣΩΡΙΝΑ υπάρχει μπάρα εναλλαγής κάτω, μέχρι να διαλεχτεί μία. */

type P = { person: ReturnType<typeof usePerson>; extras: ReturnType<typeof useProfileExtras> };
const BOTTOM = 80; // χώρος για τη μπάρα εναλλαγής

function useNav() {
  const router = useRouter();
  return {
    me: () => router.push('/me'),
    settings: () => router.push('/settings'),
    bookings: () => router.navigate('/bookings'),
    find: () => router.navigate('/'),
    biz: (has: boolean | null) => () => router.push(has === false ? '/new-business' : '/owner'),
  };
}
const bizTitle = (has: boolean | null) => (has === false ? 'Έχω επιχείρηση' : 'Η επιχείρησή μου');
const bizSub = (has: boolean | null) => (has === false ? 'Φτιάξε τη σελίδα σου βήμα-βήμα' : 'Ωράριο, υπηρεσίες και κρατήσεις');
const upcomingSub = (n?: number) => (n == null ? undefined : n === 0 ? 'Κανένα επερχόμενο ραντεβού' : `${n} ${n === 1 ? 'επερχόμενο ραντεβού' : 'επερχόμενα ραντεβού'}`);
const SignOut = () => <Group><Row title="Αποσύνδεση" danger last onPress={signOut} right={<View />} /></Group>;

/* ---------- 0. Τωρινή (όπως ήταν, με μια γραμμή «Ρυθμίσεις») ---------- */
export function Current({ person, extras }: P) {
  const go = useNav();
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0, paddingBottom: BOTTOM }]} keyboardShouldPersistTaps="handled">
      <View style={{ marginHorizontal: -20 }}><ScreenHeader title="Προφίλ" /></View>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}>
        <Initials text={person.initials} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 20, letterSpacing: -0.4 }} numberOfLines={1}>{person.name || 'Χωρίς όνομα'}</Text>
          <T mute style={{ fontSize: 14 }}>{person.email}</T>
        </View>
      </Card>
      <Section title="Τα στοιχεία μου" sub="Τα βλέπει η επιχείρηση όταν κλείνεις θέση." />
      <MeForm person={person} />
      <Section title="Για επιχειρήσεις" />
      <Group><Row icon="store" title={bizTitle(extras.hasBiz)} sub={bizSub(extras.hasBiz)} onPress={go.biz(extras.hasBiz)} last /></Group>
      <Section title="Εφαρμογή" />
      <Group><Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()}`} onPress={go.settings} last /></Group>
      <View style={{ marginTop: 10 }}><SignOut /></View>
    </ScrollView>
  );
}

/* ---------- 1. Λίστα: ταυτότητα στο κέντρο και καθαρές ομάδες, όπως οι ρυθμίσεις του κινητού ---------- */
export function List({ person, extras }: P) {
  const go = useNav();
  const top = useSafeAreaInsets().top;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: top + 24, paddingBottom: BOTTOM }]}>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Initials text={person.initials} size={92} />
        <Text style={{ color: C.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5, marginTop: 8 }} numberOfLines={1}>{person.name || 'Χωρίς όνομα'}</Text>
        <T mute style={{ fontSize: 14 }}>{person.email}</T>
        <Btn kind="tint" size="sm" title="Επεξεργασία" onPress={go.me} style={{ marginTop: 8 }} />
      </View>

      <Section title="Λογαριασμός" />
      <Group>
        <Row icon="user" title="Τα στοιχεία μου" sub={person.p.phone ? `Κινητό ${person.p.phone}` : 'Πρόσθεσε το κινητό σου'} onPress={go.me} />
        <Row icon="calendar" title="Οι κρατήσεις μου" sub={upcomingSub(extras.stats?.upcoming)} onPress={go.bookings} last />
      </Group>
      <Section title="Για επιχειρήσεις" />
      <Group><Row icon="store" title={bizTitle(extras.hasBiz)} sub={bizSub(extras.hasBiz)} onPress={go.biz(extras.hasBiz)} last /></Group>
      <Section title="Εφαρμογή" />
      <Group><Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()} · κίνηση · κωδικός`} onPress={go.settings} last /></Group>
      <View style={{ marginTop: 10 }}><SignOut /></View>
    </ScrollView>
  );
}

/* ---------- 2. Εξώφυλλο: χρωματιστή κορυφή, avatar που «πατάει» πάνω της, νούμερα ---------- */
export function Cover({ person, extras }: P) {
  const go = useNav();
  const top = useSafeAreaInsets().top;
  const fg = onColor(C.accent);
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: BOTTOM }}>
      <View style={{ height: top + 130, backgroundColor: C.accent, paddingTop: top + 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text style={{ flex: 1, color: fg, fontWeight: '800', fontSize: 17 }}>Προφίλ</Text>
        <Pressable onPress={go.settings} accessibilityLabel="Ρυθμίσεις" hitSlop={8}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: alpha(fg, 0.2), alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Icon name="gear" size={20} color={fg} />
        </Pressable>
      </View>
      <View style={{ alignItems: 'center', marginTop: -50, gap: 4 }}>
        <Initials text={person.initials} size={100} ring={C.bg} />
        <Text style={{ color: C.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5, marginTop: 8 }} numberOfLines={1}>{person.name || 'Χωρίς όνομα'}</Text>
        <T mute style={{ fontSize: 14 }}>{person.email}</T>
      </View>
      <View style={[s.pad, { paddingBottom: 0 }]}>
        <Stats stats={extras.stats} onPress={go.bookings} />
        <View style={{ marginTop: 6 }} />
        <Group>
          <Row icon="user" title="Τα στοιχεία μου" sub="Όνομα, επώνυμο, κινητό" onPress={go.me} />
          <Row icon="calendar" title="Οι κρατήσεις μου" onPress={go.bookings} />
          <Row icon="store" title={bizTitle(extras.hasBiz)} sub={bizSub(extras.hasBiz)} onPress={go.biz(extras.hasBiz)} />
          <Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()}`} onPress={go.settings} last />
        </Group>
        <Pressable onPress={signOut} style={({ pressed }) => ({ alignSelf: 'center', padding: 12, marginTop: 4, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: C.bad, fontWeight: '700', fontSize: 15 }}>Αποσύνδεση</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ---------- 3. Πλακίδια: χαιρετισμός, επόμενο ραντεβού, πλέγμα και γρήγορος διακόπτης σκούρας εμφάνισης ---------- */
export function Tiles({ person, extras }: P) {
  const go = useNav();
  const [dark, setDark] = useState(getMode() === 'dark');
  const first = person.p.first_name.trim();
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0, paddingBottom: BOTTOM }]}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader eyebrow="Γεια σου 👋" title={first || 'Προφίλ'}
          right={<Pressable onPress={go.me} accessibilityLabel="Τα στοιχεία μου"><Initials text={person.initials} size={48} /></Pressable>} />
      </View>
      <NextCard next={extras.stats ? extras.stats.next : undefined} onPress={go.bookings} onFind={go.find} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        <Tile icon="user" title="Τα στοιχεία μου" sub={person.p.phone || 'Πρόσθεσε κινητό'} onPress={go.me} />
        <Tile icon="calendar" title="Κρατήσεις" sub={upcomingSub(extras.stats?.upcoming)} onPress={go.bookings} color={C.ok} />
        <Tile icon="store" title={bizTitle(extras.hasBiz)} sub={bizSub(extras.hasBiz)} onPress={go.biz(extras.hasBiz)} color={C.btn2Text} />
        <Tile icon="gear" title="Ρυθμίσεις" sub="Εμφάνιση, κίνηση, κωδικός" onPress={go.settings} color={C.mute} />
      </View>
      <View style={{ marginTop: 6 }} />
      <Group>
        <Row icon={dark ? 'moon' : 'sun'} title="Σκούρα εμφάνιση" last
          right={<Toggle value={dark} onChange={(v) => { setDark(v); setMode(v ? 'dark' : 'light'); }} />} />
      </Group>
      <View style={{ marginTop: 6 }}><SignOut /></View>
    </ScrollView>
  );
}

/* ---------- 4. Καρτέλες: όλα σε μία οθόνη, χωρισμένα σε «Εγώ · Επιχείρηση · Ρυθμίσεις» ---------- */
type Tab = 'me' | 'biz' | 'set';
let lastTab: Tab = 'me'; // μένει η ίδια καρτέλα όταν αλλάζει η εμφάνιση
export function Tabs({ person, extras }: P) {
  const go = useNav();
  const [tab, setTabState] = useState<Tab>(lastTab);
  const setTab = (t: Tab) => { lastTab = t; setTabState(t); };
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0, paddingBottom: BOTTOM }]} keyboardShouldPersistTaps="handled">
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title={person.name || 'Προφίλ'} sub={person.email} right={<Initials text={person.initials} size={52} />} />
      </View>
      <View style={{ marginTop: 6 }}>
        <Segments<Tab> items={[['me', 'Εγώ'], ['biz', 'Επιχείρηση'], ['set', 'Ρυθμίσεις']]} value={tab} onChange={setTab} />
      </View>

      {tab === 'me' && <>
        <Stats stats={extras.stats} onPress={go.bookings} />
        <Section title="Τα στοιχεία μου" />
        <MeForm person={person} />
      </>}

      {tab === 'biz' && (
        <Card style={{ gap: 12, padding: 20, alignItems: 'flex-start' }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: alpha(C.accent, 0.12), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="store" size={26} color={C.accent} />
          </View>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 20, letterSpacing: -0.4 }}>{bizTitle(extras.hasBiz)}</Text>
          <T mute>{extras.hasBiz === false
            ? 'Έχεις κατάστημα; Φτιάξε τη σελίδα σου σε λίγα λεπτά και δέξου κρατήσεις από την εφαρμογή.'
            : 'Δες το πρόγραμμα της ημέρας, άλλαξε ωράριο και υπηρεσίες, και απάντησε σε αιτήματα.'}</T>
          <Btn title={extras.hasBiz === false ? 'Ξεκίνα' : 'Άνοιγμα'} onPress={go.biz(extras.hasBiz)} style={{ alignSelf: 'stretch', marginTop: 4 }} />
        </Card>
      )}

      {tab === 'set' && <SettingsBody compact />}

      <View style={{ marginTop: 10 }}><SignOut /></View>
    </ScrollView>
  );
}

export const VARIANTS = [
  { name: 'Τωρινή', C: Current },
  { name: 'Λίστα', C: List },
  { name: 'Εξώφυλλο', C: Cover },
  { name: 'Πλακίδια', C: Tiles },
  { name: 'Καρτέλες', C: Tabs },
];
