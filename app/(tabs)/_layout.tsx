import { Tabs } from 'expo-router';
import { C } from '../../lib/ui';
import { FloatBar, type TabItems } from '../../lib/FloatBar';

/* Η κάτω μπάρα του πελάτη: Αρχική · Κρατήσεις · Πακέτα · Προφίλ. Πάντα ορατή, και μέσα σε ένα κατάστημα.
   Η λειτουργία επιχείρησης έχει τη δική της μπάρα στο app/(biz)/(hub)/_layout.tsx. */
const ICONS: TabItems = {
  '(search)': { icon: 'home', label: 'Αρχική' },
  bookings: { icon: 'calendar', label: 'Κρατήσεις' },
  packs: { icon: 'pack', label: 'Πακέτα' },
};

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <FloatBar items={ICONS} {...p} labels />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="(search)" options={{ title: 'Αρχική' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις' }} />
      <Tabs.Screen name="packs" options={{ title: 'Πακέτα' }} />
      <Tabs.Screen name="(profile)" options={{ title: 'Προφίλ' }} />
    </Tabs>
  );
}
