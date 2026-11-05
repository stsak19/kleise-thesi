import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Empty, s } from '../../lib/ui';
import { useMyBookings } from '../../lib/bookings/data';
import { Extras, History, Segmented } from '../../lib/bookings/parts';
import Upcoming from '../../lib/bookings/Upcoming';

let lastTab: 'up' | 'past' = 'up';

/* Κρατήσεις: δύο καρτέλες, «Επερχόμενες» (ραντεβού και αναμονή) και «Ιστορικό» (αρχείο ανά κατάστημα). */
export default function Bookings() {
  const D = useMyBookings();
  const [tab, setTabS] = useState(lastTab);
  const setTab = (t: typeof tab) => { lastTab = t; setTabS(t); };
  const n = D.upcoming.length;
  const top = useSafeAreaInsets().top;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: top + 12 }]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <Segmented value={tab} onChange={setTab} items={[
        { key: 'up', label: 'Επερχόμενες', count: n, alert: true },
        { key: 'past', label: 'Ιστορικό', count: D.past.length },
      ]} />

      {tab === 'up' ? <>
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
