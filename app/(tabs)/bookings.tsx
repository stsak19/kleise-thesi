import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../lib/Txt';
import { C, Card, Empty, s } from '../../lib/ui';
import { useMyBookings } from '../../lib/bookings/data';
import { Extras, History, Segmented } from '../../lib/bookings/parts';
import { PackList, packEnded } from '../../lib/bookings/PackList';
import Upcoming from '../../lib/bookings/Upcoming';
import { deskCol, useWide } from '../../lib/wide';

type Main = 'b' | 'p';
type Sub = 'now' | 'past';
let last: { main: Main; sub: Record<Main, Sub> } = { main: 'b', sub: { b: 'now', p: 'now' } };

/* Μικρός διακόπτης κάτω από τις καρτέλες: «Επερχόμενες / Ιστορικό» ή «Ενεργά / Ιστορικό». */
function SubTabs({ value, onChange, items }: { value: Sub; onChange: (v: Sub) => void; items: { key: Sub; label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1,
              borderColor: on ? C.text : C.line, backgroundColor: on ? C.text : pressed ? C.soft : 'transparent' })}>
            <Text style={{ color: on ? C.bg : C.mute, fontWeight: '800', fontSize: 13.5 }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* Κρατήσεις: δύο καρτέλες, «Κρατήσεις» και «Πακέτα» (τα πακέτα δεν έχουν δικό τους κουμπί στη μπάρα).
   Η καθεμιά έχει το δικό της Ιστορικό: Επερχόμενες / Ιστορικό, Ενεργά / Ιστορικό (πακέτα που έληξαν ή τελείωσαν). */
export default function Bookings() {
  const D = useMyBookings();
  const [st, setSt] = useState(last);
  const set = (v: typeof st) => { last = v; setSt(v); };
  // /bookings?tab=p (π.χ. από το κατάστημα «Πακέτα σε όλα τα καταστήματα») ανοίγει κατευθείαν τα Πακέτα.
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  useEffect(() => { if (tab === 'p' || tab === 'b') set({ ...last, main: tab }); }, [tab]);
  const n = D.upcoming.length;
  const activePacks = D.packs.filter((m: any) => !packEnded(m)).length;
  const top = useSafeAreaInsets().top;
  const wide = useWide();
  const sub = st.sub[st.main];
  const setSub = (v: Sub) => set({ ...st, sub: { ...st.sub, [st.main]: v } });

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: top + 12 }, wide && { paddingTop: 28, paddingBottom: 60 }, deskCol(wide)]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <Segmented value={st.main} onChange={(main) => set({ ...st, main })} items={[
        { key: 'b', label: 'Κρατήσεις', count: n, alert: true },
        { key: 'p', label: 'Πακέτα', count: activePacks },
      ]} />
      <SubTabs value={sub} onChange={setSub} items={[{ key: 'now', label: st.main === 'b' ? 'Επερχόμενες' : 'Ενεργά' }, { key: 'past', label: 'Ιστορικό' }]} />

      {st.main === 'p' ? <PackList D={D} which={sub === 'now' ? 'active' : 'past'} />
        : sub === 'now' ? <>
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
