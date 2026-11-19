import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from './Txt';
import { C, Icon, alpha } from './ui';

/* Πολιτική απορρήτου: το κείμενο, και ένα αιωρούμενο παράθυρο που ανοίγει από όπου κι αν είσαι (openPrivacy())
   χωρίς να αλλάζει η σελίδα από πίσω. Η σελίδα /privacy μένει για τον δημόσιο σύνδεσμο που ζητούν τα stores.
   ΠΡΙΝ ΤΗΝ ΚΥΚΛΟΦΟΡΙΑ: το κείμενο να ελεγχθεί και το email επικοινωνίας να γίνει το πραγματικό. */
export const CONTACT_EMAIL = 'support@spoton.gr';
export const PRIVACY_UPDATED = '16/11/2026';

const PARTS: [string, string][] = [
  ['Τι κρατάμε', 'Όνομα, email, τηλέφωνο (αν το δώσεις) και τις κρατήσεις, τα πακέτα και τα μηνύματά σου, ώστε να κλείνεις ραντεβού και να σε ενημερώνει το κατάστημα. Αν έχεις επιχείρηση, κρατάμε και τα στοιχεία, τις υπηρεσίες, το ωράριο και την ομάδα της.'],
  ['Ποιος τα βλέπει', 'Μόνο τα καταστήματα στα οποία κλείνεις, και μόνο ό,τι χρειάζονται για το ραντεβού (όνομα, τηλέφωνο, ιστορικό κρατήσεων εκεί). Δεν πουλάμε και δεν δίνουμε δεδομένα σε τρίτους για διαφήμιση.'],
  ['Ειδοποιήσεις', 'Σου στέλνουμε μόνο όσες έχεις ανοιχτές στο Προφίλ → Ρυθμίσεις → Ειδοποιήσεις. Τα μηνύματα καταστημάτων (προσφορές) είναι κλειστά αν δεν τα ανοίξεις εσύ.'],
  ['Πού φυλάσσονται', 'Σε ασφαλείς servers της Supabase, με κρυπτογράφηση στη μεταφορά και στην αποθήκευση. Ο κωδικός σου δεν αποθηκεύεται ποτέ ως κείμενο.'],
  ['Πόσο τα κρατάμε', 'Όσο έχεις λογαριασμό. Όταν κάνεις αίτηση διαγραφής, τα στοιχεία σου σβήνονται οριστικά σε 7 μέρες (ως τότε μπορείς να την ακυρώσεις), εκτός από όσα πρέπει να κρατηθούν από τον νόμο.'],
  ['Τα δικαιώματά σου', 'Μπορείς να δεις, να αλλάξεις ή να σβήσεις τα στοιχεία σου όποτε θέλεις από το Προφίλ, ή να ζητήσεις αντίγραφό τους στο email παρακάτω (Γενικός Κανονισμός Προστασίας Δεδομένων, GDPR).'],
  ['Επικοινωνία', CONTACT_EMAIL],
];

/* Το κείμενο, χωρίς πλαίσιο: το χρησιμοποιούν η σελίδα /privacy και το παράθυρο. */
export function PrivacyBody() {
  return <>{PARTS.map(([h, t]) => (
    <View key={h} style={{ gap: 4 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{h}</Text>
      <Text style={{ color: C.mute, fontSize: 15, lineHeight: 22 }}>{t}</Text>
    </View>
  ))}</>;
}

let open = false;
const subs = new Set<(v: boolean) => void>();
const set = (v: boolean) => { if (v !== open) { open = v; subs.forEach((f) => f(v)); } };
/* Ανοίγει το παράθυρο της πολιτικής απορρήτου πάνω από ό,τι βλέπεις (και πάνω από το παράθυρο σύνδεσης). */
export const openPrivacy = () => set(true);

/* Μία φορά στη ρίζα της εφαρμογής (app/_layout). Κινητό: φύλλο από κάτω. Υπολογιστής: κάρτα στη μέση. */
export function PrivacyModal() {
  const [v, setV] = useState(open);
  useEffect(() => { subs.add(setV); return () => { subs.delete(setV); }; }, []);
  const close = () => set(false);
  return (
    <Modal visible={v} transparent animationType="fade" onRequestClose={close}>
      <Pressable onPress={close} accessibilityLabel="Κλείσιμο" style={{ flex: 1, backgroundColor: alpha('#000000', 0.45), alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 560, maxHeight: '88%', backgroundColor: C.bg, borderRadius: 24, overflow: 'hidden',
          boxShadow: `0px 24px 60px ${alpha('#000000', 0.3)}` }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 21, letterSpacing: -0.4 }}>Πολιτική απορρήτου</Text>
              <Text style={{ color: C.mute, fontSize: 13 }}>Τελευταία ενημέρωση {PRIVACY_UPDATED}</Text>
            </View>
            <Pressable onPress={close} accessibilityLabel="Κλείσιμο" hitSlop={8}
              style={({ hovered }: any) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: hovered ? C.line : C.soft })}>
              <Icon name="close" size={15} color={C.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
            <PrivacyBody />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
