import { Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { C } from '../../../lib/ui';
import { stackOptions } from '../../../lib/stack';
import { StoreProvider } from '../../../lib/store/data';
import { BookProvider } from '../../../lib/store/book';

/* Το κατάστημα σαν ξεχωριστή εφαρμογή: δικές του καρτέλες (Κατάστημα · Οι κρατήσεις μου)
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

/* Αν κάτι σπάσει μέσα στο κατάστημα, να μη μένει άσπρη σελίδα: μήνυμα + «Ξαναδοκίμασε». */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 20, textAlign: 'center' }}>Η σελίδα δεν άνοιξε</Text>
      <Text style={{ color: C.mute, fontSize: 13, textAlign: 'center' }}>{error?.message}</Text>
      <Pressable onPress={retry} style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, backgroundColor: C.accent }}>
        <Text style={{ color: C.onAccent, fontWeight: '800' }}>Ξαναδοκίμασε</Text>
      </Pressable>
    </View>
  );
}
