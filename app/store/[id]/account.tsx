import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { C, Group, Row } from '../../../lib/ui';
import { usePerson } from '../../../lib/profile/data';
import { Initials } from '../../../lib/profile/parts';
import { useStore } from '../../../lib/store/data';
import { deskCol, useWide } from '../../../lib/wide';

/* Ο λογαριασμός μου μέσα στο κατάστημα: ανοίγει από τα αρχικά πάνω δεξιά (δεν είναι πια καρτέλα).
   Τα στοιχεία και οι Ρυθμίσεις του SpotOn όπως είναι, και η επιστροφή στο SpotOn. */
export default function StoreAccount() {
  const S = useStore();
  const router = useRouter();
  const P = usePerson();
  const wide = useWide();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={[{ padding: 20, gap: 14 }, deskCol(wide, 560)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Initials text={P.initials} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 20 }} numberOfLines={1}>{P.name || 'Ο λογαριασμός μου'}</Text>
          <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{P.email}</Text>
        </View>
      </View>
      <Group>
        <Row icon="user" title="Τα στοιχεία μου" sub="Όνομα, τηλέφωνο" onPress={() => router.push(`/store/${S.id}/me`)} />
        <Row icon="gear" title="Ρυθμίσεις" sub="Εμφάνιση, ειδοποιήσεις, κωδικός" onPress={() => router.push(`/store/${S.id}/settings`)} />
        <Row icon="back" title="Επιστροφή στο SpotOn" last onPress={() => router.replace('/')} />
      </Group>
    </ScrollView>
  );
}
