import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { C } from '../lib/ui';
import { isDark, loadTheme, onTheme } from '../lib/theme';
import Intro, { useIntroSeen } from '../lib/Intro';

function Gate() {
  const { session, ready } = useAuth();
  const seg = useSegments();
  const [introSeen, setIntroSeen] = useIntroSeen();
  if (!ready || introSeen === null) return null;
  if (!introSeen) return <Intro onDone={setIntroSeen} />;
  if (!session && seg[0] !== 'login') return <Redirect href="/login" />;
  if (session && seg[0] === 'login') return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
    </Stack>
  );
}

export default function Root() {
  // Κάθε αλλαγή χρώματος ξαναζωγραφίζει την εφαρμογή.
  const [v, setV] = useState(0);
  useEffect(() => { const off = onTheme(() => setV((x) => x + 1)); loadTheme(); return off; }, []);
  return (
    <AuthProvider>
      <StatusBar style={isDark() ? 'light' : 'dark'} />
      <View key={v} style={{ flex: 1, backgroundColor: C.bg }}><Gate /></View>
    </AuthProvider>
  );
}
