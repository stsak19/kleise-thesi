import { Tabs } from 'expo-router';
import { C } from '../../../../lib/ui';
import { View } from 'react-native';
import { StoreBar, type StoreTabs } from '../../../../lib/store/parts';
import { StoreTopBar } from '../../../../lib/store/desk';
import { useWide } from '../../../../lib/wide';

/* Οι 2 καρτέλες του καταστήματος: Κατάστημα (στοιχεία + κουμπί που ανοίγει την κράτηση σε παράθυρο) · Οι κρατήσεις μου.
   Ο λογαριασμός ανοίγει από τα αρχικά πάνω δεξιά (app/store/[id]/account), όχι από καρτέλα.
   backBehavior="none": το «πίσω» δεν αλλάζει καρτέλα, βγάζει από το κατάστημα πίσω στο SpotOn.
   Υπολογιστής: πάνω μπάρα του καταστήματος, η καρτέλα σε στήλη στη μέση. */
export default function StoreTabsLayout() {
  const wide = useWide();
  const ITEMS: StoreTabs = {
    index: { icon: 'store', label: 'Κατάστημα' },
    bookings: { icon: 'check', label: wide ? 'Οι κρατήσεις μου' : 'Κρατήσεις' },
  };
  return (
    <Tabs backBehavior="none" tabBar={(p) => (wide ? <StoreTopBar items={ITEMS} {...(p as any)} /> : <StoreBar items={ITEMS} {...(p as any)} />)}
      screenLayout={wide ? ({ children, route }) => (
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: route.name === 'index' ? 1120 : 820, paddingHorizontal: 12 }}>{children}</View>
          </View>
        </View>
      ) : undefined}
      screenOptions={{ headerShown: false, tabBarPosition: wide ? 'top' : 'bottom', sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Κατάστημα' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Οι κρατήσεις μου' }} />
    </Tabs>
  );
}
