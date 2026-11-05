import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SettingsBody } from '../../../lib/profile/Settings';
import { s } from '../../../lib/ui';

/* Ρυθμίσεις εφαρμογής: εμφάνιση (ανοιχτή/σκούρα), κίνηση, κωδικός, ξενάγηση. */
export default function Settings() {
  const router = useRouter();
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 4 }]} keyboardShouldPersistTaps="handled">
      <SettingsBody onEdit={() => router.push('/me')} />
    </ScrollView>
  );
}
