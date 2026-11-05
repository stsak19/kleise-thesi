import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Card, Empty, ScreenHeader, s } from '../../lib/ui';
import { useMyBookings } from '../../lib/bookings/data';
import { Extras, History, Notices, Segmented } from '../../lib/bookings/parts';
import Upcoming from '../../lib/bookings/Upcoming';

let lastTab: 'up' | 'past' = 'up';

/* Κρατήσεις: δύο καρτέλες, «Επερχόμενες» (ραντεβού, αναμονή, πακέτα) και «Ιστορικό» (αρχείο ανά κατάστημα). */
export default function Bookings() {
  const D = useMyBookings();
  const [tab, setTabS] = useState(lastTab);
  const setTab = (t: typeof tab) => { lastTab = t; setTabS(t); };
  const n = D.upcoming.length;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title="Κρατήσεις" sub={n ? `${n} ${n === 1 ? 'επερχόμενο ραντεβού' : 'επερχόμενα ραντεβού'}` : undefined} />
      </View>
      <Segmented value={tab} onChange={setTab} items={[
        { key: 'up', label: 'Επερχόμενες', count: n },
        { key: 'past', label: 'Ιστορικό', count: D.past.length },
      ]} />

      {tab === 'up' ? <>
        <Notices notes={D.notes} />
        {D.ready && n === 0 && (
          <Card><Empty emoji="📅" title="Καμία επερχόμενη κράτηση" text="Βρες ένα κατάστημα και κλείσε θέση σε λίγα δευτερόλεπτα."
            action="Βρες κατάστημα" onAction={D.find} /></Card>
        )}
        {n > 0 && <Upcoming D={D} />}
        <Extras D={D} />
      </> : <History D={D} />}
    </ScrollView>
  );
}
