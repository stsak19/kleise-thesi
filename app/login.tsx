import { useLocalSearchParams } from 'expo-router';
import LoginScreen from '../lib/login/LoginScreen';

/* Σύνδεση / εγγραφή: καλωσόρισμα με δύο επιλογές και μετά η φόρμα σε δική της οθόνη.
   Η λογική είναι στο lib/login/useLogin.ts.
   ΠΡΟΣΩΡΙΝΟ: /login?v=1…4 δείχνει τις κινούμενες εκδοχές του καλωσορίσματος, με μπάρα εναλλαγής κάτω. */
export default function Login() {
  const { v } = useLocalSearchParams<{ v?: string }>();
  const n = v ? Math.max(0, Math.min(4, parseInt(v, 10) || 0)) : undefined;
  return <LoginScreen variant={n} />;
}
