import { router } from 'expo-router';
import { Page } from '../lib/account/Page';
import { PasswordForm } from '../lib/profile/Settings';
import { Card } from '../lib/ui';

/* Νέος κωδικός: εδώ ανοίγει ο σύνδεσμος «Ξέχασες τον κωδικό;» από το email (lib/auth.tsx, PASSWORD_RECOVERY). */
export default function NewPassword() {
  return (
    <Page title="Νέος κωδικός" sub="Διάλεξε τον νέο κωδικό του λογαριασμού σου.">
      <Card><PasswordForm onDone={() => setTimeout(() => router.replace('/'), 600)} /></Card>
    </Page>
  );
}
