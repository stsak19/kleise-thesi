import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { C, Card, Empty, ScreenHeader, alpha, s } from '../../lib/ui';
import { useMyBookings } from '../../lib/bookings/data';
import { Extras, History, Notices, Segmented } from '../../lib/bookings/parts';
import Timeline from '../../lib/bookings/upcoming/Timeline';
import Cards from '../../lib/bookings/upcoming/Cards';
import Week from '../../lib/bookings/upcoming/Week';
import Tickets from '../../lib/bookings/upcoming/Tickets';

/* ΠΡΟΣΩΡΙΝΟ: 4 εκδοχές για τα επερχόμενα ραντεβού, με μπάρα εναλλαγής, μέχρι να διαλεχτεί μία. */
const VARIANTS = [
  { name: 'Χρονολόγιο', C: Timeline },
  { name: 'Κάρτες', C: Cards },
  { name: 'Ημερολόγιο', C: Week },
  { name: 'Εισιτήρια', C: Tickets },
];
let lastV = 0, lastTab: 'up' | 'past' = 'up';

function Picker({ v, setV }: { v: number; setV: (n: number) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700' }}>ΕΚΔΟΧΗ (προσωρινό, για να διαλέξεις)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {VARIANTS.map((x, i) => (
          <Pressable key={x.name} onPress={() => setV(i)} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center',
            backgroundColor: i === v ? C.text : C.soft }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: i === v ? C.bg : C.mute }}>{i + 1} · {x.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* Κρατήσεις: δύο καρτέλες, «Επερχόμενες» (ραντεβού, αναμονή, πακέτα) και «Ιστορικό» (αρχείο ανά κατάστημα). */
export default function Bookings() {
  const D = useMyBookings();
  const [tab, setTabS] = useState(lastTab);
  const [v, setVS] = useState(lastV);
  const setTab = (t: typeof tab) => { lastTab = t; setTabS(t); };
  const setV = (n: number) => { lastV = n; setVS(n); };
  const Up = VARIANTS[v].C;
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
        {n > 0 && <>
          <View style={{ backgroundColor: alpha(C.accent, 0.05), borderRadius: 16, padding: 12, marginHorizontal: -4 }}><Picker v={v} setV={setV} /></View>
          <Up key={v} D={D} />
        </>}
        <Extras D={D} />
      </> : <History D={D} />}
    </ScrollView>
  );
}
