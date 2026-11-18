import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Text } from '../Txt';
import { replayIntro } from '../Intro';
import { setPref, usePrefs } from '../prefs';
import { useSwitchTo } from '../SwitchMode';
import { Btn, C, Icon, Toggle, s } from '../ui';
import type { IconName } from '../Icon';
import { signOut, usePerson, useProfileExtras } from './data';
import { Initials, MeForm } from './parts';
import { useMyWork } from '../staff';
import { AdminRow, AppearancePicker, NotifyPrefs, PasswordForm } from './Settings';

/* Το προφίλ σε υπολογιστή (εκδοχή Α): όνομα πάνω, ενότητες αριστερά και η φόρμα της επιλεγμένης δεξιά,
   όπως στις ρυθμίσεις λογαριασμού μιας ιστοσελίδας. Όλα αλλάζουν επιτόπου, χωρίς να ανοίγει άλλη οθόνη. */
type Key = 'me' | 'look' | 'notify' | 'biz' | 'help';
const SECTIONS: { key: Key; icon: IconName; label: string; sub: string }[] = [
  { key: 'me', icon: 'user', label: 'Τα στοιχεία μου', sub: 'Όνομα, κινητό, κωδικός και διαγραφή λογαριασμού.' },
  { key: 'look', icon: 'eye', label: 'Εμφάνιση', sub: 'Η «Αυτόματα» ακολουθεί τη ρύθμιση του υπολογιστή.' },
  { key: 'notify', icon: 'bell', label: 'Ειδοποιήσεις', sub: 'Έρχονται στο κινητό, ακόμα κι όταν η εφαρμογή είναι κλειστή.' },
  { key: 'biz', icon: 'store', label: 'Για επιχειρήσεις', sub: 'Πρόγραμμα, κρατήσεις, μηνύματα και σελίδα του καταστήματός σου.' },
  { key: 'help', icon: 'gear', label: 'Βοήθεια', sub: 'Δες ξανά πώς δουλεύει η εφαρμογή.' },
];
let last: Key = 'me';
// Όπως στο κινητό: ο Λογαριασμός (κωδικός, διαγραφή) είναι μέσα στα «Τα στοιχεία μου»· απόρρητο και έκδοση = απλό κείμενο κάτω από την Αποσύνδεση.

const Label = ({ t }: { t: string }) => <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{t}</Text>;
const Line = ({ title, sub, right }: { title: string; sub?: string; right: React.ReactNode }) => (
  <View style={[s.row, { gap: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line }]}>
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>
      {!!sub && <Text style={{ color: C.mute, fontSize: 13, marginTop: 2 }}>{sub}</Text>}
    </View>
    {right}
  </View>
);

