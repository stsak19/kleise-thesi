import AsyncStorage from '@react-native-async-storage/async-storage';

/* Τα χρώματα της εφαρμογής. Αλλάζουν live από τον επεξεργαστή χρωμάτων (🎨).
   Οι ημιδιάφανες αποχρώσεις (σκιές, φόντα επιλογής) βγαίνουν από αυτά με το alpha(). */
export const DEFAULT = {
  bg: '#ffffff', card: '#ffffff', soft: '#f4f4f7', line: '#ebebf0', text: '#15151b', mute: '#737380',
  accent: '#ff7a59', onAccent: '#ffffff',
  btn: '#ff7a59', btnText: '#ffffff', btn2: '#f4f4f7', btn2Text: '#15151b', btn2Line: '#f4f4f7',
  ok: '#1fa971', bad: '#e5484d',
};
export type Theme = typeof DEFAULT;
export const LABELS: Record<keyof Theme, string> = {
  bg: 'Φόντο', card: 'Κάρτες', soft: 'Πεδία / απαλό φόντο', line: 'Περιγράμματα', text: 'Κείμενο', mute: 'Δευτερεύον κείμενο',
  accent: 'Κύριο χρώμα', onAccent: 'Κείμενο πάνω στο κύριο',
  btn: 'Κύριο κουμπί', btnText: 'Κείμενο κύριου κουμπιού', btn2: 'Δευτερεύον κουμπί', btn2Text: 'Κείμενο δευτερεύοντος κουμπιού', btn2Line: 'Περίγραμμα δευτερεύοντος κουμπιού', ok: 'Επιτυχία', bad: 'Σφάλμα',
};
export const C: Theme = { ...DEFAULT };

// v2: νέα προεπιλεγμένα χρώματα· οι παλιές αποθηκευμένες επιλογές δεν τα σκεπάζουν.
const KEY = 'theme.v2';
const subs = new Set<() => void>();
export const onTheme = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const emit = () => subs.forEach((f) => f());

export function setColors(p: Partial<Theme>) {
  Object.assign(C, p); emit();
  AsyncStorage.setItem(KEY, JSON.stringify(C)).catch(() => {});
}
export const resetColors = () => setColors(DEFAULT);
export async function loadTheme() {
  try { const v = await AsyncStorage.getItem(KEY); if (v) { Object.assign(C, DEFAULT, JSON.parse(v)); emit(); } } catch {}
}
const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  if (h.length < 6) return [0, 0, 0];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
/* Ένα χρώμα με διαφάνεια, π.χ. alpha(C.accent, 0.12) για απαλό φόντο επιλογής. */
export const alpha = (hex: string, a: number) => { const [r, g, b] = rgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };
const lum = (hex: string) => { const [r, g, b] = rgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b; };
/* Πολύ ανοιχτό χρώμα (π.χ. κίτρινο, λευκό): το κείμενο πάνω του γίνεται σκούρο. */
export const isLight = (hex: string) => lum(hex) > 186;
export const isDark = () => lum(C.bg) < 128;
