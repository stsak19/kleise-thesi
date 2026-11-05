import { Stack, Redirect, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { C } from '../lib/ui';
import { isDark, loadTheme, onTheme } from '../lib/theme';
import Intro, { useIntroSeen } from '../lib/Intro';
import { useFonts } from 'expo-font';
import { FONTS } from '../lib/Txt';

/* Η αλλαγή εμφάνισης ξαναστήνει την εφαρμογή· κρατάμε την οθόνη που ήταν ανοιχτή για να γυρίσουμε σε αυτή. */
let here = '/';
let restore: string | null = null;

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
      if (/^\/(me|settings|owner)/.test(to)) { router.navigate('/profile'); setTimeout(() => router.push(to as any), 30); }
      else router.navigate(to as any);
    }, 30);
  }, [session]);
  const [introSeen, setIntroSeen] = useIntroSeen();
  if (!ready || introSeen === null) return null;
  if (!introSeen) return <Intro onDone={setIntroSeen} />;
  if (!session && seg[0] !== 'login') return <Redirect href="/login" />;
  if (session && seg[0] === 'login') return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="new-business" />
    </Stack>
  );
}

export default function Root() {
  // Κάθε αλλαγή χρώματος ξαναζωγραφίζει την εφαρμογή.
  const [v, setV] = useState(0);
  const [fonts] = useFonts(FONTS);
  useEffect(() => { const off = onTheme(() => { restore = here; setV((x) => x + 1); }); loadTheme(); return off; }, []);
  if (!fonts) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <AuthProvider>
      <StatusBar style={isDark() ? 'light' : 'dark'} />
      <View key={v} style={{ flex: 1, backgroundColor: C.bg }}><Gate /></View>
    </AuthProvider>
  );
}
