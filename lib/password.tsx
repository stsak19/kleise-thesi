import { Pressable, View } from 'react-native';
import { Text } from './Txt';
import { C, Icon, Input, alpha } from './ui';

/* Ισχυρός κωδικός, όπως στα περισσότερα site: κανόνες που τσεκάρονται όσο γράφεις, μπάρα δύναμης,
   επιβεβαίωση κωδικού και «μάτι» για εμφάνιση. Οι κανόνες ταιριάζουν με τη ρύθμιση της Supabase
   (Authentication → Sign In / Providers → Email: Minimum password length 8 και
   «Lowercase, uppercase letters, digits and symbols»). */

export { PASS_MIN, RULES, passOk, passProblem, strength } from './passRules';
import { RULES, strength } from './passRules';

const LEVELS = ['', 'Αδύναμος', 'Μέτριος', 'Καλός', 'Πολύ ισχυρός'];

/* Πεδίο κωδικού με «μάτι». */
export function PassInput({ show, onShow, label, ...p }: React.ComponentProps<typeof Input> & { show: boolean; onShow: (v: boolean) => void }) {
  return (
    <View>
      <Input label={label} icon="lock" autoCapitalize="none" autoCorrect={false} secureTextEntry={!show} {...p} style={[{ paddingRight: 34 }, p.style as any]} />
      <Pressable onPress={() => onShow(!show)} hitSlop={10} accessibilityLabel={show ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
        style={{ position: 'absolute', right: 14, bottom: 15, opacity: show ? 1 : 0.55 }}>
        <Icon name="eye" size={20} color={show ? C.tint : C.mute} />
      </Pressable>
    </View>
  );
}

/* Μπάρα δύναμης + λίστα κανόνων με ✓ καθώς γράφεις. */
export function PassRules({ value, again }: { value: string; again?: string }) {
  const sc = strength(value);
  const col = sc <= 1 ? C.bad : sc === 2 ? C.warn : C.ok;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: value && i <= sc ? col : alpha(C.text, 0.1) }} />
          ))}
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: value ? col : C.mute }}>
          {value ? `Δύναμη κωδικού: ${LEVELS[sc]}` : 'Φτιάξε έναν ισχυρό κωδικό'}
        </Text>
      </View>
      <View style={{ gap: 5 }}>
        {RULES.map((r) => <Rule key={r.label} ok={r.ok(value)} label={r.label} />)}
        {again !== undefined && !!again && <Rule ok={again === value} label={again === value ? 'Οι κωδικοί είναι ίδιοι' : 'Οι κωδικοί δεν είναι ίδιοι'} bad={again !== value} />}
      </View>
    </View>
  );
}

function Rule({ ok, label, bad }: { ok: boolean; label: string; bad?: boolean }) {
  const c = ok ? C.ok : bad ? C.bad : C.mute;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
        backgroundColor: ok ? C.ok : 'transparent', borderWidth: ok ? 0 : 1.5, borderColor: alpha(c, 0.6) }}>
        {ok ? <Icon name="check" size={10} color={C.bg} /> : bad ? <Icon name="close" size={8} color={C.bad} /> : null}
      </View>
      <Text style={{ fontSize: 13, color: ok ? C.text : c, fontWeight: ok ? '600' : '500' }}>{label}</Text>
    </View>
  );
}
