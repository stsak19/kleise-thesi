import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, alpha, s, shadow } from '../ui';
import { useLogin } from './useLogin';
import { Fields, LinkText, Logo, ModeSwitch, Notice, Terms } from './parts';

/* Μικρή «βιτρίνα» με κομμάτια της εφαρμογής: η κάρτα «Επόμενη κράτηση» και ώρες. */
function Showcase() {
  const slots = [{ h: '17:00', t: 'Γεμάτο', full: true }, { h: '18:00', t: 'Η θέση σου ✓', mine: true }, { h: '19:00', t: '3 ελεύθερες' }];
  return (
    <View style={{ gap: 10 }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.bg }, shadow(2)]}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Παρ</Text>
          <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '800', marginTop: -2 }}>6</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>Επόμενη κράτηση · 18:00</Text>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>Κομμωτήριο Ελένη</Text>
          <Text style={{ color: C.mute, fontSize: 13 }}>Κούρεμα · 30′</Text>
        </View>
        <Text style={{ fontSize: 24 }}>💇</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {slots.map((x) => (
          <View key={x.h} style={[{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', gap: 1,
            backgroundColor: x.mine ? C.ok : C.bg, opacity: x.full ? 0.6 : 1 }, !x.full && shadow(1)]}>
            <Text style={{ color: x.mine ? '#ffffff' : C.text, fontWeight: '800', fontSize: 16 }}>{x.h}</Text>
            <Text style={{ color: x.mine ? '#ffffff' : C.mute, fontSize: 11.5, fontWeight: '600' }}>{x.t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* Εκδοχή Β — «Βιτρίνα»: μπλε κορυφή με το λογότυπο και ένα δείγμα κράτησης,
   και από κάτω λευκό φύλλο με τη φόρμα. */
export default function LoginB() {
  const L = useLogin();
  const { top, bottom } = useSafeAreaInsets();
  const up = L.mode === 'up';
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.screen, { backgroundColor: C.accent }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: top + 18, paddingHorizontal: 20, paddingBottom: 46, gap: 18 }}>
          <Logo size={30} color="#ffffff" accent={alpha('#ffffff', 0.7)} />
          <Text style={{ color: '#ffffff', fontSize: 17, lineHeight: 24, fontWeight: '600' }}>
            Κλείσε θέση σε κομμωτήριο, γυμναστήριο ή ιατρείο, χωρίς τηλέφωνα.
          </Text>
          <Showcase />
        </View>

        <View style={{ flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -22,
          paddingHorizontal: 20, paddingTop: 22, paddingBottom: bottom + 24, gap: 16 }}>
          <ModeSwitch L={L} />
          <Fields L={L} labels={false} />
          {!up && <LinkText title="Ξέχασες τον κωδικό;" onPress={L.forgot} align="flex-end" />}
          <Notice L={L} />
          <Btn title={L.busy ? 'Μια στιγμή…' : up ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'} onPress={L.go} disabled={L.busy} />
          {up && <Terms />}
          <View style={[s.row, { marginVertical: 2 }]}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.soft }} />
            <Text style={{ color: C.mute, fontSize: 13 }}>ή</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.soft }} />
          </View>
          <Btn kind="ghost" title="Συνέχεια χωρίς λογαριασμό" onPress={L.guest} disabled={L.busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
