import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { C } from '../theme';
import { getLang, setLang, useLang, type Lang } from './index';

/* Επιλογή γλώσσας. Οι ονομασίες γράφονται πάντα στη δική τους γλώσσα, για να τις βρίσκει όποιος δεν διαβάζει την άλλη. */
const LANGS: { key: Lang; label: string; short: string }[] = [
  { key: 'el', label: 'Ελληνικά', short: 'ΕΛ' },
  { key: 'en', label: 'English', short: 'EN' },
];

/* Δύο κουμπιά δίπλα-δίπλα (Ρυθμίσεις → Γλώσσα). */
export function LangPicker() {
  const now = useLang();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
      {LANGS.map((l) => {
        const on = l.key === now;
        return (
          <Pressable key={l.key} onPress={() => setLang(l.key)} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ pressed }) => ({ flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
              borderColor: on ? C.text : C.line, backgroundColor: C.card, opacity: pressed ? 0.8 : 1 })}>
            {/* σκέτο RN κείμενο μέσω Txt· οι ονομασίες είναι ίδιες και στο λεξικό, άρα δεν αλλάζουν */}
            <Text style={{ color: C.text, fontWeight: on ? '800' : '600', fontSize: 15 }}>{l.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* Μικρό κουμπί «EN» / «ΕΛ» για επισκέπτες (αρχική, πάνω μπάρα): αλλάζει στην άλλη γλώσσα. */
export function LangPill({ size = 34 }: { size?: number }) {
  useLang();
  const other = LANGS.find((l) => l.key !== getLang())!;
  return (
    <Pressable onPress={() => setLang(other.key)} hitSlop={6} accessibilityRole="button" accessibilityLabel={other.label}
      style={({ pressed, hovered }: any) => ({ height: size, minWidth: size, paddingHorizontal: 10, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed || hovered ? C.soft : C.card, borderWidth: 1, borderColor: C.line })}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>{other.short}</Text>
    </Pressable>
  );
}
