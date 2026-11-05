import { Stack } from 'expo-router';
import { stackOptions } from '../../lib/stack';

/* Λειτουργία επιχείρησης: οι καρτέλες της (hub) και, από πάνω τους, οι οθόνες επεξεργασίας χωρίς κάτω μπάρα. */
export const unstable_settings = { initialRouteName: '(hub)' };

export default function BizStack() {
  return (
    <Stack screenOptions={stackOptions()}>
      <Stack.Screen name="(hub)" options={{ headerShown: false }} />
      <Stack.Screen name="owner/setup" options={{ title: 'Ρυθμίσεις καταστήματος' }} />
      <Stack.Screen name="owner/style" options={{ title: 'Εμφάνιση σελίδας' }} />
      <Stack.Screen name="owner/team" options={{ title: 'Η ομάδα' }} />
      <Stack.Screen name="owner/plans" options={{ title: 'Πακέτα' }} />
      <Stack.Screen name="owner/clients" options={{ title: 'Πελάτες' }} />
      <Stack.Screen name="owner/client" options={{ title: '' }} />
      <Stack.Screen name="account" options={{ title: 'Τα στοιχεία μου' }} />
      <Stack.Screen name="app-settings" options={{ title: 'Ρυθμίσεις' }} />
    </Stack>
  );
}
