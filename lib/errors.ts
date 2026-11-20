import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { sb } from './supabase';

/* Σφάλματα από τις συσκευές των χρηστών → βάση (log_client_error, migration 024) → super admin «Σφάλματα» (/admin/errors).
   Πιάνει: σφάλματα JavaScript που δεν τα έπιασε κανείς (κινητό: ErrorUtils, web: error/unhandledrejection)
   και ό,τι φτάνει στα ErrorBoundary (app/_layout.tsx, app/store/[id]/_layout.tsx).
   Όριο 20 αναφορές ανά άνοιγμα της εφαρμογής, και το ίδιο μήνυμα μόνο μία φορά. Αν δεν έχει τρέξει το 024, απλώς δεν γράφεται.
   Εξωτερική υπηρεσία (π.χ. Sentry) δεν χρειάζεται· αν μπει κάποτε, μπαίνει εδώ, στο report(). */
const sent = new Set<string>();
let left = 20;
let path = '';
export const setErrorPath = (p: string) => { path = p; };

export function report(err: unknown, extra?: string) {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
    const message = `${e.name && e.name !== 'Error' ? e.name + ': ' : ''}${e.message || 'Άγνωστο σφάλμα'}`.slice(0, 500);
    if (left <= 0 || sent.has(message)) return;
    sent.add(message); left--;
    if (__DEV__) return; // στην ανάπτυξη φαίνονται ήδη στην οθόνη
    sb.rpc('log_client_error', {
      p_message: message, p_stack: [extra, e.stack].filter(Boolean).join('\n').slice(0, 4000) || null,
      p_path: path || (Platform.OS === 'web' && typeof location !== 'undefined' ? location.pathname : null),
      p_platform: Platform.OS, p_version: Constants.expoConfig?.version ?? null,
    }).then(() => {}, () => {});
  } catch {}
}

let installed = false;
export function installErrorHandlers() {
  if (installed) return; installed = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (ev) => report(ev.error ?? ev.message));
    window.addEventListener('unhandledrejection', (ev: any) => report(ev.reason ?? 'unhandledrejection'));
    return;
  }
  const EU = (globalThis as any).ErrorUtils;
  if (!EU?.setGlobalHandler) return;
  const prev = EU.getGlobalHandler?.();
  EU.setGlobalHandler((e: any, fatal?: boolean) => { report(e, fatal ? 'fatal' : undefined); prev?.(e, fatal); });
}
