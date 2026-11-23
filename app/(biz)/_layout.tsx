import { View } from 'react-native';
import { Stack, useSegments } from 'expo-router';
import { stackOptions } from '../../lib/stack';
import { BIZ_TABS, StaticSidebar, useWide } from '../../lib/owner/desk';
import { ToClientTopButton } from '../../lib/MyBiz';
import { C } from '../../lib/ui';

/* Λειτουργία επιχείρησης: οι καρτέλες της (hub) και, από πάνω τους, οι οθόνες επεξεργασίας χωρίς κάτω μπάρα. */
export const unstable_settings = { initialRouteName: '(hub)' };

/* Σε ποια καρτέλα του πλαϊνού μενού ανήκει κάθε οθόνη που ανοίγει από πάνω (για να φαίνεται επιλεγμένη). */
const UNDER: Record<string, string> = { client: 'clients', recipients: 'inbox', plans: 'page', setup: 'page', style: 'page', qr: 'page', stats: 'page' };

export default function BizStack() {
  const wide = useWide();
  const seg = useSegments() as string[];
  // Υπολογιστής: οι οθόνες πάνω από τις καρτέλες κρατούν το πλαϊνό μενού αριστερά (οι καρτέλες έχουν ήδη το δικό τους).
  const over = wide && seg[0] === '(biz)' && seg[1] !== '(hub)';
  const here = seg[seg.length - 1] ?? '';
  const stack = (
    <Stack screenOptions={{ ...stackOptions(), ...(over ? { headerRight: () => <View style={{ paddingRight: 24 }}><ToClientTopButton /></View>, headerLeftContainerStyle: { paddingLeft: 12 }, animation: 'none' as const } : null) }}>
      <Stack.Screen name="(hub)" options={{ headerShown: false }} />
      <Stack.Screen name="owner/setup" options={{ title: 'Ρυθμίσεις καταστήματος' }} />
      <Stack.Screen name="owner/style" options={{ title: 'Εμφάνιση σελίδας' }} />
      <Stack.Screen name="owner/plans" options={{ title: 'Πακέτα' }} />
      <Stack.Screen name="owner/client" options={{ title: '' }} />
      <Stack.Screen name="owner/recipients" options={{ title: 'Σε ποιους' }} />
      <Stack.Screen name="owner/qr" options={{ title: 'QR για τον πάγκο' }} />
      <Stack.Screen name="owner/stats" options={{ title: 'Στατιστικά' }} />
      <Stack.Screen name="account" options={{ title: 'Τα στοιχεία μου' }} />
      <Stack.Screen name="app-settings" options={{ title: 'Ρυθμίσεις' }} />
    </Stack>
  );
  // Ίδιο δέντρο πάντα (μόνο το μενού μπαίνει/βγαίνει), για να μη χάνεται η στοίβα όταν ανοίγει μια οθόνη.
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
      {over && <StaticSidebar items={BIZ_TABS} under={UNDER[here]} />}
      <View style={{ flex: 1 }}>{stack}</View>
    </View>
  );
}
