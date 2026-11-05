import { useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, C, CATEGORIES, Icon, alpha, s, shadow } from '../ui';
import { useLogin } from './useLogin';
import { Fields, LinkText, Logo, Notice, Terms } from './parts';
import { rise, useReduceMotion, useStagger } from './motion';
import type { WelcomeProps } from './welcome/common';
import Wave from './welcome/Wave';
import Pick from './welcome/Pick';
import Reel from './welcome/Reel';
import Shuffle from './welcome/Shuffle';

/* Οι κινούμενες εκδοχές του καλωσορίσματος (ΠΡΟΣΩΡΙΝΑ: /login?v=1…4 μέχρι να διαλεχτεί μία). */
export const VARIANTS: { name: string; C: (p: WelcomeProps) => React.ReactNode }[] = [
  { name: 'Κύμα', C: Wave },
  { name: 'Επιλογή', C: Pick },
  { name: 'Ταινία', C: Reel },
  { name: 'Ανακάτεμα', C: Shuffle },
];


/* Οθόνη σύνδεσης: πρώτα μια οθόνη καλωσορίσματος με δύο καθαρές επιλογές,
   και μετά η φόρμα σε δική της οθόνη με βελάκι «πίσω». */
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

/* Μικρή μπάρα για εναλλαγή εκδοχών (μόνο όσο διαλέγουμε). */
function Picker({ v, setV }: { v: number; setV: (n: number) => void }) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: top + 66, alignItems: 'center' }} pointerEvents="box-none">
      <View style={[{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: C.bg }, shadow(2)]}>
        {[0, ...VARIANTS.map((_, i) => i + 1)].map((n) => (
          <Pressable key={n} onPress={() => setV(n)} style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center',
            backgroundColor: n === v ? C.accent : 'transparent' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: n === v ? C.onAccent : C.mute }}>{n === 0 ? 'Τωρινή' : `${n} ${VARIANTS[n - 1].name}`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function LoginScreen({ start, variant }: { start?: 'welcome' | 'in' | 'up'; variant?: number }) {
  const L = useLogin(start === 'up' ? 'up' : 'in');
  const [step, setStep] = useState<'welcome' | 'form'>(start && start !== 'welcome' ? 'form' : 'welcome');
  const { top, bottom } = useSafeAreaInsets();
  const up = L.mode === 'up';
  const reduce = useReduceMotion();
  const [v, setV] = useState(variant ?? 0);

  if (step === 'welcome') {
    const W = VARIANTS[v - 1]?.C;
    const props: WelcomeProps = { reduce, onGuest: L.guest,
      onUp: () => { L.setMode('up'); setStep('form'); }, onIn: () => { L.setMode('in'); setStep('form'); } };
    return (
      <View style={s.screen}>
        {W ? <W key={v} {...props} /> : <Static {...props} />}
        {variant != null && <Picker v={v} setV={setV} />}
      </View>
    );
  }
  return <Form L={L} onBack={() => setStep('welcome')} animate={v > 0 && !reduce} />;
}

/* Το τωρινό, ακίνητο καλωσόρισμα. */
function Static(p: WelcomeProps) {
  const { top, bottom } = useSafeAreaInsets();
  return (
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
        <Btn title="Δημιουργία λογαριασμού" onPress={p.onUp} />
        <Btn kind="ghost" title="Έχω ήδη λογαριασμό" onPress={p.onIn} />
        <View style={{ height: 6 }} />
        <LinkText title="Συνέχεια χωρίς λογαριασμό" onPress={p.onGuest} color={C.mute} />
      </View>
    </View>
  );
}

/* Η φόρμα. Στις κινούμενες εκδοχές τα κομμάτια της μπαίνουν ένα-ένα από κάτω. */
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
