import { Alert, Platform } from 'react-native';

type Btn = { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' };

/* Alert που δουλεύει και στον browser (εκεί το Alert του React Native δεν κάνει τίποτα).
   Στο web: ένα κουμπί → window.alert, δύο κουμπιά → window.confirm (OK = πρώτη επιλογή
   που δεν είναι «Όχι»/cancel, Άκυρο = η άλλη). */
export function say(title: string, msg?: string, buttons?: Btn[]) {
  if (Platform.OS !== 'web') return Alert.alert(title, msg, buttons);
  const text = msg ? `${title}\n\n${msg}` : title;
  if (!buttons || buttons.length <= 1) { window.alert(text); buttons?.[0]?.onPress?.(); return; }
  const cancel = buttons.find((b) => b.style === 'cancel' || b.text === 'Όχι');
  const yes = buttons.find((b) => b !== cancel) ?? buttons[0];
  const no = buttons.find((b) => b !== yes);
  const label = `${text}\n\nOK = ${yes.text}${no ? `\nΆκυρο = ${no.text}` : ''}`;
  if (window.confirm(label)) yes.onPress?.(); else no?.onPress?.();
}

/* Ερώτηση με απάντηση κειμένου (το Alert.prompt υπάρχει μόνο στο iOS). */
export function promptText(title: string, msg: string, done: (v: string) => void) {
  if (Platform.OS === 'web') { const v = window.prompt(`${title}\n\n${msg}`); if (v != null) done(v); return; }
  if (Platform.OS === 'ios') return Alert.prompt(title, msg, done);
  Alert.alert(title, 'Στο Android η ανανέωση γίνεται προς το παρόν από iPhone ή από τον browser.');
}
