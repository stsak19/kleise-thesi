import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { C, catLabel, price } from '../../../lib/ui';
import { useWide } from '../../../lib/wide';
import { RATINGS, STATUS, adminActions, ago, longDate, nameOf, short, rating, useAdmin } from '../../../lib/admin/data';
import { Box, Cols, KV, Lead, Line, Loading, Page, ShopTag, Small, Tag } from '../../../lib/admin/parts';

/* Καρτέλα καταστήματος: στοιχεία, ιδιοκτήτης, ενέργειες, τελευταίες κρατήσεις, κριτικές, ιστορικό admin. */
export default function Shop() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wide = useWide();
  const { data: b, error, reload } = useAdmin<any>('admin_business', { p_id: id });
  if (!b) return <Page title="Κατάστημα" eyebrow={<Crumb />}><Loading error={error} /></Page>;
  const total = (b.bookings_30 ?? 0) + (b.cancelled_30 ?? 0);
  const rate = total ? Math.round((100 * b.cancelled_30) / total) : 0;
  const gone = () => router.replace('/admin/shops');
  return (
    <Page eyebrow={<Crumb />} title={b.name} right={<>
      <ShopTag b={b} />
      <Small title="Σελίδα καταστήματος" onPress={() => router.push(`/store/${b.id}` as any)} />
      {b.owner && <Small title="Μήνυμα στον ιδιοκτήτη" onPress={() => adminActions.message(b.owner, reload)} />}
      <Small title={b.suspended ? 'Ενεργοποίηση' : 'Αναστολή'} danger={!b.suspended} onPress={() => adminActions.suspendBiz(b, reload)} />
      <Small title="Διαγραφή" danger onPress={() => adminActions.deleteBiz(b, gone)} />
    </>}>
      {b.suspended && (
        <View style={{ backgroundColor: '#ffe9ed', borderRadius: 14, padding: 14 }}>
          <Text style={{ color: C.bad, fontWeight: '800' }}>Σε αναστολή: δεν φαίνεται στους πελάτες και δεν δέχεται κρατήσεις.{b.suspend_reason ? ` Λόγος: ${b.suspend_reason}` : ''}</Text>
        </View>
      )}
      <Cols
        main={<>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
            <Box title="Στοιχεία" style={{ flex: 1 }}>
              <KV k="Είδος" v={catLabel(b.category)} />
              <KV k="Διεύθυνση" v={[b.address, b.city].filter(Boolean).join(', ')} />
              <KV k="Τηλέφωνο" v={b.phone || '–'} />
              <KV k="Από" v={longDate(b.created_at)} last />
            </Box>
            <Box title="Αριθμοί" style={{ flex: 1 }}>
              <KV k="Κρατήσεις 30 ημ." v={String(b.bookings_30)} />
              <KV k="Ακυρώσεις 30 ημ." v={total ? `${rate}%` : '–'} color={rate >= 30 ? C.bad : undefined} />
              <KV k="Πελάτες" v={String(b.clients)} last={!RATINGS} />
              {RATINGS && <KV k="Βαθμολογία" v={b.rating_avg != null ? `${rating(b.rating_avg)} ★ (${b.rating_count ?? 0})` : '–'} last />}
            </Box>
          </View>
          <Box title="Τελευταίες κρατήσεις">
            {(b.bookings ?? []).length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Καμία κράτηση.</Text>}
            {(b.bookings ?? []).slice(0, 25).map((x: any, i: number, a: any[]) => (
              <Line key={x.id} last={i === a.length - 1} title={`${x.service} · ${x.user ?? 'Πελάτης'}`} sub={`${short(x.date)} · ${String(x.time).slice(0, 5)}`}
                right={<><Tag text={STATUS[x.status]?.label ?? x.status} tone={STATUS[x.status]?.tone} />
                  {x.status === 'booked' && <Small title="Ακύρωση" onPress={() => adminActions.cancelBooking(x, reload)} />}
                  <Small title="Πελάτης" onPress={() => router.push(`/admin/person/${x.user_id}` as any)} /></>} />
            ))}
          </Box>
        </>}
        side={<>
          <Box title="Ιδιοκτήτης">
            {b.owner ? <Line last lead={<Lead name={nameOf(b.owner)} />} title={nameOf(b.owner)} sub={[b.owner.email, b.owner.phone].filter(Boolean).join(' · ')}
              right={<Small title="Καρτέλα" onPress={() => router.push(`/admin/person/${b.owner.id}` as any)} />} /> : <Text style={{ color: C.mute }}>–</Text>}
          </Box>
          <Box title={`Υπηρεσίες · ${(b.services ?? []).length}`}>
            {(b.services ?? []).length === 0 && <Text style={{ color: C.mute, paddingVertical: 6 }}>Καμία υπηρεσία.</Text>}
            {(b.services ?? []).slice(0, 12).map((x: any, i: number, a: any[]) => (
              <KV key={i} last={i === a.length - 1} k={x.name + (x.active ? '' : ' (ανενεργή)')} v={[x.duration_min && `${x.duration_min}′`, price(x.price_cents)].filter(Boolean).join(' · ') || '–'} />
            ))}
            {(b.staff ?? []).length > 0 && <Text style={{ color: C.mute, fontWeight: '600', fontSize: 13, marginTop: 8 }}>Ομάδα: {(b.staff ?? []).map((x: any) => x.name).join(', ')}</Text>}
          </Box>
          {RATINGS && <Box title="Κριτικές">
            {(b.reviews ?? []).length === 0 && <Text style={{ color: C.mute, paddingVertical: 6 }}>Καμία κριτική.</Text>}
            {(b.reviews ?? []).slice(0, 10).map((r: any, i: number, a: any[]) => (
              <Line key={r.id} last={i === a.length - 1} title={`★ ${r.stars} · ${r.user ?? 'Πελάτης'}`} sub={r.comment ? `«${r.comment}»` : ago(r.created_at)}
                right={<Small title="Διαγραφή" danger onPress={() => adminActions.deleteReview(r, reload)} />} />
            ))}
          </Box>}
          {(b.log ?? []).length > 0 && (
            <Box title="Ιστορικό ενεργειών admin">
              {b.log.map((l: any, i: number) => <Line key={i} last={i === b.log.length - 1} title={l.action} sub={[l.note, ago(l.created_at)].filter(Boolean).join(' · ')} />)}
            </Box>
          )}
        </>} />
    </Page>
  );
}

function Crumb() {
  const router = useRouter();
  return <Text onPress={() => router.navigate('/admin/shops')} style={{ color: C.mute, fontWeight: '700', fontSize: 15 }}>Καταστήματα /</Text>;
}
