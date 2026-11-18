import { useState } from 'react';
import { RefreshControl, ScrollView, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../../lib/Txt';
import { Btn, C, TAB_SPACE, s } from '../../../../lib/ui';
import { useAuth } from '../../../../lib/auth';
import { askLogin } from '../../../../lib/guest';
import { Segmented } from '../../../../lib/bookings/parts';
import { BannerCard } from '../../../../lib/bookings/Upcoming';
import { AllLink, PackCard, WaitRow } from '../../../../lib/bookings/cards';
import { BookingLines } from '../../../../lib/bookings/HistoryLines';
import { HistoryBox } from '../../../../lib/bookings/HistoryBox';
import { useStore } from '../../../../lib/store/data';
import { StoreTop } from '../../../../lib/store/parts';
import { StorePacks } from '../../../../lib/store/Packs';
import { RateCard, useMyReviews } from '../../../../lib/reviews';

type Tab = 'b' | 'p';

/* Οι κρατήσεις μου σε αυτό το κατάστημα, με την ίδια όψη που έχει η καρτέλα «Κρατήσεις» της εφαρμογής (2026-11-18):
   Κρατήσεις | Πακέτα, κάρτες BannerCard, και το Ιστορικό σε πλαίσιο που ανοίγει. Μόνο του καταστήματος,
   με σύνδεσμο προς όλες τις κρατήσεις σε κάθε κατάστημα. */
export default function StoreBookings() {
  const S = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('b');
  const [busy, setBusy] = useState(false);
  const refresh = async () => { setBusy(true); await S.reload(); setBusy(false); };
  const color = S.st?.color ?? C.accent;
  const n = S.upcoming.length + S.waits.length;
  const name = S.biz?.name ?? '';
  const signedIn = !!useAuth().session;
  const R = useMyReviews(); // βαθμολογίες καταστημάτων μετά την επίσκεψη
  const past = S.past.map((b) => ({ ...b, business: b.business ?? name }));

  const Empty = ({ text }: { text: string }) => (
    <View style={{ paddingHorizontal: 24, paddingVertical: 36, alignItems: 'center', gap: 6 }}>
      <RNText style={{ fontSize: 28 }}>🗓️</RNText>
      <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center' }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title="Οι κρατήσεις μου" />
      <ScrollView contentContainerStyle={[s.pad, { paddingTop: 14, paddingBottom: TAB_SPACE, gap: 10 }]} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}>
        {!signedIn ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 14 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 20, textAlign: 'center' }}>Συνδέσου για να δεις τις κρατήσεις σου</Text>
            <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center' }}>Εδώ θα βλέπεις τις κρατήσεις και τα πακέτα σου σε αυτό το κατάστημα.</Text>
            <Btn title="Σύνδεση" color={color} onPress={() => askLogin(`/store/${S.id}/bookings`, 'in', true)} />
          </View>
        ) : <>
        <Segmented value={tab} onChange={setTab} items={[
          { key: 'b', label: 'Κρατήσεις', count: n, alert: true },
          { key: 'p', label: 'Πακέτα', count: S.packInfo ? 1 : 0 },
        ]} />

        {tab === 'b' ? <>
          <RateCard R={R} items={[...S.upcoming, ...past]} store={false} />
          {n === 0 && <Empty text="Δεν έχεις κλείσει ώρα εδώ ακόμα. Πάτα το κουμπί στη μέση της μπάρας." />}
          {S.upcoming.map((b) => <BannerCard key={b.id} b={{ ...b, business: b.business ?? name } as any} biz={S.biz} color={color} onCancel={() => S.cancelBooking(b)} />)}
          {S.waits.map((w) => <WaitRow key={w.id} w={w} onLeave={() => S.leave(w)} />)}
          <HistoryBox title="Ιστορικό κρατήσεων" sub={S.past.length ? `${S.past.length} ${S.past.length === 1 ? 'παλιά κράτηση' : 'παλιές κρατήσεις'}` : 'Καμία παλιά κράτηση ακόμα'}>
            <BookingLines D={{ past } as any} R={R} />
          </HistoryBox>
          <AllLink text="Κρατήσεις σε όλα τα καταστήματα" onPress={() => router.navigate('/bookings')} />
        </> : <>
          {!!S.packInfo && <PackCard name={name} biz={S.biz} color={color} p={S.packInfo} />}
          {!S.packInfo && !S.packages.length && <Empty text="Αυτό το κατάστημα δεν έχει πακέτα." />}
          {(!S.packInfo || (S.packInfo.left <= 0 && !S.packInfo.unlimited && !S.packInfo.asked)) && <StorePacks title={S.packInfo ? 'Νέο πακέτο' : 'Διάλεξε πακέτο'} />}
          <AllLink icon="pack" text="Πακέτα σε όλα τα καταστήματα" onPress={() => router.navigate({ pathname: '/bookings', params: { tab: 'p' } } as any)} />
        </>}
        </>}
      </ScrollView>
      {R.sheet}
    </View>
  );
}
