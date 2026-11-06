import { Tabs } from 'expo-router';
import { C } from '../../../../lib/ui';
import { View } from 'react-native';
import { StoreBar, type StoreTabs } from '../../../../lib/store/parts';
import { StoreAside, StoreTopBar } from '../../../../lib/store/desk';
import { useWide } from '../../../../lib/wide';
import { useStore } from '../../../../lib/store/data';

/* Οι 3 καρτέλες του καταστήματος: Κράτηση · Οι κρατήσεις μου · Κατάστημα.
   Ο λογαριασμός ανοίγει από τα αρχικά πάνω δεξιά (app/store/[id]/account), όχι από καρτέλα.
   backBehavior="none": το «πίσω» δεν αλλάζει καρτέλα, βγάζει από το κατάστημα πίσω στο SpotOn.
   Υπολογιστής: πάνω μπάρα του καταστήματος· δεξιά στήλη (σύνοψη κράτησης, πακέτο) μόνο στην Κράτηση. */
export default function StoreTabsLayout() {
  const wide = useWide();
  const S = useStore();
  const classes = S.layout === 'classes';
  const ITEMS: StoreTabs = {
    index: { icon: 'calendar', label: classes ? 'Πρόγραμμα' : 'Κράτηση' },
    bookings: { icon: 'check', label: wide ? 'Οι κρατήσεις μου' : 'Κρατήσεις' },
    info: { icon: 'store', label: 'Κατάστημα' },
  };
  return (
    <Tabs backBehavior="none" tabBar={(p) => (wide ? <StoreTopBar items={ITEMS} {...(p as any)} /> : <StoreBar items={ITEMS} {...(p as any)} />)}
      screenLayout={wide ? ({ children, route }) => (
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <View style={{ flex: 1, width: '100%', maxWidth: route.name === 'index' ? 780 : route.name === 'info' ? 1040 : 820, paddingHorizontal: 12 }}>{children}</View>
          </View>
          {route.name === 'index' && <StoreAside />}
        </View>
      ) : undefined}
      screenOptions={{ headerShown: false, tabBarPosition: wide ? 'top' : 'bottom', sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: ITEMS.index.label }} />
      <Tabs.Screen name="bookings" options={{ title: 'Οι κρατήσεις μου' }} />
      <Tabs.Screen name="info" options={{ title: 'Κατάστημα' }} />
    </Tabs>
  );
}
