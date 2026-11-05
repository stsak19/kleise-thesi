import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

/* Τα χρώματα της εφαρμογής: μαύρο, λευκό και πράσινο νέον, σε ανοιχτή και σκούρα εμφάνιση.
   Ανοιχτή = λευκό φόντο, μαύρα κομμάτια με πράσινες λεπτομέρειες. Σκούρα = μαύρο φόντο με πράσινο νέον.
   accent/onAccent = ό,τι είναι «επιλεγμένο» (chip, μέρα, ώρα). btn = κύριο κουμπί (πάντα πράσινο με μαύρο κείμενο).
   ink/inkText = οι «μαύρες» επιφάνειες (επόμενη κράτηση, μπάρα κράτησης, κάτω μπάρα).
   Οι ημιδιάφανες αποχρώσεις (σκιές, φόντα επιλογής) βγαίνουν από αυτά με το alpha(). */
export const NEON = '#00e676';
export const LIGHT = {
  bg: '#ffffff', card: '#f6f6f6', soft: '#f1f1f1', line: '#ececec', text: '#0a0a0a', mute: '#6b6b6b',
  accent: '#e3e3e8', onAccent: '#0a0a0a', tint: '#2b2b30',
  btn: '#e3e3e8', btnText: '#0a0a0a', btn2: '#ffffff', btn2Text: '#0a0a0a', btn2Line: '#dedede',
  ok: '#00a855', bad: '#ff3b5c',
  shade: '#000000',
  neon: '#e3e3e8', glow: '#000000', ink: '#ededf0', inkText: '#0a0a0a', inkLine: '#e0e0e5',
};
export type Theme = typeof LIGHT;
/* Σκούρα εμφάνιση (Ρυθμίσεις → Εμφάνιση). */
export const DARK: Theme = {
  bg: '#0a0a0a', card: '#151515', soft: '#1c1c1c', line: '#262626', text: '#f5f5f5', mute: '#9a9a9a',
  accent: '#2e2e33', onAccent: '#f5f5f5', tint: '#ffffff',
  btn: '#2e2e33', btnText: '#f5f5f5', btn2: '#151515', btn2Text: '#f5f5f5', btn2Line: '#2e2e2e',
  ok: '#34c77b', bad: '#ff4d6d',
  shade: '#000000',
  neon: '#2e2e33', glow: '#000000', ink: '#1c1c1c', inkText: '#ffffff', inkLine: '#2e2e2e',
};
export const DEFAULT = LIGHT;
/* Σκούρο κείμενο πάνω σε ανοιχτές επιφάνειες (π.χ. κίτρινο χρώμα καταστήματος), ίδιο και στις δύο εμφανίσεις. */
export const INK = '#000000';
/* Σκούρα σελίδα καταστήματος (κουρεία, tattoo): μόνο για τη σελίδα του καταστήματος, όχι για όλη την εφαρμογή. */
export const NIGHT = { bg: '#0a0a0a', card: '#161616', line: '#262626', text: '#ffffff', mute: '#9a9a9a' };
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

/* Διαβάθμιση χρώματος (linear-/radial-gradient σε CSS). Στον browser γίνεται backgroundImage,
   στο κινητό experimental_backgroundImage του React Native. */
import { Platform } from 'react-native';
export const grad = (css: string): any => (Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css });
/* Minimal: χωρίς λάμψη, απλό σκούρο φόντο (κρατιέται η συνάρτηση για να μην αλλάξουν οι οθόνες). */
export const glow = (base = '#0a0a0a', ..._: any[]) => ({ backgroundColor: base });
