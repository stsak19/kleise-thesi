import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, s } from '../ui';
import { useLogin } from './useLogin';
import { Fields, LinkText, Logo, ModeSwitch, Notice, Terms } from './parts';

/* Εκδοχή Α — «Καθαρή»: ίδια κορυφή με την αρχική (λογότυπο αριστερά), μεγάλος τίτλος,
   πεδία με εικονίδια, και η «Συνέχεια χωρίς λογαριασμό» ως απλό σύνδεσμο στο κάτω μέρος. */
export default function LoginA() {
  const L = useLogin();
  const { top, bottom } = useSafeAreaInsets();
  const up = L.mode === 'up';
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: bottom + 24 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ height: 44, justifyContent: 'center' }}><Logo /></View>

        <View style={{ marginTop: 34, gap: 6 }}>
          <Text style={[s.title, { fontSize: 32 }]}>{up ? 'Φτιάξε λογαριασμό' : 'Καλώς ήρθες πίσω'}</Text>
          <Text style={{ color: C.mute, fontSize: 16, lineHeight: 23 }}>
            {up ? 'Ένα λεπτό είναι. Μετά κλείνεις θέση όπου θες, όποτε θες.' : 'Συνδέσου για να δεις τις κρατήσεις σου και να κλείσεις νέα θέση.'}
          </Text>
        </View>

        <View style={{ marginTop: 26, gap: 16 }}>
          <ModeSwitch L={L} />
          <Fields L={L} />
          {!up && <LinkText title="Ξέχασες τον κωδικό;" onPress={L.forgot} align="flex-end" />}
          <Notice L={L} />
          <Btn title={L.busy ? 'Μια στιγμή…' : up ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'} onPress={L.go} disabled={L.busy} style={{ marginTop: 2 }} />
          {up && <Terms />}
        </View>

        <View style={{ flex: 1, minHeight: 28 }} />
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ color: C.mute, fontSize: 14 }}>Θες πρώτα να ρίξεις μια ματιά;</Text>
          <LinkText title="Συνέχεια χωρίς λογαριασμό" onPress={L.guest} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
