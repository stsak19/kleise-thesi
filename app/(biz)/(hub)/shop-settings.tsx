import { useLocalSearchParams } from 'expo-router';
import { SECTIONS, SettingsDesk, type SectionKey } from '../../../lib/owner/settings';

/* Ρυθμίσεις καταστήματος στον υπολογιστή: μία ενότητα τη φορά (?s=details|services|hours|rules|look).
   Ανοίγουν από τη λίστα της σελίδας «Κατάστημα» (όχι από το πλαϊνό μενού). */
export default function Settings() {
  const { s } = useLocalSearchParams<{ s?: string }>();
  const key = (SECTIONS.some((x) => x.key === s) ? s : 'services') as SectionKey;
  return <SettingsDesk key={key} section={key} />;
}
