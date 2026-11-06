import { Tabs } from 'expo-router';
import { C } from '../../../lib/ui';
import { FloatBar, type TabItems } from '../../../lib/FloatBar';
import { Sidebar, useWide } from '../../../lib/owner/desk';

/* Οι πέντε ενότητες της επιχείρησης: Πρόγραμμα · Μηνύματα · Πελάτες · Ομάδα · Κατάστημα.
   Κινητό: κάτω μπάρα. Υπολογιστής (φαρδιά οθόνη): πλαϊνό μενού αριστερά, με την επιχείρηση πάνω και τον λογαριασμό κάτω. */
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
  return (
    <Tabs tabBar={(p) => (wide ? <Sidebar items={ICONS} {...p} /> : <FloatBar items={ICONS} {...p} labels />)}
      screenOptions={{ headerShown: false, animation: wide ? 'none' : 'shift', tabBarPosition: wide ? 'left' : 'bottom', sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="today" options={{ title: 'Πρόγραμμα' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Μηνύματα' }} />
      <Tabs.Screen name="clients" options={{ title: 'Πελάτες' }} />
      <Tabs.Screen name="team" options={{ title: 'Ομάδα' }} />
      <Tabs.Screen name="page" options={{ title: 'Κατάστημα' }} />
    </Tabs>
  );
}
