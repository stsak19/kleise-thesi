import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SettingsPhone } from '../../../lib/owner/settings';
import { useWide } from '../../../lib/owner/desk';
import { s } from '../../../lib/ui';

/* Ρυθμίσεις καταστήματος στο κινητό: όλες οι ενότητες σε μία σελίδα.
   Στον υπολογιστή πάνε στις «Ρυθμίσεις» μέσα στο πλαϊνό μενού (app/(biz)/(hub)/shop-settings.tsx). */
export default function Setup() {
  const wide = useWide();
  const router = useRouter();
  useEffect(() => { if (wide) router.replace('/shop-settings?s=services'); }, [wide]);
  if (wide) return <View style={s.screen} />;
  return <SettingsPhone />;
}
