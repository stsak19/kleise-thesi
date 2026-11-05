import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/* Προτιμήσεις της εφαρμογής (Προφίλ → Ρυθμίσεις), αποθηκευμένες στη συσκευή.
   Η εμφάνιση (ανοιχτή/σκούρα) είναι στο lib/theme.ts. */
export type Prefs = { reduceMotion: boolean };
const KEY = 'prefs.v1';
const P: Prefs = { reduceMotion: false };
const subs = new Set<() => void>();
AsyncStorage.getItem(KEY).then((v) => { if (v) { Object.assign(P, JSON.parse(v)); subs.forEach((f) => f()); } }).catch(() => {});

export const getPrefs = () => P;
export function setPref<K extends keyof Prefs>(k: K, v: Prefs[K]) {
  P[k] = v; subs.forEach((f) => f());
  AsyncStorage.setItem(KEY, JSON.stringify(P)).catch(() => {});
}
export function usePrefs(): Prefs {
  const [, setV] = useState(0);
  useEffect(() => { const f = () => setV((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return P;
}
