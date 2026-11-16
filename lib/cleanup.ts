import AsyncStorage from '@react-native-async-storage/async-storage';

/* Καθαρίζει από τη συσκευή ό,τι είχε μείνει από την παλιά δοκιμαστική λειτουργία (σημαίες, αποθηκευμένα
   δοκιμαστικά δεδομένα, επιλεγμένη δοκιμαστική επιχείρηση). Τρέχει μία φορά σε κάθε εκκίνηση· είναι ακίνδυνο αν δεν υπάρχει τίποτα. */
const isOld = (k: string) => k.startsWith('spoton.demo');
export const cleanupReady: Promise<void> = (async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const drop = keys.filter(isOld);
    const act = await AsyncStorage.getItem('biz.active.v1');
    if (act && act.startsWith('b-')) drop.push('biz.active.v1');
    if (drop.length) await AsyncStorage.multiRemove(drop);
  } catch {}
  try {
    if (typeof localStorage !== 'undefined')
      Object.keys(localStorage).filter(isOld).forEach((k) => localStorage.removeItem(k));
  } catch {}
})();

/* Δοκιμαστική σύνδεση που έμεινε αποθηκευμένη: δεν αντιστοιχεί σε πραγματικό λογαριασμό. */
export const isOldTestSession = (refresh: string | undefined) => !!refresh && refresh.startsWith('demo');
