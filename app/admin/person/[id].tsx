import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { C } from '../../../lib/ui';
import { useWide } from '../../../lib/wide';
import { STATUS, adminActions, ago, daysLeft, longDate, nameOf, short, useAdmin } from '../../../lib/admin/data';
import { Box, Cols, KV, Lead, Line, Loading, Page, Small, State, Tag } from '../../../lib/admin/parts';

/* Καρτέλα λογαριασμού: όλα μαζί (κρατήσεις, πακέτα, καταστήματα, κριτικές, πώς τον βαθμολόγησαν) και οι ενέργειες. */
export default function PersonCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wide = useWide();
  const { data: u, error, reload } = useAdmin<any>('admin_user', { p_user: id });
  const [tab, setTab] = useState('sum');
  if (!u) return <Page title="Λογαριασμός" eyebrow={<Crumb />}><Loading error={error} /></Page>;
  const bk = u.bookings ?? [];
  const noShows = bk.filter((x: any) => x.status === 'no_show').length;
  const rated = u.rated ?? [];
  const avgRated = rated.length ? (rated.reduce((a: number, r: any) => a + r.stars, 0) / rated.length).toFixed(1).replace('.', ',') : null;
  const tabs = [
    { key: 'sum', label: 'Σύνοψη' }, { key: 'bk', label: `Κρατήσεις ${bk.length}` }, { key: 'pk', label: `Πακέτα ${(u.packages ?? []).length}` },
    { key: 'rv', label: `Κριτικές που έγραψε ${(u.reviews ?? []).length}` }, { key: 'rt', label: `Βαθμολογίες από καταστήματα ${rated.length}` },
    { key: 'sh', label: `Καταστήματα ${(u.businesses ?? []).length}` },
  ];
  const gone = () => router.replace('/admin/people');
  const bookingLine = (x: any, i: number, a: any[]) => (
    <Line key={x.id} last={i === a.length - 1} lead={<Lead name={x.business} color={x.brand_color} />} title={`${x.business} · ${x.service}`}
      sub={`${short(x.date)} · ${String(x.time).slice(0, 5)}`} onPress={() => router.push(`/admin/shop/${x.business_id}` as any)}
      right={<><Tag text={STATUS[x.status]?.label ?? x.status} tone={STATUS[x.status]?.tone} />
        {x.status === 'booked' && <Small title="Ακύρωση" onPress={() => adminActions.cancelBooking(x, reload)} />}</>} />
  );
  const empty = (t: string) => <Text style={{ color: C.mute, paddingVertical: 10 }}>{t}</Text>;
  return (
    <Page eyebrow={<Crumb />} title={nameOf(u)} right={<>
      <State u={u} />
      {noShows >= 3 && <Tag text={`${noShows} «δεν ήρθε»`} color="#b07600" />}
      {!u.is_admin && <>
        <Small title="Μήνυμα" onPress={() => adminActions.message(u, reload)} />
        <Small title={u.suspended ? 'Άρση αναστολής' : 'Αναστολή λογαριασμού'} danger={!u.suspended} onPress={() => adminActions.suspendUser(u, reload)} />
        <Small title="Διαγραφή" danger onPress={() => adminActions.deleteUser(u, gone)} />
      </>}
    </>}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: wide ? 22 : 14, borderBottomWidth: 1, borderBottomColor: C.line }}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: tab === t.key ? C.text : 'transparent', marginBottom: -1 }}>
            <Text style={{ color: tab === t.key ? C.text : C.mute, fontWeight: '700', fontSize: 14 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {u.suspended && <Banner text={`Σε αναστολή: δεν μπορεί να κλείνει νέα ραντεβού.${u.suspend_reason ? ` Λόγος: ${u.suspend_reason}` : ''}`} />}
      {u.delete_requested_at && (
        <View style={{ backgroundColor: '#fff4dc', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Text style={{ color: '#7a5200', fontWeight: '800', flex: 1 }}>Έκανε αίτηση διαγραφής · σβήνεται σε {daysLeft(new Date(new Date(u.delete_requested_at).getTime() + 7 * 864e5).toISOString())} μέρες</Text>
          <Small title="Ακύρωση αίτησης" onPress={() => adminActions.cancelDeletion(u, reload)} />
        </View>
      )}
      {tab === 'sum' ? (
        <Cols
          main={<>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
              <Box title="Στοιχεία" style={{ flex: 1 }}>
                <KV k="Email" v={u.email ?? '–'} />
                <KV k="Τηλέφωνο" v={u.phone || '–'} />
                <KV k="Μέλος από" v={longDate(u.created_at)} />
                <KV k="Τελευταία σύνδεση" v={u.last_sign_in_at ? ago(u.last_sign_in_at) : '–'} last />
              </Box>
              <Box title="Αριθμοί" style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 22, paddingTop: 6, flexWrap: 'wrap' }}>
                  <Big n={String(bk.filter((x: any) => x.status !== 'cancelled').length)} label="κρατήσεις" />
                  <Big n={String(noShows)} label="δεν ήρθε" bad={noShows > 0} />
                  <Big n={avgRated ? `${avgRated}★` : '–'} label="από καταστήματα" />
                </View>
              </Box>
            </View>
            <Box title="Πρόσφατες κρατήσεις" action={bk.length > 6 ? 'Όλες' : undefined} onAction={() => setTab('bk')}>
              {bk.length === 0 && empty('Καμία κράτηση.')}
              {bk.slice(0, 6).map(bookingLine)}
            </Box>
          </>}
          side={<>
            {(u.businesses ?? []).length > 0 && (
              <Box title="Καταστήματα που έχει">
                {u.businesses.map((b: any, i: number) => <Line key={b.id} last={i === u.businesses.length - 1} lead={<Lead name={b.name} />} title={b.name} sub={b.city}
                  onPress={() => router.push(`/admin/shop/${b.id}` as any)} right={<Small title="Άνοιγμα" onPress={() => router.push(`/admin/shop/${b.id}` as any)} />} />)}
              </Box>
            )}
            <Box title="Ιστορικό ενεργειών admin">
              {(u.log ?? []).length === 0 && empty('Καμία ενέργεια.')}
              {(u.log ?? []).map((l: any, i: number) => <Line key={i} last={i === u.log.length - 1} title={l.action} sub={[l.note, l.by, ago(l.created_at)].filter(Boolean).join(' · ')} />)}
              <Line last title="Δημιουργία λογαριασμού" sub={longDate(u.created_at)} />
            </Box>
            <Box title="Κριτικές που έγραψε">
              {(u.reviews ?? []).length === 0 && empty('Καμία κριτική.')}
              {(u.reviews ?? []).slice(0, 5).map((r: any, i: number, a: any[]) => <Line key={r.id} last={i === a.length - 1} title={`★ ${r.stars} · ${r.business}`}
                sub={r.comment ? `«${r.comment}»` : ago(r.created_at)} right={<Small title="Διαγραφή" danger onPress={() => adminActions.deleteReview(r, reload)} />} />)}
            </Box>
          </>} />
      ) : (
        <Box>
          {tab === 'bk' && (bk.length ? bk.map(bookingLine) : empty('Καμία κράτηση.'))}
          {tab === 'pk' && ((u.packages ?? []).length ? u.packages.map((p: any, i: number) => <Line key={i} last={i === u.packages.length - 1} title={p.business}
            sub={[p.pack_name, `${p.credits} επισκέψεις`, p.status === 'pending' ? 'περιμένει έγκριση' : p.status === 'blocked' ? 'μπλοκαρισμένος' : null].filter(Boolean).join(' · ')}
            onPress={() => router.push(`/admin/shop/${p.business_id}` as any)} />) : empty('Κανένα πακέτο.'))}
          {tab === 'rv' && ((u.reviews ?? []).length ? u.reviews.map((r: any, i: number) => <Line key={r.id} last={i === u.reviews.length - 1} title={`★ ${r.stars} · ${r.business}`}
            sub={r.comment ? `«${r.comment}»` : ago(r.created_at)} right={<Small title="Διαγραφή" danger onPress={() => adminActions.deleteReview(r, reload)} />} />) : empty('Καμία κριτική.'))}
          {tab === 'rt' && (rated.length ? rated.map((r: any, i: number) => <Line key={i} last={i === rated.length - 1} title={`★ ${r.stars} · ${r.business}`}
            sub={r.note ? `«${r.note}»` : ago(r.created_at)} />) : empty('Κανένα κατάστημα δεν έχει βάλει βαθμολογία.'))}
          {tab === 'sh' && ((u.businesses ?? []).length ? u.businesses.map((b: any, i: number) => <Line key={b.id} last={i === u.businesses.length - 1} lead={<Lead name={b.name} />}
            title={b.name} sub={b.city} onPress={() => router.push(`/admin/shop/${b.id}` as any)}
            right={b.suspended ? <Tag text="Σε αναστολή" tone="bad" /> : b.is_published ? <Tag text="Δημοσιευμένο" tone="ok" /> : <Tag text="Πρόχειρο" />} />) : empty('Δεν έχει κατάστημα.'))}
        </Box>
      )}
    </Page>
  );
}

const Big = ({ n, label, bad }: { n: string; label: string; bad?: boolean }) => (
  <View>
    <Text style={{ color: bad ? C.bad : C.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.6 }}>{n}</Text>
    <Text style={{ color: C.mute, fontWeight: '600', fontSize: 13 }}>{label}</Text>
  </View>
);
const Banner = ({ text }: { text: string }) => (
  <View style={{ backgroundColor: '#ffe9ed', borderRadius: 14, padding: 14 }}><Text style={{ color: C.bad, fontWeight: '800' }}>{text}</Text></View>
);
function Crumb() {
  const router = useRouter();
  return <Text onPress={() => router.navigate('/admin/people')} style={{ color: C.mute, fontWeight: '700', fontSize: 15 }}>Πελάτες /</Text>;
}
