import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

/* Τα οριστικά χρώματα της εφαρμογής: μια ανοιχτή και μια σκούρα παλέτα.
   Οι ημιδιάφανες αποχρώσεις (σκιές, φόντα επιλογής) βγαίνουν από αυτά με το alpha(). */
export const LIGHT = {
  bg: '#ffffff', card: '#f5f6f8', soft: '#f5f6f8', line: '#ffffff', text: '#000000', mute: '#4d4d4d',
  accent: '#1d85ed', onAccent: '#ffffff',
  btn: '#1d85ed', btnText: '#ffffff', btn2: '#ffffff', btn2Text: '#840b29', btn2Line: '#b3b3b3',
  ok: '#1fa971', bad: '#ed1d51',
  shade: '#000000',
};
export type Theme = typeof LIGHT;
/* Σκούρα εμφάνιση (Ρυθμίσεις → Εμφάνιση). */
export const DARK: Theme = {
  bg: '#0e0f12', card: '#1a1b20', soft: '#24252b', line: '#2c2d33', text: '#f4f5f7', mute: '#a3a6ad',
  accent: '#3b95f0', onAccent: '#ffffff',
  btn: '#3b95f0', btnText: '#ffffff', btn2: '#1a1b20', btn2Text: '#f58aa3', btn2Line: '#44464d',
  ok: '#2fc488', bad: '#ff4d73',
  shade: '#000000',
};
export const DEFAULT = LIGHT;
/* Σκούρο κείμενο πάνω σε ανοιχτές επιφάνειες (π.χ. κίτρινο χρώμα καταστήματος), ίδιο και στις δύο εμφανίσεις. */
export const INK = '#000000';
/* Σκούρα σελίδα καταστήματος (κουρεία, tattoo): μόνο για τη σελίδα του καταστήματος, όχι για όλη την εφαρμογή. */
export const NIGHT = { bg: '#111113', card: '#1c1c1f', line: '#2a2a2e', text: '#ffffff', mute: '#a1a1aa' };
export const C: Theme = { ...LIGHT };

const subs = new Set<() => void>();
export const onTheme = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const emit = () => subs.forEach((f) => f());

/* ---------- εμφάνιση: ανοιχτή / σκούρα / αυτόματα ---------- */
export type Mode = 'light' | 'dark' | 'auto';
const MODE_KEY = 'theme.mode';
let mode: Mode = 'light';
export const getMode = () => mode;
const resolved = () => (mode === 'auto' ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') : mode);
function apply() {
  const next = resolved() === 'dark' ? DARK : LIGHT;
  if (C.bg === next.bg && C.text === next.text) return;
  Object.assign(C, next); emit();
}
/* Αλλάζει την εμφάνιση· η εφαρμογή ξαναζωγραφίζεται μόνο αν αλλάξει πράγματι η παλέτα. */
export function setMode(m: Mode) {
  mode = m; apply();
  AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
}
export async function loadTheme() {
  try { const v = await AsyncStorage.getItem(MODE_KEY); if (v === 'light' || v === 'dark' || v === 'auto') mode = v; } catch {}
  apply();
  Appearance.addChangeListener?.(() => { if (mode === 'auto') apply(); });
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
