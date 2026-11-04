import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sb } from '../lib/supabase';
import { demoSession, setDemo } from '../lib/demo';
import { Btn, C, Icon, Input, T, alpha, s, shadow } from '../lib/ui';

/* Σύνδεση με email + κωδικό (χωρίς email επιβεβαίωσης για τις δοκιμές).
   Στην κυκλοφορία μπορεί να γίνει κωδικός μίας χρήσης με email/SMS. */
export default function Login() {
  const top = useSafeAreaInsets().top;
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return setErr('Το email δεν φαίνεται σωστό');
    if (pass.length < 6) return setErr('Ο κωδικός θέλει τουλάχιστον 6 χαρακτήρες');
    setBusy(true); setErr('');
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email: e, password: pass })
      : await sb.auth.signUp({ email: e, password: pass });
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      setErr(m.includes('invalid login') ? 'Λάθος email ή κωδικός'
        : m.includes('already registered') ? 'Υπάρχει ήδη λογαριασμός με αυτό το email — κάνε σύνδεση'
        : m.includes('not confirmed') ? 'Το email δεν έχει επιβεβαιωθεί'
        : 'Κάτι πήγε στραβά, δοκίμασε ξανά');
      return;
    }
    if (mode === 'up' && !data.session) setErr('Έλεγξε το email σου για επιβεβαίωση και μετά κάνε σύνδεση');
  };

  const demo = async () => {
    setBusy(true); setDemo(true);
    const ds = demoSession();
    const { error } = await sb.auth.setSession({ access_token: ds.access_token, refresh_token: ds.refresh_token });
    setBusy(false);
    if (error) { setDemo(false); setErr('Δεν άνοιξε το demo'); }
  };

  const Tab = ({ m, label }: { m: 'in' | 'up'; label: string }) => (
    <Pressable onPress={() => { setMode(m); setErr(''); }}
      style={[{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' }, mode === m && [{ backgroundColor: C.card }, shadow(1)]]}>
      <Text style={{ color: mode === m ? C.text : C.mute, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Κορυφή με το σήμα της εφαρμογής */}
        <View style={{ backgroundColor: alpha(C.accent, 0.09), paddingTop: top + 40, paddingBottom: 34, paddingHorizontal: 24,
          borderBottomLeftRadius: 36, borderBottomRightRadius: 36, gap: 18 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
            boxShadow: `0px 10px 24px ${alpha(C.accent, 0.35)}` }}>
            <Icon name="calendar" size={32} color={C.onAccent} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 40, fontWeight: '900', letterSpacing: -1.5, color: C.text }}>
              Spot<Text style={{ color: C.accent }}>On</Text>
            </Text>
            <T mute style={{ fontSize: 16, lineHeight: 23 }}>Γυμναστήρια, κομμωτήρια, νυχάδικα, personal και ό,τι θέλει ραντεβού — σε όλη την Ελλάδα.</T>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {['💇', '🏋️', '💅', '💈', '🧘'].map((e, i) => (
              <View key={e} style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
                marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: alpha(C.accent, 0.09) }, shadow(1)]}>
                <Text style={{ fontSize: 18 }}>{e}</Text>
              </View>
            ))}
            <View style={{ justifyContent: 'center', marginLeft: 10 }}><T mute style={{ fontSize: 13, fontWeight: '600' }}>+ πολλά ακόμα</T></View>
          </View>
        </View>

        <View style={[s.pad, { gap: 14, paddingTop: 26 }]}>
          <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4 }}>
            <Tab m="in" label="Σύνδεση" /><Tab m="up" label="Νέος λογαριασμός" />
          </View>
          <Input label="Email" placeholder="esy@example.gr" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Κωδικός" placeholder="Τουλάχιστον 6 χαρακτήρες" secureTextEntry value={pass} onChangeText={setPass} onSubmitEditing={go} />
          {!!err && (
            <View style={{ backgroundColor: alpha(C.bad, 0.08), borderRadius: 12, padding: 12 }}>
              <Text style={{ color: C.bad, fontWeight: '600' }}>{err}</Text>
            </View>
          )}
          <Btn title={busy ? 'Μια στιγμή…' : mode === 'in' ? 'Σύνδεση' : 'Δημιουργία λογαριασμού'} onPress={go} disabled={busy} style={{ marginTop: 4 }} />

          <View style={[s.row, { marginVertical: 6 }]}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            <T mute style={{ fontSize: 13 }}>ή</T>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          </View>
          <Btn kind="tint" title="👀  Δες το demo χωρίς λογαριασμό" disabled={busy} onPress={demo} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
