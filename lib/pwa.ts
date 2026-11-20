import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { C } from './theme';

/* Εγκατάσταση της ιστοσελίδας ως εφαρμογή (PWA): εικονίδιο στην αρχική οθόνη του κινητού ή στον υπολογιστή, χωρίς store.
   Τα στατικά αρχεία είναι στο public/ (manifest.webmanifest, icons/) και βγαίνουν δίπλα στο index.html.
   Εδώ, μόνο στο web: βάζουμε στη σελίδα τον σύνδεσμο του manifest και τα meta της Apple (με τη σωστή βάση, ώστε να
   δουλεύει και στις προεπισκοπήσεις pr-preview/pr-N), και κρατάμε το «beforeinstallprompt» του Chrome/Edge/Android
   για το κουμπί «Εγκατάσταση» (Ρυθμίσεις → Εφαρμογή, InstallRow στο lib/profile/Settings.tsx). */
const WEB = Platform.OS === 'web' && typeof document !== 'undefined';
let prompt: any = null;
const subs = new Set<() => void>();
const ping = () => subs.forEach((f) => f());

/* Η βάση της σελίδας (π.χ. /kleise-thesi ή /kleise-thesi/pr-preview/pr-12), από το script της εφαρμογής. */
function base() {
  const src = (document.querySelector('script[src*="/_expo/"]') as HTMLScriptElement | null)?.getAttribute('src') ?? '';
  const i = src.indexOf('/_expo/');
  return i > 0 ? src.slice(0, i) : '';
}
function tag(name: string, attrs: Record<string, string>) {
  const sel = `${name}[${attrs.rel ? `rel="${attrs.rel}"` : `name="${attrs.name}"`}]`;
  let el = document.head.querySelector(sel) as HTMLElement | null;
  if (!el) { el = document.createElement(name); document.head.appendChild(el); }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

export function setupPwa() {
  if (!WEB) return;
  const b = base();
  document.documentElement.lang = 'el';
  tag('link', { rel: 'manifest', href: `${b}/manifest.webmanifest` });
  tag('link', { rel: 'apple-touch-icon', href: `${b}/icons/apple-touch-icon.png` });
  tag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  tag('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  tag('meta', { name: 'apple-mobile-web-app-title', content: 'SpotOn' });
  tag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
  tag('meta', { name: 'description', content: 'Κλείσε ραντεβού online σε κομμωτήρια, γυμναστήρια και καταστήματα κοντά σου.' });
  setThemeColor();
  window.addEventListener('beforeinstallprompt', (e: any) => { e.preventDefault(); prompt = e; ping(); });
  window.addEventListener('appinstalled', () => { prompt = null; ping(); });
}
/* Το χρώμα της μπάρας του browser ακολουθεί το φόντο (ανοιχτή/σκούρα εμφάνιση). */
export function setThemeColor() { if (WEB) tag('meta', { name: 'theme-color', content: C.bg }); }

const standalone = () => WEB && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
const isIos = () => WEB && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/* Για το κουμπί: can = ο browser δίνει έτοιμο παράθυρο εγκατάστασης· ios = Safari, θέλει «Κοινοποίηση → Στην οθόνη Αφετηρίας»· installed = ανοίχτηκε ήδη ως εφαρμογή. */
export function useInstall() {
  const [, setV] = useState(0);
  useEffect(() => { const f = () => setV((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return {
    web: WEB, installed: standalone(), can: !!prompt, ios: isIos(),
    install: async () => { if (!prompt) return false; prompt.prompt(); const r = await prompt.userChoice.catch(() => null); prompt = null; ping(); return r?.outcome === 'accepted'; },
  };
}
