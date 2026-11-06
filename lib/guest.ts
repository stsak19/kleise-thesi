import { Platform } from 'react-native';
import { router } from 'expo-router';

/* Επισκέπτης χωρίς λογαριασμό (μόνο στην ιστοσελίδα): βλέπει την αρχική και τα καταστήματα.
   Σύνδεση ζητιέται μόνο όταν πάει να κλείσει θέση ή να ανοίξει Κρατήσεις/Πακέτα/Προφίλ· μετά τη σύνδεση γυρίζει εκεί που ήταν.
   Στην εφαρμογή του κινητού η σύνδεση χρειάζεται από την αρχή, όπως πριν. */
export const GUEST_OK = Platform.OS === 'web';

/* Οι σελίδες που ανοίγουν χωρίς λογαριασμό: η αρχική και το πρόγραμμα ενός καταστήματος. */
export const openToGuests = (path: string) => GUEST_OK && (path === '/' || /^\/store\/[^/]+\/?$/.test(path));

let back: string | null = null;
export const setReturnTo = (path: string | null) => { back = path; };
/* Πού να γυρίσει μετά τη σύνδεση (το Gate το καθαρίζει μόλις φτάσει). */
export const getReturnTo = () => back;

/* «Θέλει σύνδεση»: θυμάται τη σελίδα και ανοίγει τη σύνδεση. */
export function askLogin(returnTo?: string) {
  back = returnTo ?? (typeof window !== 'undefined' ? window.location.pathname : null);
  router.push('/login');
}
