import { Tabs } from 'expo-router';
import { C } from '../../lib/ui';
import { FloatBar, type TabItems } from '../../lib/FloatBar';

/* Η κάτω μπάρα του πελάτη: Πακέτα · Αρχική (στη μέση) · Κρατήσεις. Η εφαρμογή ανοίγει στην Αρχική. Πάντα ορατή, και μέσα σε ένα κατάστημα.
   Η λειτουργία επιχείρησης έχει τη δική της μπάρα στο app/(biz)/(hub)/_layout.tsx. */
// Ανοίγει πάντα στην Αρχική, παρότι δεν είναι πρώτη στη μπάρα.
export const unstable_settings = { initialRouteName: '(search)' };

const ICONS: TabItems = {
  '(search)': { icon: 'home', label: 'Αρχική' },
  bookings: { icon: 'calendar', label: 'Κρατήσεις' },
  packs: { icon: 'pack', label: 'Πακέτα' },
  '(profile)': { icon: 'user', label: 'Προφίλ' },
};

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <FloatBar items={ICONS} {...p} labels />} screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="packs" options={{ title: 'Πακέτα' }} />
      <Tabs.Screen name="(search)" options={{ title: 'Αρχική' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις' }} />
      <Tabs.Screen name="(profile)" options={{ title: 'Προφίλ' }} />
    </Tabs>
  );
}
