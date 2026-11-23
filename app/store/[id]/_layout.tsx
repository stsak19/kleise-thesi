import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { C } from '../../../lib/ui';
import { stackOptions } from '../../../lib/stack';
import { tr } from '../../../lib/i18n';
import { StoreProvider, useStore } from '../../../lib/store/data';
import { BookProvider } from '../../../lib/store/book';
import { knownId, resolveStore } from '../../../lib/store/key';

/* Το κατάστημα σαν ξεχωριστή εφαρμογή: δικές του καρτέλες (Κατάστημα · Οι κρατήσεις μου)
   χωρίς την κάτω μπάρα του SpotOn. Από πάνω ανοίγουν οι Ρυθμίσεις και τα στοιχεία του SpotOn, όπως είναι. */
export const unstable_settings = { initialRouteName: '(tabs)' };

/* Η διεύθυνση γράφει το slug του καταστήματος (/store/barber-nikos, migration 020) ή, σε παλιούς συνδέσμους, τον κωδικό του.
   Πρώτα βρίσκουμε τον κωδικό· τα δεδομένα φορτώνονται πάντα με αυτόν. */
export default function StoreStack() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const key = decodeURIComponent(String(raw ?? '')).toLowerCase();
  const [found, setFound] = useState<{ key: string; id: string | null } | null>(null);
  const id = knownId(key) ?? (found?.key === key ? found.id : undefined);
  useEffect(() => {
    if (id !== undefined) return;
    let live = true;
    resolveStore(key).then((r) => { if (live) setFound({ key, id: r }); });
    return () => { live = false; };
  }, [key, id]);
  if (id === undefined) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (id === null) return <NotFound />;
  return (
    <StoreProvider id={id} path={key}>
      <CurrentUrl at={key} />
      <BookProvider>
      <Stack screenOptions={stackOptions()}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ title: tr('Ο λογαριασμός μου') }} />
        <Stack.Screen name="settings" options={{ title: tr('Ρυθμίσεις') }} />
        <Stack.Screen name="me" options={{ title: tr('Τα στοιχεία μου') }} />
      </Stack>
      </BookProvider>
    </StoreProvider>
  );
}

/* Αν η διεύθυνση γράφει τον κωδικό ή ένα παλιό όνομα (το κατάστημα μετονομάστηκε), γίνεται η τωρινή: /store/<slug>.
   Το κατάστημα δεν ξαναφορτώνει, γιατί το νέο slug είναι ήδη γνωστό (lib/store/key.ts). */
function CurrentUrl({ at }: { at: string }) {
  const S = useStore();
  const router = useRouter();
  const slug: string | undefined = S.biz?.slug;
  useEffect(() => { if (slug && slug !== at) router.setParams({ id: slug }); }, [slug, at]);
  return null;
}

/* Λάθος ή παλιός σύνδεσμος (το κατάστημα δεν υπάρχει πια). */
function NotFound() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }}>
      <Text style={{ fontSize: 40 }}>🔎</Text>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 20, textAlign: 'center' }}>Δεν βρέθηκε το κατάστημα</Text>
      <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center', maxWidth: 320 }}>Ο σύνδεσμος μπορεί να είναι λάθος ή το κατάστημα να μην είναι πια στο SpotOn.</Text>
      <Pressable onPress={() => router.replace('/')} style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, backgroundColor: C.text }}>
        <Text style={{ color: C.bg, fontWeight: '800' }}>Δες όλα τα καταστήματα</Text>
      </Pressable>
    </View>
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
