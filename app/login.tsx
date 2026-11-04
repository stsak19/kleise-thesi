import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { sb } from '../lib/supabase';
import { demoSession, setDemo } from '../lib/demo';
import { Btn, C, H, Input, s, T } from '../lib/ui';

/* Σύνδεση με email + κωδικό (χωρίς email επιβεβαίωσης για τις δοκιμές).
   Στην κυκλοφορία μπορεί να γίνει κωδικός μίας χρήσης με email/SMS. */
export default function Login() {
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.screen, { justifyContent: 'center' }]}>
      <View style={s.pad}>
        <Text style={{ fontSize: 40 }}>📅</Text>
        <H>SpotOn</H>
        <T mute>Γυμναστήρια, κομμωτήρια, νυχάδικα, personal και ό,τι θέλει ραντεβού — σε όλη την Ελλάδα.</T>
        <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input placeholder="Κωδικός" secureTextEntry value={pass} onChangeText={setPass} />
        {!!err && <Text style={{ color: C.bad }}>{err}</Text>}
        <Btn title={mode === 'in' ? 'Σύνδεση' : 'Δημιουργία λογαριασμού'} onPress={go} disabled={busy} />
        <Btn kind="ghost" title={mode === 'in' ? 'Νέος χρήστης; Φτιάξε λογαριασμό' : 'Έχω ήδη λογαριασμό'}
          onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); }} />
        <Btn kind="ghost" title="👀 Δες το demo (χωρίς λογαριασμό)" disabled={busy} onPress={async () => {
          setBusy(true); setDemo(true);
          const s = demoSession();
          const { error } = await sb.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
          setBusy(false);
          if (error) { setDemo(false); setErr('Δεν άνοιξε το demo'); }
        }} />
      </View>
    </KeyboardAvoidingView>
  );
}
