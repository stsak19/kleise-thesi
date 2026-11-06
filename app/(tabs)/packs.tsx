import { RefreshControl, ScrollView, View } from 'react-native';
import { Card, Empty, ScreenHeader, s } from '../../lib/ui';
import { useMyBookings } from '../../lib/bookings/data';
import { PackCard, packInfo } from '../../lib/bookings/cards';
import { deskCol, useWide } from '../../lib/wide';

/* Πακέτα: τα καρνέ του χρήστη ανά κατάστημα, με τις κρατήσεις που απομένουν και τη λήξη. */
export default function Packs() {
  const D = useMyBookings();
  const n = D.packs.length;
  const wide = useWide();
  const all = [...D.upcoming, ...D.past];
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }, wide && { paddingBottom: 60 }, deskCol(wide)]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <View style={{ marginHorizontal: -20, marginTop: wide ? 12 : 0 }}>
        <ScreenHeader title="Πακέτα" sub={n ? `${n} ${n === 1 ? 'πακέτο' : 'πακέτα'}` : undefined} />
      </View>
      {D.ready && n === 0 && (
        <Card><Empty icon="pack" title="Δεν έχεις πακέτα" text="Όταν αγοράσεις καρνέ σε ένα κατάστημα, θα το βλέπεις εδώ μαζί με τις κρατήσεις που σου απομένουν."
          action="Βρες κατάστημα" onAction={D.find} /></Card>
      )}
      {D.packs.map((m: any) => (
        <PackCard key={m.business_id} name={m.business} biz={D.biz[m.business_id]} color={D.color(m)} p={packInfo(m, D.biz[m.business_id], all)} onPress={() => D.open(m)} />
      ))}
    </ScrollView>
  );
}
