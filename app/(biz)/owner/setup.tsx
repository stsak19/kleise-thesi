import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SECTIONS, SettingsPhone, sectionLabel, type SectionKey } from '../../../lib/owner/settings';
import { useMyBiz } from '../../../lib/owner/hub';
import { useWide } from '../../../lib/owner/desk';
import { s } from '../../../lib/ui';

/* Ρυθμίσεις καταστήματος στο κινητό: μία ενότητα τη φορά (?s=details|hours|services|rules|look), όπως ανοίγουν
   από τη σελίδα «Κατάστημα». Στον υπολογιστή πάνε στις «Ρυθμίσεις» μέσα στο πλαϊνό μενού (app/(biz)/(hub)/shop-settings.tsx). */
export default function Setup() {
  const wide = useWide();
  const router = useRouter();
  const { s: q } = useLocalSearchParams<{ s?: string }>();
  const biz = useMyBiz();
  const key = SECTIONS.some((x) => x.key === q) ? (q as SectionKey) : undefined;
  useEffect(() => { if (wide) router.replace(`/shop-settings?s=${key ?? 'services'}`); }, [wide]);
  if (wide) return <View style={s.screen} />;
  return <>
    <Stack.Screen options={{ title: key ? sectionLabel(key, biz?.category) : 'Ρυθμίσεις καταστήματος' }} />
    <SettingsPhone key={key ?? 'all'} section={key} />
  </>;
}
