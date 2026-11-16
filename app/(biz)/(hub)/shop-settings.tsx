import { useLocalSearchParams } from 'expo-router';
import { SECTIONS, SettingsDesk, type SectionKey } from '../../../lib/owner/settings';

/* Ρυθμίσεις καταστήματος στον υπολογιστή: μία ενότητα τη φορά (?s=details|services|hours|rules|look).
   Οι ενότητες φαίνονται στο πλαϊνό μενού κάτω από το «Κατάστημα». */
export default function Settings() {
  const { s } = useLocalSearchParams<{ s?: string }>();
  const key = (SECTIONS.some((x) => x.key === s) ? s : 'services') as SectionKey;
  return <SettingsDesk key={key} section={key} />;
}
