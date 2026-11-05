import { useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../Txt';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, Icon, s, shadow } from '../ui';
import { useLogin } from './useLogin';
import { Fields, LinkText, Notice, Terms } from './parts';
import { rise, useReduceMotion, useStagger } from './motion';
import Reel from './welcome/Reel';

/* Οθόνη σύνδεσης: πρώτα το κινούμενο καλωσόρισμα («Ταινία», lib/login/welcome/Reel.tsx)
   με δύο καθαρές επιλογές, και μετά η φόρμα σε δική της οθόνη με βελάκι «πίσω». */
export default function LoginScreen({ start }: { start?: 'welcome' | 'in' | 'up' }) {
  const L = useLogin(start === 'up' ? 'up' : 'in');
  const [step, setStep] = useState<'welcome' | 'form'>(start && start !== 'welcome' ? 'form' : 'welcome');
  const reduce = useReduceMotion();

  if (step === 'welcome') return (
    <Reel reduce={reduce} onGuest={L.guest}
      onUp={() => { L.setMode('up'); setStep('form'); }} onIn={() => { L.setMode('in'); setStep('form'); }} />
  );
  return <Form L={L} onBack={() => setStep('welcome')} animate={!reduce} />;
}

/* Η φόρμα. Τα κομμάτια της μπαίνουν ένα-ένα από κάτω. */
function Form({ L, onBack, animate }: { L: ReturnType<typeof useLogin>; onBack: () => void; animate: boolean }) {
  const { top, bottom } = useSafeAreaInsets();
  const up = L.mode === 'up';
  const st = useStagger(5, { delay: 40, step: 70, ms: 480 });
  const a = (i: number, dy = 18) => (animate ? rise(st[i], dy) : undefined);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: bottom + 24 }}
        keyboardShouldPersistTaps="handled">
        <Animated.View style={a(0, 0)}><Pressable onPress={onBack} accessibilityLabel="Πίσω" hitSlop={6}
          style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.75 : 1 }]}>
          <Icon name="back" size={20} color={C.text} />
        </Pressable></Animated.View>

        <Animated.View style={[{ marginTop: 26, gap: 6 }, a(1)]}>
          <Text style={[s.title, { fontSize: 32 }]}>{up ? 'Νέος λογαριασμός' : 'Σύνδεση'}</Text>
          <Text style={{ color: C.mute, fontSize: 16, lineHeight: 23 }}>
            {up ? 'Λίγα στοιχεία και ξεκινάς.' : 'Χαιρόμαστε που σε ξαναβλέπουμε.'}
          </Text>
        </Animated.View>

        <Animated.View style={[{ marginTop: 26, gap: 16, padding: 16, borderRadius: 22, backgroundColor: C.bg }, shadow(2), a(2, 30)]}>
          <Fields L={L} />
          {!up && <LinkText title="Ξέχασες τον κωδικό;" onPress={L.forgot} align="flex-end" />}
          <Notice L={L} />
          <Btn title={L.busy ? 'Μια στιγμή…' : up ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'} onPress={L.go} disabled={L.busy} />
        </Animated.View>
        {up && <Animated.View style={[{ marginTop: 14 }, a(3)]}><Terms /></Animated.View>}

        <View style={{ flex: 1, minHeight: 24 }} />
        <Animated.View style={[s.row, { justifyContent: 'center', gap: 6 }, a(4)]}>
          <Text style={{ color: C.mute, fontSize: 15 }}>{up ? 'Έχεις ήδη λογαριασμό;' : 'Δεν έχεις λογαριασμό;'}</Text>
          <LinkText title={up ? 'Σύνδεση' : 'Φτιάξε έναν'} onPress={() => L.setMode(up ? 'in' : 'up')} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
