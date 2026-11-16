import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { getMode as appMode } from '../mode';
import { say } from '../alert';
import { replayIntro } from '../Intro';
import { setPref, usePrefs } from '../prefs';
import { sb } from '../supabase';
import { DARK, LIGHT, type Mode, type Theme, getMode, setMode } from '../theme';
import { Btn, C, Chip, Group, Icon, Input, Row, Section, SwitchRow, alpha, shadow } from '../ui';
import { signOut } from './data';

/* Μικρογραφία οθόνης στα χρώματα μιας παλέτας (για την επιλογή εμφάνισης). */
function Mini({ P }: { P: Theme }) {
  return (
    <View style={{ flex: 1, backgroundColor: P.bg, padding: 7, gap: 5 }}>
      <View style={{ width: '60%', height: 6, borderRadius: 3, backgroundColor: P.text }} />
      <View style={{ backgroundColor: P.card, borderRadius: 6, padding: 5, gap: 4 }}>
        <View style={{ width: '80%', height: 4, borderRadius: 2, backgroundColor: P.mute }} />
        <View style={{ width: '50%', height: 4, borderRadius: 2, backgroundColor: P.mute, opacity: 0.6 }} />
      </View>
      <View style={{ height: 10, borderRadius: 4, backgroundColor: P.btn }} />
    </View>
  );
}

const MODES: { key: Mode; label: string; P: Theme[] }[] = [
  { key: 'light', label: 'Ανοιχτή', P: [LIGHT] },
  { key: 'dark', label: 'Σκούρα', P: [DARK] },
  { key: 'auto', label: 'Αυτόματα', P: [LIGHT, DARK] },
];

/* Επιλογή εμφάνισης: τρεις κάρτες με μικρογραφία. */
export function AppearancePicker() {
  const [m, setM] = useState<Mode>(getMode());
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {MODES.map((o) => {
        const on = o.key === m;
        return (
          <Pressable key={o.key} onPress={() => { setM(o.key); setMode(o.key); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ pressed }) => [{ flex: 1, gap: 8, alignItems: 'center', opacity: pressed ? 0.85 : 1 }]}>
            <View style={[{ width: '100%', height: 92, borderRadius: 14, overflow: 'hidden', flexDirection: 'row', borderWidth: 2,
              borderColor: on ? C.accent : alpha(C.text, 0.1) }, on && { boxShadow: `0px 0px 0px 4px ${alpha(C.accent, 0.15)}` }]}>
              {o.P.map((P, i) => <Mini key={i} P={P} />)}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? C.tint : C.mute, alignItems: 'center', justifyContent: 'center' }}>
                {on && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.tint }} />}
              </View>
              <Text style={{ color: C.text, fontWeight: on ? '800' : '600', fontSize: 14 }}>{o.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
export const modeLabel = () => MODES.find((o) => o.key === getMode())?.label ?? '';

/* Φόρμα νέου κωδικού (κοινή για το κινητό και το προφίλ στον υπολογιστή). */
export function PasswordForm({ onDone }: { onDone?: () => void }) {
  const [a, setA] = useState(''); const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (a.length < 6) return say('Ο κωδικός θέλει τουλάχιστον 6 χαρακτήρες');
    if (a !== b) return say('Οι δύο κωδικοί δεν είναι ίδιοι');
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: a });
    setBusy(false);
    if (error) return say('Δεν άλλαξε ο κωδικός', error.message);
    setA(''); setB(''); onDone?.(); say('Ο κωδικός άλλαξε');
  };
  return (
    <View style={{ gap: 10 }}>
      <Input icon="lock" placeholder="Νέος κωδικός" secureTextEntry autoCapitalize="none" value={a} onChangeText={setA} />
      <Input icon="lock" placeholder="Ξανά ο νέος κωδικός" secureTextEntry autoCapitalize="none" value={b} onChangeText={setB} />
      <Btn size="sm" title={busy ? 'Μια στιγμή…' : 'Αλλαγή κωδικού'} onPress={go} disabled={busy || !a} />
    </View>
  );
}

/* Αλλαγή κωδικού: ανοίγει μέσα στη λίστα. */
function Password({ last }: { last?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row icon="lock" title="Αλλαγή κωδικού" onPress={() => setOpen(!open)} last={last && !open}
        right={<Icon name="chevron" size={16} color={C.mute} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />} />
      {open && (
        <View style={[{ padding: 14, paddingTop: 4 }, !last && { borderBottomWidth: 1, borderBottomColor: C.line }]}>
          <PasswordForm onDone={() => setOpen(false)} />
        </View>
      )}
    </>
  );
}

