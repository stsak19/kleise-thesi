import AsyncStorage from '@react-native-async-storage/async-storage';

/* Τα χρώματα της εφαρμογής. Αλλάζουν live από τον επεξεργαστή χρωμάτων (🎨). */
export const DEFAULT = {
  bg: '#ffffff', card: '#f5f5f7', line: '#e3e3e8', text: '#16161a', mute: '#6e6e78',
  accent: '#ff7a59', onAccent: '#ffffff', ok: '#1fa971', bad: '#e5484d',
};
export type Theme = typeof DEFAULT;
export const LABELS: Record<keyof Theme, string> = {
  bg: 'Φόντο', card: 'Κάρτες / πεδία', line: 'Περιγράμματα', text: 'Κείμενο', mute: 'Δευτερεύον κείμενο',
  accent: 'Κύριο χρώμα', onAccent: 'Κείμενο πάνω στο κύριο', ok: 'Επιτυχία', bad: 'Σφάλμα',
};
export const C: Theme = { ...DEFAULT };

const KEY = 'theme.v1';
const subs = new Set<() => void>();
export const onTheme = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const emit = () => subs.forEach((f) => f());

export function setColors(p: Partial<Theme>) {
  Object.assign(C, p); emit();
  AsyncStorage.setItem(KEY, JSON.stringify(C)).catch(() => {});
}
export const resetColors = () => setColors(DEFAULT);
export async function loadTheme() {
  try { const v = await AsyncStorage.getItem(KEY); if (v) { Object.assign(C, JSON.parse(v)); emit(); } } catch {}
}
export const isDark = () => {
  const h = C.bg.replace('#', ''); if (h.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
};
