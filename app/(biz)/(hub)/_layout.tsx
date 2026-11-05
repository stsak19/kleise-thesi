import { Tabs } from 'expo-router';
import { C } from '../../../lib/ui';
import { FloatBar, type TabItems } from '../../../lib/FloatBar';

/* Η κάτω μπάρα της επιχείρησης: Σήμερα · Ημερολόγιο · Μηνύματα · Σελίδα · Μενού. */
const ICONS: TabItems = {
  today: { icon: 'clock', label: 'Σήμερα' },
  calendar: { icon: 'calendar', label: 'Ημερολόγιο' },
  inbox: { icon: 'mail', label: 'Μηνύματα' },
  page: { icon: 'store', label: 'Σελίδα' },
  menu: { icon: 'user', label: 'Μενού' },
};

export const unstable_settings = { initialRouteName: 'today' };

export default function BizTabs() {
  return (
    <Tabs tabBar={(p) => <FloatBar items={ICONS} {...p} labels />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="today" options={{ title: 'Σήμερα' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Ημερολόγιο' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Μηνύματα' }} />
      <Tabs.Screen name="page" options={{ title: 'Σελίδα' }} />
      <Tabs.Screen name="menu" options={{ title: 'Μενού' }} />
    </Tabs>
  );
}
