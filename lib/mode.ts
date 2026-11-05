import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/* Δύο λειτουργίες σε έναν λογαριασμό, όπως στο Airbnb:
   «πελάτης» (αναζήτηση, κρατήσεις, πακέτα, προφίλ) και «επιχείρηση» (σήμερα, ημερολόγιο, μηνύματα, σελίδα, μενού).
   Η επιλογή μένει στη συσκευή, ώστε η εφαρμογή να ανοίγει εκεί που την άφησες.
   Η αλλαγή δείχνει για λίγο μια οθόνη μετάβασης (SwitchOverlay στο app/_layout.tsx). */
export type Mode = 'client' | 'biz';
const KEY = 'mode.v1';
export const BIZ_HOME = '/today';
export const CLIENT_HOME = '/profile';

let mode: Mode = 'client';
let loaded = false;
let switching: Mode | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

const ready = AsyncStorage.getItem(KEY).then((v) => { if (v === 'biz') mode = 'biz'; }).catch(() => {}).finally(() => { loaded = true; emit(); });
export const modeReady = () => ready;

export const getMode = () => mode;
export function setMode(m: Mode) {
  mode = m; emit();
  AsyncStorage.setItem(KEY, m).catch(() => {});
}

/* Αλλαγή λειτουργίας με τη μικρή οθόνη μετάβασης. Το go κάνει την πλοήγηση όσο η οθόνη καλύπτει την εφαρμογή. */
export function switchMode(m: Mode, go: () => void) {
  if (switching) return;
  switching = m; emit();
  setTimeout(() => { setMode(m); go(); }, 450);
  setTimeout(() => { switching = null; emit(); }, 1100);
}

export function useMode() {
  const [, setV] = useState(0);
  useEffect(() => { const f = () => setV((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return { mode, loaded, switching };
}
