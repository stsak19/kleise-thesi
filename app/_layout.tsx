import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { C } from '../lib/ui';

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
  return <AuthProvider><StatusBar style="light" /><Gate /></AuthProvider>;
}
