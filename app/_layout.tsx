import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { C } from '../lib/ui';
import { isDark, loadTheme, onTheme } from '../lib/theme';
import ColorEditor from '../lib/ColorEditor';

function Gate() {
  const { session, ready } = useAuth();
  const seg = useSegments();
  if (!ready) return null;
  if (!session && seg[0] !== 'login') return <Redirect href="/login" />;
  if (session && seg[0] === 'login') return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Κλείσε Θέση' }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="business/[id]" options={{ title: '' }} />
      <Stack.Screen name="bookings" options={{ title: 'Οι κρατήσεις μου' }} />
      <Stack.Screen name="profile" options={{ title: 'Προφίλ' }} />
      <Stack.Screen name="owner/index" options={{ title: 'Η επιχείρησή μου' }} />
      <Stack.Screen name="owner/setup" options={{ title: 'Στοιχεία επιχείρησης' }} />
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
      <ColorEditor />
    </AuthProvider>
  );
}
