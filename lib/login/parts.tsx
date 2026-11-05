import { Pressable, Text, View } from 'react-native';
import { C, Icon, Input, alpha, shadow } from '../ui';
import type { LoginState, Mode } from './useLogin';

/* Κοινά κομμάτια των οθονών σύνδεσης. */

export const Logo = ({ size = 26, color = C.text, accent = C.accent }: { size?: number; color?: string; accent?: string }) => (
  <Text style={{ fontSize: size, fontWeight: '900', letterSpacing: -size * 0.03, color }}>
    Spot<Text style={{ color: accent }}>On</Text>
  </Text>
);

/* Διακόπτης «Σύνδεση / Νέος λογαριασμός». */
export function ModeSwitch({ L }: { L: LoginState }) {
  const Tab = ({ m, label }: { m: Mode; label: string }) => (
    <Pressable onPress={() => L.setMode(m)}
      style={[{ flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' }, L.mode === m && [{ backgroundColor: C.bg }, shadow(1)]]}>
      <Text style={{ color: L.mode === m ? C.text : C.mute, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4 }}>
      <Tab m="in" label="Σύνδεση" /><Tab m="up" label="Νέος λογαριασμός" />
    </View>
  );
}

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
      <View>
        <Input label={labels ? 'Κωδικός' : undefined} icon="lock" placeholder={L.mode === 'up' ? 'Τουλάχιστον 6 χαρακτήρες' : 'Ο κωδικός σου'}
          secureTextEntry={!L.show} value={L.pass} onChangeText={L.setPass} onSubmitEditing={L.go} style={{ paddingRight: 34 }} />
        <Pressable onPress={() => L.setShow(!L.show)} hitSlop={10} accessibilityLabel={L.show ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
          style={{ position: 'absolute', right: 14, bottom: 15, opacity: L.show ? 1 : 0.55 }}>
          <Icon name="eye" size={20} color={L.show ? C.accent : C.mute} />
        </Pressable>
      </View>
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

export const LinkText = ({ title, onPress, color = C.accent, align = 'center' }:
  { title: string; onPress: () => void; color?: string; align?: 'center' | 'flex-end' | 'flex-start' }) => (
  <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ alignSelf: align, opacity: pressed ? 0.6 : 1 })}>
    <Text style={{ color, fontWeight: '700', fontSize: 15 }}>{title}</Text>
  </Pressable>
);

export const Terms = () => (
  <Text style={{ color: C.mute, fontSize: 12.5, lineHeight: 18, textAlign: 'center' }}>
    Με τη δημιουργία λογαριασμού αποδέχεσαι τους <Text style={{ color: C.text, fontWeight: '700' }}>Όρους χρήσης</Text> και
    την <Text style={{ color: C.text, fontWeight: '700' }}>Πολιτική απορρήτου</Text>.
  </Text>
);
