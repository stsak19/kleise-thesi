import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { C } from '../../../lib/ui';
import { FloatBar } from '../../../lib/FloatBar';
import { BIZ_TABS, Sidebar, useWide } from '../../../lib/owner/desk';
import { useSwitchTo } from '../../../lib/SwitchMode';
import { ToClientTopButton } from '../../../lib/MyBiz';

/* Οι ενότητες της επιχείρησης: Πρόγραμμα · Μηνύματα · Πελάτες · Κατάστημα.
   Η «Ομάδα» δεν είναι στη μπάρα· ανοίγει από το «Κατάστημα» (γραμμή στις Αλλαγές).
   Κινητό: κάτω μπάρα (4 καρτέλες) που λέει την καρτέλα που πάτησες, με τον μαύρο κύκλο «Μετάβαση σε πελάτη» δίπλα της. Οι μεγάλοι τίτλοι των οθονών φαίνονται μόνο στον υπολογιστή. Υπολογιστής (φαρδιά οθόνη): πλαϊνό μενού αριστερά, με την επιχείρηση πάνω και τον λογαριασμό κάτω,
   και πάνω δεξιά το «Μετάβαση σε πελάτη». */

export const unstable_settings = { initialRouteName: 'today' };

export default function BizTabs() {
  const wide = useWide();
  const switchTo = useSwitchTo();
  const extra = { icon: 'swap' as const, label: 'Μετάβαση σε πελάτη', onPress: () => switchTo('client'), apart: true };
  return (
    <Tabs tabBar={(p) => (wide ? <Sidebar items={BIZ_TABS} {...p} /> : <FloatBar items={BIZ_TABS} {...p} labels extra={extra} />)}
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
      <Tabs.Screen name="page" options={{ title: 'Κατάστημα' }} />
      <Tabs.Screen name="team" options={{ title: 'Ομάδα' }} />
      {/* Ομάδα και Ρυθμίσεις: δεν φαίνονται στη μπάρα (FloatBar/Sidebar δείχνουν μόνο ό,τι έχει το BIZ_TABS)· ανοίγουν από το «Κατάστημα». */}
      <Tabs.Screen name="shop-settings" options={{ title: 'Ρυθμίσεις καταστήματος' }} />
    </Tabs>
  );
}
