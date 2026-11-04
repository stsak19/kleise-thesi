import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '../../lib/ui';

/* Η κάτω μπάρα: Αναζήτηση · Κρατήσεις · Προφίλ. Πάντα ορατή, και μέσα σε ένα κατάστημα. */
const icon = (e: string) => ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{e}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: C.accent, tabBarInactiveTintColor: C.mute,
      tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.line }, tabBarLabelStyle: { fontWeight: '600' },
    }}>
      <Tabs.Screen name="(search)" options={{ title: 'Αναζήτηση', tabBarIcon: icon('🔎') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Κρατήσεις', tabBarIcon: icon('📅'), headerShown: true,
        headerTitle: 'Οι κρατήσεις μου', headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, headerShadowVisible: false }} />
      <Tabs.Screen name="(profile)" options={{ title: 'Προφίλ', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
