import { Page } from '../lib/account/Page';
import { PRIVACY_UPDATED, PrivacyBody } from '../lib/privacy';

/* Πολιτική απορρήτου ως σελίδα: ο δημόσιος σύνδεσμος .../kleise-thesi/privacy που ζητούν τα stores.
   Μέσα στην εφαρμογή ανοίγει σε αιωρούμενο παράθυρο (lib/privacy · openPrivacy) χωρίς αλλαγή σελίδας. */
export default function Privacy() {
  return (
    <Page title="Πολιτική απορρήτου" sub={`Τελευταία ενημέρωση ${PRIVACY_UPDATED}`}>
      <PrivacyBody />
    </Page>
  );
}
