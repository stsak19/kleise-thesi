import { Platform, ScrollView, Share, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { NoBiz, useMyBiz } from '../../../lib/owner/hub';
import { QrCode, downloadQr, printQr, storeUrl } from '../../../lib/owner/QrCode';
import { deskCol, useWide } from '../../../lib/owner/desk';
import { say } from '../../../lib/alert';
import { Btn, C, shadow, s } from '../../../lib/ui';

/* QR για τον πάγκο ή τη βιτρίνα (Κατάστημα → «QR για τον πάγκο»). Ο πελάτης το σκανάρει και ανοίγει η σελίδα κράτησης.
   Το QR έχει τον μόνιμο σύνδεσμο με τον κωδικό του καταστήματος (/store/<uuid>), για να δουλεύει και αν αλλάξει το όνομα·
   από κάτω γράφεται ο σύνδεσμος με το όνομα (/store/<slug>). */
const LINE = 'Σκάναρε και κλείσε ραντεβού online';

export default function StoreQr() {
  const biz = useMyBiz();
  const wide = useWide();
  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;
  const qrUrl = storeUrl(biz.id);
  const nice = storeUrl(biz.slug || biz.id);
  const web = Platform.OS === 'web';
  const share = () => Share.share({ title: biz.name, message: `${biz.name} · κλείσε ραντεβού online\n${nice}`, url: nice }).catch(() => {});
  const print = () => { if (!printQr({ name: biz.name, url: qrUrl, line: LINE })) say('Δεν άνοιξε η εκτύπωση', 'Επίτρεψε τα αναδυόμενα παράθυρα για αυτή τη σελίδα και ξαναπάτα.'); };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 18, alignItems: 'center' }, deskCol(wide)]}>
      <Text style={{ color: C.mute, fontSize: 15, textAlign: 'center' }}>
        Τύπωσέ το για τον πάγκο ή τη βιτρίνα. Οι πελάτες το σκανάρουν με την κάμερα και ανοίγει η σελίδα σου για κράτηση.
      </Text>
      <View style={[{ backgroundColor: C.card, borderRadius: 24, padding: 20, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line }, shadow(2)]}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{biz.name}</Text>
        <Text style={{ color: C.mute, fontSize: 14 }}>{LINE}</Text>
        <View style={{ borderRadius: 12, overflow: 'hidden' }}><QrCode value={qrUrl} size={wide ? 280 : 240} /></View>
        <Text selectable style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{nice.replace(/^https?:\/\//, '')}</Text>
      </View>
      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        {web ? <>
          <Btn icon="share" title="Τύπωσε (A4)" onPress={print} />
          <Btn kind="ghost" title="Κατέβασε την εικόνα (SVG)" onPress={() => downloadQr({ url: qrUrl, file: `spoton-qr-${biz.slug || 'katastima'}.svg` })} />
        </> : <>
          <Btn icon="share" title="Στείλε τον σύνδεσμο" onPress={share} />
          <Text style={{ color: C.mute, fontSize: 13, textAlign: 'center' }}>Για εκτύπωση άνοιξε το SpotOn σε υπολογιστή (Κατάστημα → QR για τον πάγκο).</Text>
        </>}
      </View>
    </ScrollView>
  );
}