export function DeskProfile() {
  const router = useRouter();
  const person = usePerson();
  const { hasBiz } = useProfileExtras(person.uid);
  const switchTo = useSwitchTo();
  const work = useMyWork().list ?? []; // υπάλληλος σε ομάδα (017)
  const prefs = usePrefs();
  const [sel, setSelS] = useState<Key>(last);
  const [pass, setPass] = useState(false);
  const setSel = (k: Key) => { last = k; setSelS(k); };
  const cur = SECTIONS.find((x) => x.key === sel)!;

  const body = sel === 'me' ? (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Label t="Email" />
        <View style={{ backgroundColor: C.soft, borderRadius: 14, minHeight: 52, justifyContent: 'center', paddingHorizontal: 14 }}>
          <Text style={{ color: C.mute, fontSize: 15 }}>{person.email}</Text>
        </View>
      </View>
      <MeForm person={person} card={false} />
      <View style={{ height: 18 }} />
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>Λογαριασμός</Text>
      <AdminRow line={(go) => <Line title="Super admin" sub="Διαχείριση όλης της πλατφόρμας" right={<Btn size="sm" title="Άνοιγμα" onPress={go} />} />} />
      <Line title="Κωδικός" sub="Άλλαξε τον κωδικό σύνδεσης" right={<Btn size="sm" kind={pass ? 'ghost' : undefined} title={pass ? 'Άκυρο' : 'Αλλαγή κωδικού'} onPress={() => setPass(!pass)} />} />
      {pass && <PasswordForm onDone={() => setPass(false)} />}
      <Line title="Διαγραφή λογαριασμού" sub="Με αίτηση: σβήνεται σε 7 μέρες και ως τότε ακυρώνεται" right={<Btn size="sm" kind="danger" title="Αίτηση" onPress={() => router.push('/delete-account')} />} />
    </View>
  ) : sel === 'look' ? (
    <View style={{ gap: 8 }}>
      <AppearancePicker />
      <View style={{ height: 14 }} />
      <Line title="Λιγότερη κίνηση" sub="Σταματά τα κινούμενα εφέ στις οθόνες" right={<Toggle value={prefs.reduceMotion} onChange={(v) => setPref('reduceMotion', v)} />} />
    </View>
  ) : sel === 'notify' ? (
    <NotifyPrefs bare />
  ) : sel === 'biz' ? (<View style={{ gap: 8 }}>
    {work.length > 0 && <Line title="Η δουλειά μου" sub={`Το πρόγραμμά σου · ${work.map((w) => w.business).join(', ')}`} right={<Btn size="sm" title="Άνοιγμα" onPress={() => router.push('/work')} />} />}
    {hasBiz === false
      ? <Line title="Έχω επιχείρηση" sub="Φτιάξε τη σελίδα σου βήμα-βήμα, σε λίγα λεπτά" right={<Btn size="sm" title="Ξεκίνα" onPress={() => router.push('/new-business')} />} />
      : <Line title="Λειτουργία επιχείρησης" sub="Πρόγραμμα, κρατήσεις, μηνύματα και σελίδα" right={<Btn size="sm" title="Μετάβαση" onPress={() => switchTo('biz')} />} />}
  </View>) : (
    <View>
      <Line title="Δες ξανά την ξενάγηση" sub="Τα 4 βήματα της πρώτης φοράς" right={<Btn size="sm" kind="ghost" title="Ξενάγηση" onPress={replayIntro} />} />
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingVertical: 36, paddingHorizontal: 48 }}>
      <View style={{ width: '100%', maxWidth: 940, gap: 28 }}>
        <View style={[s.row, { gap: 18 }]}>
          <Initials text={person.initials} size={72} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 30, letterSpacing: -0.6 }} numberOfLines={1}>{person.name || 'Ο λογαριασμός μου'}</Text>
            <Text style={{ color: C.mute, fontSize: 15 }} numberOfLines={1}>{person.email}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 40, alignItems: 'flex-start' }}>
          <View style={{ width: 220, gap: 2 }} accessibilityRole="tablist">
            {SECTIONS.map((x) => {
              const on = x.key === sel;
              return (
                <Pressable key={x.key} onPress={() => setSel(x.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                  style={({ hovered }: any) => [s.row, { gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: on || hovered ? C.soft : 'transparent' }]}>
                  <Icon name={x.icon} size={17} color={on ? C.text : C.mute} />
                  <Text style={{ color: on ? C.text : C.mute, fontWeight: '700', fontSize: 14 }}>{x.label}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={signOut} style={({ hovered }: any) => ({ marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: hovered ? C.soft : 'transparent' })}>
              <Text style={{ color: C.bad, fontWeight: '700', fontSize: 14 }}>Αποσύνδεση</Text>
            </Pressable>
            <View style={{ paddingHorizontal: 12, marginTop: 10, gap: 6 }}>
              <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" style={{ alignSelf: 'flex-start' }}>
                <Text style={{ color: C.mute, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' }}>Πολιτική απορρήτου</Text>
              </Pressable>
              <Text style={{ color: C.mute, fontSize: 13 }}>Έκδοση {Constants.expoConfig?.version ?? '—'}</Text>
            </View>
          </View>
          <View style={{ flex: 1, maxWidth: 620, gap: 18 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 22 }}>{cur.label}</Text>
              <Text style={{ color: C.mute, fontSize: 14 }}>{cur.sub}</Text>
            </View>
            {body}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
