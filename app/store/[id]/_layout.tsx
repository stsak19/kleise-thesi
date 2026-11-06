import { Stack, useLocalSearchParams } from 'expo-router';
import { stackOptions } from '../../../lib/stack';
import { StoreProvider } from '../../../lib/store/data';
import { BookProvider } from '../../../lib/store/book';

/* Το κατάστημα σαν ξεχωριστή εφαρμογή: δικές του καρτέλες (Κράτηση · Οι κρατήσεις μου · Κατάστημα)
   χωρίς την κάτω μπάρα του SpotOn. Από πάνω ανοίγουν οι Ρυθμίσεις και τα στοιχεία του SpotOn, όπως είναι. */
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function StoreStack() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <StoreProvider id={String(id)}>
      <BookProvider>
      <Stack screenOptions={stackOptions()}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ title: 'Ο λογαριασμός μου' }} />
        <Stack.Screen name="settings" options={{ title: 'Ρυθμίσεις' }} />
        <Stack.Screen name="me" options={{ title: 'Τα στοιχεία μου' }} />
      </Stack>
      </BookProvider>
    </StoreProvider>
  );
}
