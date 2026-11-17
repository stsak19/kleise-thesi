import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../lib/Txt';
import { C, Card, Empty, Icon, s } from '../../lib/ui';
import { useMyBookings } from '../../lib/bookings/data';
import { Extras, History, Segmented } from '../../lib/bookings/parts';
import { PackList, packEnded } from '../../lib/bookings/PackList';
import Upcoming from '../../lib/bookings/Upcoming';
import { deskCol, useWide } from '../../lib/wide';

type Main = 'b' | 'p';
let lastMain: Main = 'b';

/* Το Ιστορικό, σε πλαίσιο κάτω από τη λίστα: κλειστό στην αρχή, πάτημα → ανοίγει και δείχνει τα στοιχεία. */
function HistoryBox({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 20, overflow: 'hidden', marginTop: 6 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={({ pressed }) => [s.row, { gap: 12, padding: 16, backgroundColor: pressed ? C.soft : 'transparent' }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="clock" size={19} color={C.text} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
          <Text style={{ color: C.mute, fontSize: 13 }}>{sub}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={15} color={C.mute} /></View>
      </Pressable>
      {open && <View style={{ gap: 12, padding: 12, paddingTop: 4 }}>{children}</View>}
    </View>
  );
}

/* Κρατήσεις: δύο καρτέλες, «Κρατήσεις» και «Πακέτα» (τα πακέτα δεν έχουν δικό τους κουμπί στη μπάρα).
   Κάτω από τη λίστα της καθεμιάς, το δικό της Ιστορικό σε πλαίσιο που ανοίγει (πακέτα: έληξαν, τελείωσαν, ανανεώθηκαν). */
export default function Bookings() {
  const D = useMyBookings();
  const [main, setMainS] = useState(lastMain);
  const setMain = (m: Main) => { lastMain = m; setMainS(m); };
  // /bookings?tab=p (π.χ. από το κατάστημα «Πακέτα σε όλα τα καταστήματα») ανοίγει κατευθείαν τα Πακέτα.
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  useEffect(() => { if (tab === 'p' || tab === 'b') setMain(tab); }, [tab]);
  const n = D.upcoming.length;
  const ended = D.packs.filter((m: any) => packEnded(m)).length + D.packHistory.length;
  const activePacks = D.packs.length - D.packs.filter((m: any) => packEnded(m)).length;
  const top = useSafeAreaInsets().top;
  const wide = useWide();
  const cnt = (k: number, one: string, many: string) => (k === 0 ? `Κανένα ${one}` : `${k} ${k === 1 ? one : many}`);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: top + 12 }, wide && { paddingTop: 28, paddingBottom: 60 }, deskCol(wide)]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <Segmented value={main} onChange={setMain} items={[
        { key: 'b', label: 'Κρατήσεις', count: n, alert: true },
        { key: 'p', label: 'Πακέτα', count: activePacks },
      ]} />

      {main === 'p' ? <>
        <PackList D={D} which="active" />
        <HistoryBox title="Ιστορικό πακέτων" sub={ended ? cnt(ended, 'παλιό πακέτο', 'παλιά πακέτα') : 'Κανένα παλιό πακέτο ακόμα'}>
          <PackList D={D} which="past" />
        </HistoryBox>
      </> : <>
        {D.ready && n === 0 && (
          <Card><Empty emoji="📅" title="Καμία επερχόμενη κράτηση" text="Βρες ένα κατάστημα και κλείσε θέση σε λίγα δευτερόλεπτα."
            action="Βρες κατάστημα" onAction={D.find} /></Card>
        )}
        {n > 0 && <Upcoming D={D} />}
        <Extras D={D} />
        <HistoryBox title="Ιστορικό κρατήσεων" sub={D.past.length ? `${D.past.length} ${D.past.length === 1 ? 'παλιά κράτηση' : 'παλιές κρατήσεις'}` : 'Καμία παλιά κράτηση ακόμα'}>
          <History D={D} />
        </HistoryBox>
      </>}
    </ScrollView>
  );
}
