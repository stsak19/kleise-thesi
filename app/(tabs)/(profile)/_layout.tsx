import { Stack } from 'expo-router';
import { stackOptions } from '../../../lib/stack';

export const unstable_settings = { initialRouteName: 'profile' };

export default function ProfileStack() {
  return (
    <Stack screenOptions={stackOptions()}>
      <Stack.Screen name="profile" options={{ title: 'Προφίλ', headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Ρυθμίσεις' }} />
      <Stack.Screen name="me" options={{ title: 'Τα στοιχεία μου' }} />
    </Stack>
  );
}
