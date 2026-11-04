import { Stack } from 'expo-router';
import { stackOptions } from '../../../lib/stack';

export const unstable_settings = { initialRouteName: 'index' };

export default function SearchStack() {
  return (
    <Stack screenOptions={stackOptions()}>
      <Stack.Screen name="index" options={{ title: 'SpotOn', headerShown: false }} />
      <Stack.Screen name="business/[id]" options={{ title: '' }} />
      <Stack.Screen name="booked" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
