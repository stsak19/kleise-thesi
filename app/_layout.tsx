import { Stack, Redirect, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { C } from '../lib/ui';
import { isDark, loadTheme, onTheme } from '../lib/theme';
import Intro, { useIntroSeen } from '../lib/Intro';
import { useFonts } from 'expo-font';
import { FONTS } from '../lib/Txt';
import { BIZ_HOME, getMode, useMode } from '../lib/mode';
import { SwitchOverlay } from '../lib/SwitchMode';
import { BACK, GUEST_OK, WEB, askLogin, openToGuests, setReturnTo, getReturnTo } from '../lib/guest';
import { LoginModal } from '../lib/login/LoginModal';
import { PrivacyModal } from '../lib/privacy';
import { setThemeColor, setupPwa } from '../lib/pwa';

setupPwa(); // μόνο στο web: manifest και εικονίδια για «Εγκατάσταση» (lib/pwa.ts)

// Η εφαρμογή ξεκινά πάντα από τον πελάτη· η λειτουργία επιχείρησης (biz) ανοίγει μόνο όταν την επιλέξεις.
export const unstable_settings = { initialRouteName: '(tabs)' };

/* Η αλλαγή εμφάνισης ξαναστήνει την εφαρμογή· κρατάμε την οθόνη που ήταν ανοιχτή για να γυρίσουμε σε αυτή. */
let here = '/';
let restore: string | null = null;
// Στο άνοιγμα, αν ο χρήστης είχε αφήσει την εφαρμογή σε λειτουργία επιχείρησης, ξεκινάμε από εκεί.
let booted = false;

function Gate() {
  const { session, ready } = useAuth();
  const seg = useSegments();
  const path = usePathname();
  const router = useRouter();
  here = path;
  useEffect(() => {
    if (!restore || !session) return;
    const to = restore; restore = null;
    // Ο νέος πλοηγός ξεκινά από την αρχική· μόλις στηθεί, πάμε πίσω στην οθόνη που ήταν ανοιχτή.
    // Οι οθόνες μέσα στο Προφίλ ανοίγουν πάνω από το Προφίλ, ώστε να υπάρχει το βελάκι «πίσω».
    if (to === '/') return;
    setTimeout(() => {
      const base = /^\/(me|settings)/.test(to) ? '/profile' : /^\/owner\//.test(to) ? '/page' : /^\/(account|app-settings)/.test(to) ? '/page' : null;
      // Στη λειτουργία επιχείρησης αντικαθιστούμε την αρχική, ώστε το «πίσω» να μη βγάζει στον πελάτη.
      const go = getMode() === 'biz' ? router.replace : router.navigate;
      if (base) { go(base as any); setTimeout(() => router.push(to as any), 30); }
      else go(to as any);
    }, 30);
  }, [session]);
  // Ο επισκέπτης συνδέθηκε επειδή πήγε να κλείσει θέση (ή να ανοίξει Κρατήσεις κ.λπ.): γυρίζει εκεί που ήταν.
  const back = session && seg[0] === 'login' && getMode() !== 'biz' ? getReturnTo() : null;
  useEffect(() => { if (back) { setReturnTo(null); if (back === BACK) (router.canGoBack() ? router.back() : router.replace('/')); else router.replace(back as any); } }, [back]);
  const [introSeen, setIntroSeen, introAsked] = useIntroSeen();
  const { loaded } = useMode();
  if (!ready || introSeen === null || !loaded) return null;
  // Στην ιστοσελίδα ο επισκέπτης βλέπει πρώτα τα καταστήματα: χωρίς ξενάγηση και χωρίς σύνδεση (lib/guest).
  // Αν όμως πατήσει «Δες ξανά την ξενάγηση», ανοίγει κι εκεί.
  if (!introSeen && (Platform.OS !== 'web' || introAsked)) return <Intro onDone={setIntroSeen} />;
  if (!session && seg[0] !== 'login' && !openToGuests(path)) {
    // Ιστοσελίδα: μένει στην αρχική και ανοίγει το παράθυρο σύνδεσης· μετά τη σύνδεση πάει εκεί που ήθελε.
    if (GUEST_OK) { setTimeout(() => askLogin(path, path === '/new-business' ? 'up' : 'in'), 0); return <Redirect href="/" />; }
    return <Redirect href="/login" />;
  }
  if (session && seg[0] === 'login' && !back) return <Redirect href={getMode() === 'biz' ? BIZ_HOME : '/'} />;
  if (session && !booted) { booted = true; if (getMode() === 'biz' && !restore && seg[0] !== '(biz)' && seg[0] !== 'admin') return <Redirect href={BIZ_HOME} />; }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(biz)" />
      <Stack.Screen name="new-business" />
      <Stack.Screen name="booked" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paid" />
    </Stack>
  );
}

export default function Root() {
  // Κάθε αλλαγή χρώματος ξαναζωγραφίζει την εφαρμογή.
  const [v, setV] = useState(0);
  const [fonts] = useFonts(FONTS);
  useEffect(() => { const off = onTheme(() => { restore = here; setV((x) => x + 1); setThemeColor(); }); loadTheme(); return off; }, []);
  if (!fonts) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <AuthProvider>
      <StatusBar style={isDark() ? 'light' : 'dark'} />
      <View key={v} style={{ flex: 1, backgroundColor: C.bg }}><Gate /><SwitchOverlay />{WEB && <LoginModal />}<PrivacyModal /></View>
    </AuthProvider>
  );
}
