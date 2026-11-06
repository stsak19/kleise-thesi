import { ScrollView } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { SettingsBody } from '../../../lib/profile/Settings';
import { s } from '../../../lib/ui';
import { deskCol, useWide } from '../../../lib/wide';

/* Ρυθμίσεις εφαρμογής: εμφάνιση (ανοιχτή/σκούρα), κίνηση, κωδικός, ξενάγηση. */
export default function Settings() {
  const router = useRouter();
  // Ανοίγει και από τη λειτουργία επιχείρησης (/app-settings), όπου τα στοιχεία είναι στο /account.
  const me = usePathname().startsWith('/app-settings') ? '/account' : '/me';
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 4 }, deskCol(useWide(), 680)]} keyboardShouldPersistTaps="handled">
      <SettingsBody onEdit={() => router.push(me)} />
    </ScrollView>
  );
}
