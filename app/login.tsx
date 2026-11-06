import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import LoginScreen from '../lib/login/LoginScreen';
import { Text } from '../lib/Txt';
import { C, Icon } from '../lib/ui';
import { GUEST_OK, setReturnTo } from '../lib/guest';

/* Σύνδεση / εγγραφή: κινούμενο καλωσόρισμα με δύο επιλογές και μετά η φόρμα σε δική της οθόνη.
   Η λογική είναι στο lib/login/useLogin.ts. Στην ιστοσελίδα ο επισκέπτης μπορεί να γυρίσει στα καταστήματα χωρίς σύνδεση. */
export default function Login() {
  const router = useRouter();
  const narrow = useWindowDimensions().width < 600; // στο κινητό κάτω από το λογότυπο
  const back = () => { setReturnTo(null); router.canGoBack() ? router.back() : router.replace('/'); };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LoginScreen />
      {GUEST_OK && (
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Πίσω στα καταστήματα"
          style={({ pressed, hovered }: any) => ({ position: 'absolute', top: narrow ? 64 : 14, right: 16, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 6,
            height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, opacity: pressed || hovered ? 0.8 : 1 })}>
          <Icon name="store" size={15} color={C.text} />
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>Δες τα καταστήματα</Text>
        </Pressable>
      )}
    </View>
  );
}
