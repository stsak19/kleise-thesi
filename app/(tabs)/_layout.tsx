import { Tabs } from 'expo-router';
import { C } from '../../lib/ui';
import { FloatBar, type TabItems } from '../../lib/FloatBar';
import { useWide } from '../../lib/wide';
import { TopBar } from '../../lib/client/desk';

/* Η κάτω μπάρα του πελάτη: Πακέτα · Αρχική (στη μέση) · Κρατήσεις. Η εφαρμογή ανοίγει στην Αρχική. Πάντα ορατή, και μέσα σε ένα κατάστημα.
   Υπολογιστής (φαρδιά οθόνη): πάνω μπάρα όπως σε site, με αναζήτηση στη μέση, Αρχική · Κρατήσεις · Πακέτα και Σύνδεση/προφίλ δεξιά (lib/client/desk).
   Η λειτουργία επιχείρησης έχει τη δική της μπάρα στο app/(biz)/(hub)/_layout.tsx. */
// Ανοίγει πάντα στην Αρχική, παρότι δεν είναι πρώτη στη μπάρα.
export const unstable_settings = { initialRouteName: '(search)' };

const ICONS: TabItems = {
  '(search)': { icon: 'home', label: 'Αρχική' },
  bookings: { icon: 'calendar', label: 'Κρατήσεις' },
  packs: { icon: 'pack', label: 'Πακέτα' },
  '(profile)': { icon: 'user', label: 'Προφίλ' },
};
// Στην πάνω μπάρα το προφίλ είναι ο κύκλος με τα αρχικά, δεξιά.
const TOP: TabItems = { '(search)': ICONS['(search)'], bookings: ICONS.bookings, packs: ICONS.packs };

export default function TabsLayout() {
  const wide = useWide();
  return (
    <Tabs tabBar={(p) => (wide ? <TopBar items={TOP} {...p} /> : <FloatBar items={ICONS} {...p} labels />)}
      screenOptions={{ headerShown: false, animation: wide ? 'none' : 'shift', tabBarPosition: wide ? 'top' : 'bottom', sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="packs" options={{ title: 'Πακέτα' }} />
      <Tabs.Screen name="(search)" options={{ title: 'Αρχική' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις' }} />
      <Tabs.Screen name="(profile)" options={{ title: 'Προφίλ' }} />
    </Tabs>
  );
}
