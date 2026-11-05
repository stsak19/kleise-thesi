import { Tabs } from 'expo-router';
import { C } from '../../../../lib/ui';
import { StoreBar, type StoreTabs } from '../../../../lib/store/parts';

/* Η μπάρα του καταστήματος: Πρόγραμμα · Κρατήσεις · Μηνύματα · Προφίλ.
   backBehavior="none": το «πίσω» δεν αλλάζει καρτέλα, βγάζει από το κατάστημα πίσω στο SpotOn. */
const ITEMS: StoreTabs = {
  index: { icon: 'calendar', label: 'Πρόγραμμα' },
  bookings: { icon: 'check', label: 'Κρατήσεις' },
  messages: { icon: 'chat', label: 'Μηνύματα' },
  profile: { icon: 'user', label: 'Προφίλ' },
};

export default function StoreTabsLayout() {
  return (
    <Tabs backBehavior="none" tabBar={(p) => <StoreBar items={ITEMS} {...(p as any)} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Πρόγραμμα' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις' }} />
      <Tabs.Screen name="messages" options={{ title: 'Μηνύματα' }} />
      <Tabs.Screen name="profile" options={{ title: 'Προφίλ' }} />
    </Tabs>
  );
}