const REMIND = [{ m: 60, label: '1 ώρα πριν' }, { m: 180, label: '3 ώρες πριν' }, { m: 1440, label: 'Μία μέρα πριν' }];

/* Ειδοποιήσεις στο κινητό: ποιες θέλει ο πελάτης (και η επιχείρηση, όταν είναι σε λειτουργία επιχείρησης). */
export function NotifyPrefs({ bare }: { bare?: boolean } = {}) {
  const p = usePrefs();
  const biz = appMode() === 'biz';
  return (
    <>
      {!bare && <Section title="Ειδοποιήσεις" sub="Έρχονται στο κινητό, ακόμα κι όταν η εφαρμογή είναι κλειστή." />}
      {biz && (
        <Group>
          <SwitchRow label="Νέες κρατήσεις και ακυρώσεις" sub="Και αιτήματα πακέτων, νέοι πελάτες για έγκριση" value={p.nBizBookings} onChange={(v) => setPref('nBizBookings', v)} />
          <SwitchRow label="Η μέρα σου, κάθε πρωί" sub="Στις 8:00: πόσα ραντεβού έχεις και ποιο είναι το πρώτο" value={p.nBizDaily} onChange={(v) => setPref('nBizDaily', v)} last />
        </Group>
      )}
      <Group>
        <SwitchRow label="Υπενθύμιση ραντεβού" sub="Πριν από κάθε κράτηση" value={p.nRemind} onChange={(v) => setPref('nRemind', v)} last={!p.nRemind} />
        {p.nRemind && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line }}>
            {REMIND.map((o) => <Chip key={o.m} label={o.label} on={p.nRemindMin === o.m} onPress={() => setPref('nRemindMin', o.m)} />)}
          </View>
        )}
        <SwitchRow label="Θέση από αναμονή" sub="Όταν σου κλείνεται θέση αυτόματα" value={p.nWaitlist} onChange={(v) => setPref('nWaitlist', v)} />
        <SwitchRow label="Αλλαγές από το κατάστημα" sub="Ακύρωση, αλλαγή ώρας, έγκριση" value={p.nChanges} onChange={(v) => setPref('nChanges', v)} />
        <SwitchRow label="Πακέτα" sub="Ενεργοποίηση, λίγες επισκέψεις, λήξη" value={p.nPacks} onChange={(v) => setPref('nPacks', v)} />
        <SwitchRow label="Μηνύματα καταστημάτων" sub="Ανακοινώσεις και προσφορές" value={p.nPromos} onChange={(v) => setPref('nPromos', v)} last />
      </Group>
    </>
  );
}

/* Όλες οι ρυθμίσεις της εφαρμογής. Η εμφάνιση εφαρμόζεται αμέσως σε όλη την εφαρμογή. */
export function SettingsBody({ onEdit }: { onEdit?: () => void }) {
  const prefs = usePrefs();
  return (
    <>
      <Section title="Εμφάνιση" sub="Η «Αυτόματα» ακολουθεί τη ρύθμιση του κινητού." />
      <View style={[{ backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.line }, shadow(1)]}>
        <AppearancePicker />
      </View>
      <Group>
        <SwitchRow label="Λιγότερη κίνηση" sub="Σταματά τα κινούμενα εφέ στις οθόνες" value={prefs.reduceMotion} onChange={(v) => setPref('reduceMotion', v)} last />
      </Group>

      <NotifyPrefs />

      <Section title="Λογαριασμός" />
      <Group>
        {onEdit && <Row icon="user" title="Τα στοιχεία μου" sub="Όνομα, επώνυμο, κινητό" onPress={onEdit} />}
        <Password />
        <Row icon="eye" title="Πολιτική απορρήτου" onPress={() => router.push('/privacy')} />
        <Row icon="close" title="Διαγραφή λογαριασμού" danger onPress={() => router.push('/delete-account')} last />
      </Group>

      <Section title="Βοήθεια" />
      <Group>
        <Row icon="eye" title="Δες ξανά την ξενάγηση" sub="Τα 4 βήματα της πρώτης φοράς" onPress={replayIntro} />
        <Row icon="gear" title="Έκδοση εφαρμογής" right={<Text style={{ color: C.mute, fontSize: 14 }}>{Constants.expoConfig?.version ?? '—'}</Text>} last />
      </Group>

      <View style={{ marginTop: 10 }}>
        <Group><Row title="Αποσύνδεση" danger last onPress={signOut} right={<View />} /></Group>
      </View>
    </>
  );
}
