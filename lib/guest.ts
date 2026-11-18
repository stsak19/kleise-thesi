import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

/* Επισκέπτης χωρίς λογαριασμό (ιστοσελίδα ΚΑΙ εφαρμογή κινητού, από 2026-11-18): βλέπει την αρχική και τα καταστήματα.
   Σύνδεση ζητιέται μόνο όταν πάει να κλείσει θέση ή να ανοίξει Κρατήσεις/Πακέτα/Προφίλ.
   Ιστοσελίδα: παράθυρο στη μέση (lib/login/LoginModal). Κινητό: η οθόνη σύνδεσης ανοίγει από πάνω και μετά τη σύνδεση κλείνει,
   ώστε ο πελάτης να γυρίσει ακριβώς εκεί που ήταν (π.χ. στην επιβεβαίωση της ώρας που διάλεξε). */
export const GUEST_OK = true;
export const WEB = Platform.OS === 'web';
/* Τιμή του «πού να γυρίσει» που σημαίνει «κλείσε την οθόνη σύνδεσης και μείνε στη σελίδα που ήσουν». */
export const BACK = '#back';

/* Οι σελίδες που ανοίγουν χωρίς λογαριασμό: η αρχική, η αρχική ενός καταστήματος (στοιχεία και κράτηση),
   και οι Κρατήσεις του καταστήματος (εκεί δείχνει «Συνδέσου»), ώστε ο επισκέπτης να μη βγαίνει από το κατάστημα. */
/* Το απόρρητο ανοίγει πάντα χωρίς λογαριασμό (το ζητούν τα stores). */
export const openToGuests = (path: string) => path === '/privacy' || GUEST_OK && (path === '/' || /^\/store\/[^/]+(\/bookings|\/book)?\/?$/.test(path));

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

/* «Θέλει σύνδεση»: θυμάται πού να πάει μετά και ανοίγει το παράθυρο σύνδεσης.
   want: με ποια καρτέλα ανοίγει (π.χ. «Εγγραφή» όταν πάει να προσθέσει την επιχείρησή του, άρα μάλλον είναι καινούργιος). */
let want: 'in' | 'up' = 'in';
export const loginWant = () => want;
export function askLogin(returnTo?: string, mode: 'in' | 'up' = 'in', stay = false) {
  want = mode;
  if (WEB) { back = returnTo ?? null; setLoginOpen(true); return; }
  back = stay ? BACK : returnTo ?? null;
  router.push('/login');
}
