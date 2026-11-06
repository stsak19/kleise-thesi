import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/* Επισκέπτης χωρίς λογαριασμό (μόνο στην ιστοσελίδα): βλέπει την αρχική και τα καταστήματα.
   Σύνδεση ζητιέται μόνο όταν πάει να κλείσει θέση ή να ανοίξει Κρατήσεις/Πακέτα/Προφίλ: ανοίγει παράθυρο στη μέση
   (lib/login/LoginModal) και μετά τη σύνδεση γυρίζει εκεί που ήθελε να πάει.
   Στην εφαρμογή του κινητού η σύνδεση χρειάζεται από την αρχή, όπως πριν. */
export const GUEST_OK = Platform.OS === 'web';

/* Οι σελίδες που ανοίγουν χωρίς λογαριασμό: η αρχική, η κράτηση και η καρτέλα «Κατάστημα» ενός καταστήματος. */
export const openToGuests = (path: string) => GUEST_OK && (path === '/' || /^\/store\/[^/]+(\/info)?\/?$/.test(path));

let back: string | null = null;
export const setReturnTo = (path: string | null) => { back = path; };
/* Πού να γυρίσει μετά τη σύνδεση. */
export const getReturnTo = () => back;

/* Το παράθυρο σύνδεσης: ανοιχτό/κλειστό, κοινό για όλη την εφαρμογή. */
let open = false;
const subs = new Set<(v: boolean) => void>();
export const setLoginOpen = (v: boolean) => { if (v !== open) { open = v; subs.forEach((f) => f(v)); } };
export function useLoginOpen() {
  const [v, setV] = useState(open);
  useEffect(() => { subs.add(setV); return () => { subs.delete(setV); }; }, []);
  return v;
}

/* «Θέλει σύνδεση»: θυμάται πού να πάει μετά και ανοίγει το παράθυρο σύνδεσης. */
export function askLogin(returnTo?: string) {
  back = returnTo ?? null;
  setLoginOpen(true);
}
