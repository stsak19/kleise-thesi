import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, CATEGORIES, Icon, alpha, s, shadow } from '../ui';
import { useLogin } from './useLogin';
import { Fields, LinkText, Logo, Notice, Terms } from './parts';

/* Πλέγμα με τις κατηγορίες της εφαρμογής (σαν τη σκηνή «ψάχνεις» της ξενάγησης). */
function CategoryGrid() {
  const cats = CATEGORIES.filter((c) => !['other', 'physio', 'medical', 'tattoo'].includes(c.key));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 300, alignSelf: 'center' }}>
      {cats.map((c, i) => (
        <View key={c.key} style={[{ width: 88, height: 74, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4,
          backgroundColor: i === 4 ? C.accent : C.soft }, i === 4 && { boxShadow: `0px 10px 24px ${alpha(C.accent, 0.35)}` }]}>
          <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: i === 4 ? '#ffffff' : C.mute }} numberOfLines={1}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* Οθόνη σύνδεσης: πρώτα μια οθόνη καλωσορίσματος με δύο καθαρές επιλογές,
   και μετά η φόρμα σε δική της οθόνη με βελάκι «πίσω». */
export default function LoginScreen({ start }: { start?: 'welcome' | 'in' | 'up' }) {
  const L = useLogin(start === 'up' ? 'up' : 'in');
  const [step, setStep] = useState<'welcome' | 'form'>(start && start !== 'welcome' ? 'form' : 'welcome');
  const { top, bottom } = useSafeAreaInsets();
  const up = L.mode === 'up';

  if (step === 'welcome') return (
    <View style={[s.screen, { paddingTop: top + 18, paddingBottom: bottom + 24, paddingHorizontal: 20 }]}>
      <View style={{ alignItems: 'center' }}><Logo size={30} /></View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 30 }}>
        <CategoryGrid />
        <View style={{ gap: 8 }}>
          <Text style={[s.title, { textAlign: 'center', fontSize: 30 }]}>Όλα τα ραντεβού σου,{'\n'}σε ένα μέρος</Text>
          <Text style={{ color: C.mute, fontSize: 16, lineHeight: 23, textAlign: 'center' }}>
            Βρες κατάστημα, διάλεξε ώρα, κλείσε θέση.
          </Text>
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Btn title="Δημιουργία λογαριασμού" onPress={() => { L.setMode('up'); setStep('form'); }} />
        <Btn kind="ghost" title="Έχω ήδη λογαριασμό" onPress={() => { L.setMode('in'); setStep('form'); }} />
        <View style={{ height: 6 }} />
        <LinkText title="Συνέχεια χωρίς λογαριασμό" onPress={L.guest} color={C.mute} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: bottom + 24 }}
        keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setStep('welcome')} accessibilityLabel="Πίσω" hitSlop={6}
          style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.75 : 1 }]}>
          <Icon name="back" size={20} color={C.text} />
        </Pressable>

        <View style={{ marginTop: 26, gap: 6 }}>
          <Text style={[s.title, { fontSize: 32 }]}>{up ? 'Νέος λογαριασμός' : 'Σύνδεση'}</Text>
          <Text style={{ color: C.mute, fontSize: 16, lineHeight: 23 }}>
            {up ? 'Λίγα στοιχεία και ξεκινάς.' : 'Χαιρόμαστε που σε ξαναβλέπουμε.'}
          </Text>
        </View>

        <View style={[{ marginTop: 26, gap: 16, padding: 16, borderRadius: 22, backgroundColor: C.bg }, shadow(2)]}>
          <Fields L={L} />
          {!up && <LinkText title="Ξέχασες τον κωδικό;" onPress={L.forgot} align="flex-end" />}
          <Notice L={L} />
          <Btn title={L.busy ? 'Μια στιγμή…' : up ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'} onPress={L.go} disabled={L.busy} />
        </View>
        {up && <View style={{ marginTop: 14 }}><Terms /></View>}

        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={[s.row, { justifyContent: 'center', gap: 6 }]}>
          <Text style={{ color: C.mute, fontSize: 15 }}>{up ? 'Έχεις ήδη λογαριασμό;' : 'Δεν έχεις λογαριασμό;'}</Text>
          <LinkText title={up ? 'Σύνδεση' : 'Φτιάξε έναν'} onPress={() => L.setMode(up ? 'in' : 'up')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
