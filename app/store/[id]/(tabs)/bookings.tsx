import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../../lib/Txt';
import { C, Section, s, shadow } from '../../../../lib/ui';
import { PastPills, PastRows, Segmented } from '../../../../lib/bookings/parts';
import { Hero } from '../../../../lib/bookings/Upcoming';
import { AllLink, BookingRow, PackCard, WaitRow } from '../../../../lib/bookings/cards';
import { useStore } from '../../../../lib/store/data';
import { StoreTop } from '../../../../lib/store/parts';

/* Οι κρατήσεις μου σε αυτό το κατάστημα: το πακέτο, οι επερχόμενες, η αναμονή και το ιστορικό.
   Ίδιες κάρτες με τη γενική λίστα «Κρατήσεις» (lib/bookings/cards), μόνο που εδώ φαίνονται μόνο του καταστήματος,
   και στο τέλος υπάρχει σύνδεσμος προς όλες τις κρατήσεις σε κάθε κατάστημα. */
export default function StoreBookings() {
  const S = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<'next' | 'past'>('next');
  const [busy, setBusy] = useState(false);
  const refresh = async () => { setBusy(true); await S.reload(); setBusy(false); };
  const color = S.st?.color ?? C.accent;
  const [next, ...rest] = S.upcoming;
  const n = S.upcoming.length + S.waits.length;

  const Empty = ({ text }: { text: string }) => (
    <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 28 }}>🗓️</Text>
      <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center' }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title="Οι κρατήσεις μου" />
      <ScrollView contentContainerStyle={[s.pad, { paddingTop: 14 }]} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}>
        <Segmented value={tab} onChange={setTab} items={[{ key: 'next', label: 'Επερχόμενες', count: n, alert: true }, { key: 'past', label: 'Ιστορικό', count: S.past.length }]} />

        {tab === 'next' ? <>
          {!!S.packInfo && <>
            <Section title="Το πακέτο σου" />
            <PackCard name={S.biz?.name ?? ''} biz={S.biz} color={color} p={S.packInfo} />
          </>}
          {n === 0 && <Empty text="Δεν έχεις κλείσει ώρα εδώ. Διάλεξε μία από την Κράτηση." />}
          {!!next && <>
            {!!S.packInfo && <Section title="Η επόμενη κράτηση" />}
            <Hero b={next} biz={S.biz} color={color} onCancel={() => S.cancelBooking(next)} />
          </>}
          {rest.length > 0 && <>
            <View style={[s.row, { marginTop: 10 }]}>
              <Text style={[s.h, { flex: 1 }]}>Προγραμματισμένα</Text>
              <Text style={{ color: C.mute, fontWeight: '600' }}>{rest.length}</Text>
            </View>
            {rest.map((b) => <BookingRow key={b.id} b={b} color={color} onCancel={() => S.cancelBooking(b)} />)}
          </>}
          {S.waits.length > 0 && <>
            <Section title="Σε αναμονή" />
            {S.waits.map((w) => <WaitRow key={w.id} w={w} onLeave={() => S.leave(w)} />)}
          </>}
        </> : <>
          {S.past.length === 0 ? <Empty text="Δεν υπάρχουν παλιές κρατήσεις ακόμα." /> : (
            <View style={[s.card, shadow(1), { paddingTop: 0, gap: 0 }]}>
              <PastPills items={S.past} />
              <PastRows items={S.past} color={color} />
            </View>
          )}
        </>}

        <View style={{ marginTop: 14, gap: 8 }}>
          <AllLink text="Κρατήσεις σε όλα τα καταστήματα" onPress={() => router.navigate('/bookings')} />
          {!!S.packInfo && <AllLink icon="pack" text="Πακέτα σε όλα τα καταστήματα" onPress={() => router.navigate('/packs')} />}
        </View>
      </ScrollView>
    </View>
  );
}
