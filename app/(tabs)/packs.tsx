import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../../lib/Txt';
import { C, Card, Empty, Icon, Pill, ScreenHeader, alpha, catLabel, fmtDay, s, shadow } from '../../lib/ui';
import { useMyBookings } from '../../lib/bookings/data';
import { BizLogo } from '../../lib/bookings/parts';
import { deskCol, useWide } from '../../lib/wide';

/* Πακέτα: τα καρνέ του χρήστη ανά κατάστημα, με τις κρατήσεις που απομένουν και τη λήξη. */
export default function Packs() {
  const D = useMyBookings();
  const n = D.packs.length;
  const wide = useWide();
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }, wide && { paddingBottom: 60 }, deskCol(wide)]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <View style={{ marginHorizontal: -20, marginTop: wide ? 12 : 0 }}>
        <ScreenHeader title="Πακέτα" sub={n ? `${n} ${n === 1 ? 'πακέτο' : 'πακέτα'}` : undefined} />
      </View>
      {D.ready && n === 0 && (
        <Card><Empty icon="pack" title="Δεν έχεις πακέτα" text="Όταν αγοράσεις καρνέ σε ένα κατάστημα, θα το βλέπεις εδώ μαζί με τις κρατήσεις που σου απομένουν."
          action="Βρες κατάστημα" onAction={D.find} /></Card>
      )}
      {D.packs.map((m: any) => {
        const c = D.color(m), biz = D.biz[m.business_id], pending = m.status === 'pending';
        return (
          <Pressable key={m.business_id} onPress={() => D.open(m)} style={({ pressed }) => [s.card, shadow(1),
            { padding: 0, gap: 0, overflow: 'hidden', transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
            <View style={{ height: 6, backgroundColor: c }} />
            <View style={[s.row, { gap: 12, padding: 14 }]}>
              <BizLogo biz={biz} name={m.business} color={c} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{m.business}</Text>
                {!!biz && <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{catLabel(biz.category)}</Text>}
              </View>
              {pending ? <Pill text="Σε αναμονή" tone="accent" /> : (
                <View style={{ alignItems: 'center', minWidth: 54, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 13, backgroundColor: alpha(c, 0.12) }}>
                  <Text style={{ color: c, fontWeight: '900', fontSize: 20, letterSpacing: -0.5 }}>{m.credits}</Text>
                  <Text style={{ color: c, fontWeight: '700', fontSize: 10 }}>{m.credits === 1 ? 'ΚΡΑΤΗΣΗ' : 'ΚΡΑΤΗΣΕΙΣ'}</Text>
                </View>
              )}
            </View>
            <View style={[s.row, { gap: 6, paddingHorizontal: 14, paddingBottom: 14 }]}>
              <Icon name="clock" size={15} color={C.mute} />
              <Text style={{ color: C.mute, fontSize: 14, flex: 1 }}>{pending ? 'Περιμένει έγκριση από το κατάστημα' : `Ισχύει έως ${fmtDay(m.expires)}`}</Text>
              <Icon name="chevron" size={14} color={C.mute} />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
