import { Stack } from 'expo-router';
import { stackOptions } from '../../../lib/stack';
import { tr } from '../../../lib/i18n';

export const unstable_settings = { initialRouteName: 'profile' };

export default function ProfileStack() {
  return (
    <Stack screenOptions={stackOptions()}>
      <Stack.Screen name="profile" options={{ title: tr('Προφίλ'), headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: tr('Ρυθμίσεις') }} />
      <Stack.Screen name="me" options={{ title: tr('Τα στοιχεία μου') }} />
    </Stack>
  );
}
