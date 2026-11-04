import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { C, Icon, alpha } from '../../lib/ui';
import type { IconName } from '../../lib/Icon';

/* Η κάτω μπάρα: Αναζήτηση · Κρατήσεις · Προφίλ. Πάντα ορατή, και μέσα σε ένα κατάστημα.
   Το ενεργό εικονίδιο κάθεται σε ένα απαλό «χάπι» στο κύριο χρώμα. */
const icon = (name: IconName) => ({ focused }: { focused: boolean }) => (
  <View style={{ width: 52, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: focused ? alpha(C.accent, 0.14) : 'transparent' }}>
    <Icon name={name} size={21} color={focused ? C.accent : C.mute} />
  </View>
);

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: C.accent, tabBarInactiveTintColor: C.mute,
      tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line, boxShadow: `0px -4px 20px ${alpha(C.text, 0.05)}` },
      tabBarLabelStyle: { fontWeight: '700', fontSize: 11, marginTop: 2 },
    }}>
      <Tabs.Screen name="(search)" options={{ title: 'Αναζήτηση', tabBarIcon: icon('search') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="(profile)" options={{ title: 'Προφίλ', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
