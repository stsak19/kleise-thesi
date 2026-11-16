import { router } from 'expo-router';
import { setLoginOpen } from '../guest';
import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { C, Icon, Input, alpha } from '../ui';
import { isLight } from '../theme';
import type { LoginState } from './useLogin';
import { PassInput, PassRules } from '../password';

/* Κοινά κομμάτια των οθονών σύνδεσης. */

export const Logo = ({ size = 26, color = C.text }: { size?: number; color?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -size * 0.04, color }}>Spot</Text>
    <View>
      <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -size * 0.04, color: C.mute }}>On</Text>
    </View>
  </View>
);

/* Τα πεδία: όνομα (μόνο στην εγγραφή), email, κωδικός με «εμφάνιση». */
export function Fields({ L, labels = true }: { L: LoginState; labels?: boolean }) {
  return (
    <View style={{ gap: 12 }}>
      {L.mode === 'up' && (
        <Input label={labels ? 'Όνομα' : undefined} icon="user" placeholder="π.χ. Μαρία Παπαδοπούλου" autoComplete="name"
          value={L.name} onChangeText={L.setName} />
      )}
      <Input label={labels ? 'Email' : undefined} icon="mail" placeholder="esy@email.gr" autoCapitalize="none" keyboardType="email-address"
        autoComplete="email" value={L.email} onChangeText={L.setEmail} />
      <PassInput label={labels ? 'Κωδικός' : undefined} placeholder={L.mode === 'up' ? 'Νέος κωδικός' : 'Ο κωδικός σου'}
        autoComplete={L.mode === 'up' ? 'new-password' : 'current-password'} show={L.show} onShow={L.setShow}
        value={L.pass} onChangeText={L.setPass} onSubmitEditing={L.mode === 'up' ? undefined : L.go} />
      {L.mode === 'up' && (
        <>
          <PassInput label={labels ? 'Επιβεβαίωση κωδικού' : undefined} placeholder="Ξανά ο κωδικός" autoComplete="new-password"
            show={L.show} onShow={L.setShow} value={L.pass2} onChangeText={L.setPass2} onSubmitEditing={L.go} />
          <PassRules value={L.pass} again={L.pass2} />
        </>
      )}
    </View>
  );
}

/* Μήνυμα λάθους ή πληροφορίας κάτω από τα πεδία. */
export function Notice({ L }: { L: LoginState }) {
  if (!L.err && !L.info) return null;
  const c = L.err ? C.bad : C.ok;
  return (
    <View style={{ backgroundColor: alpha(c, 0.08), borderRadius: 12, padding: 12 }}>
      <Text style={{ color: c, fontWeight: '600', lineHeight: 20 }}>{L.err || L.info}</Text>
    </View>
  );
}

export const LinkText = ({ title, onPress, color = C.tint, align = 'center' }:
  { title: string; onPress: () => void; color?: string; align?: 'center' | 'flex-end' | 'flex-start' }) => (
  <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ alignSelf: align, opacity: pressed ? 0.6 : 1 })}>
    <Text style={{ color, fontWeight: '700', fontSize: 15 }}>{title}</Text>
  </Pressable>
);

export const Terms = () => (
  <Text style={{ color: C.mute, fontSize: 12.5, lineHeight: 18, textAlign: 'center' }}>
    Με τη δημιουργία λογαριασμού αποδέχεσαι τους <Text style={{ color: C.text, fontWeight: '700' }}>Όρους χρήσης</Text> και
    την <Text style={{ color: C.text, fontWeight: '700', textDecorationLine: 'underline' }} onPress={() => { setLoginOpen(false); router.push('/privacy'); }}>Πολιτική απορρήτου</Text>.
  </Text>
);
