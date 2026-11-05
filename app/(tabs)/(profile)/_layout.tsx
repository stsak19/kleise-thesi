import { Stack } from 'expo-router';
import { stackOptions } from '../../../lib/stack';

export const unstable_settings = { initialRouteName: 'profile' };

export default function ProfileStack() {
  return (
    <Stack screenOptions={stackOptions()}>
      <Stack.Screen name="profile" options={{ title: 'Προφίλ', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Ρυθμίσεις' }} />
      <Stack.Screen name="me" options={{ title: 'Τα στοιχεία μου' }} />
      <Stack.Screen name="owner/index" options={{ title: 'Η επιχείρησή μου' }} />
      <Stack.Screen name="owner/setup" options={{ title: 'Ρυθμίσεις καταστήματος' }} />
      <Stack.Screen name="owner/style" options={{ title: 'Εμφάνιση σελίδας' }} />
      <Stack.Screen name="owner/messages" options={{ title: 'Μηνύματα σε πελάτες' }} />
    </Stack>
  );
}
