import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { C } from '../../../lib/ui';
import { FloatBar, type TabItems } from '../../../lib/FloatBar';
import { Sidebar, useWide } from '../../../lib/owner/desk';
import { useSwitchTo } from '../../../lib/SwitchMode';
import { ToClientTopButton } from '../../../lib/MyBiz';

/* Οι πέντε ενότητες της επιχείρησης: Πρόγραμμα · Μηνύματα · Πελάτες · Ομάδα · Κατάστημα.
   Κινητό: κάτω μπάρα, με το κουμπί «Πελάτης» στο τέλος (γυρίζει στη λειτουργία πελάτη). Υπολογιστής (φαρδιά οθόνη): πλαϊνό μενού αριστερά, με την επιχείρηση πάνω και τον λογαριασμό κάτω,
   και πάνω δεξιά το «Μετάβαση σε πελάτη». */
const ICONS: TabItems = {
  today: { icon: 'calendar', label: 'Πρόγραμμα' },
  inbox: { icon: 'mail', label: 'Μηνύματα' },
  clients: { icon: 'user', label: 'Πελάτες' },
  team: { icon: 'team', label: 'Ομάδα' },
  page: { icon: 'store', label: 'Κατάστημα' },
};

export const unstable_settings = { initialRouteName: 'today' };

export default function BizTabs() {
  const wide = useWide();
  const switchTo = useSwitchTo();
  const extra = { icon: 'swap' as const, label: 'Μετάβαση σε πελάτη', onPress: () => switchTo('client'), apart: true };
  return (
    <Tabs tabBar={(p) => (wide ? <Sidebar items={ICONS} {...p} /> : <FloatBar items={ICONS} {...p} labels extra={extra} />)}
      screenLayout={wide ? ({ children }) => (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <ToClientTopButton />
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      ) : undefined}
      screenOptions={{ headerShown: false, animation: wide ? 'none' : 'shift', tabBarPosition: wide ? 'left' : 'bottom', sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="today" options={{ title: 'Πρόγραμμα' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Μηνύματα' }} />
      <Tabs.Screen name="clients" options={{ title: 'Πελάτες' }} />
      <Tabs.Screen name="team" options={{ title: 'Ομάδα' }} />
      <Tabs.Screen name="page" options={{ title: 'Κατάστημα' }} />
      {/* Δεν φαίνεται στη μπάρα (FloatBar/Sidebar δείχνουν μόνο ό,τι έχει το ICONS)· ανοίγει από το «Κατάστημα». */}
      <Tabs.Screen name="shop-settings" options={{ title: 'Ρυθμίσεις καταστήματος' }} />
    </Tabs>
  );
}
