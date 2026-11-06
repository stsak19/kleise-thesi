import { Tabs } from 'expo-router';
import { C } from '../../../../lib/ui';
import { View } from 'react-native';
import { StoreBar, type StoreTabs } from '../../../../lib/store/parts';
import { StoreAside, StoreTopBar } from '../../../../lib/store/desk';
import { useWide } from '../../../../lib/wide';

/* Η μπάρα του καταστήματος: Πρόγραμμα · Κρατήσεις · Μηνύματα · Προφίλ.
   backBehavior="none": το «πίσω» δεν αλλάζει καρτέλα, βγάζει από το κατάστημα πίσω στο SpotOn.
   Υπολογιστής: πάνω μπάρα του καταστήματος, η καρτέλα σε στήλη στη μέση και δεξιά κράτηση/πακέτο/υπηρεσίες/ωράριο (lib/store/desk). */
const ITEMS: StoreTabs = {
  index: { icon: 'calendar', label: 'Πρόγραμμα' },
  bookings: { icon: 'check', label: 'Κρατήσεις' },
  messages: { icon: 'chat', label: 'Μηνύματα' },
  profile: { icon: 'user', label: 'Προφίλ' },
};

export default function StoreTabsLayout() {
  const wide = useWide();
  return (
    <Tabs backBehavior="none" tabBar={(p) => (wide ? <StoreTopBar items={ITEMS} {...(p as any)} /> : <StoreBar items={ITEMS} {...(p as any)} />)}
      screenLayout={wide ? ({ children, route }) => (
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}><View style={{ flex: 1, width: '100%', maxWidth: 780, paddingHorizontal: 12 }}>{children}</View></View>
          <StoreAside route={route.name} />
        </View>
      ) : undefined}
      screenOptions={{ headerShown: false, tabBarPosition: wide ? 'top' : 'bottom', sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Πρόγραμμα' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις' }} />
      <Tabs.Screen name="messages" options={{ title: 'Μηνύματα' }} />
      <Tabs.Screen name="profile" options={{ title: 'Προφίλ' }} />
    </Tabs>
  );
}
