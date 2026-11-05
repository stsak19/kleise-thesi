import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../../../../lib/Txt';
import { Btn, C, DAYS, MONTHS, TAB_SPACE } from '../../../../lib/ui';
import { Segmented } from '../../../../lib/bookings/parts';
import { countdown } from '../../../../lib/bookings/data';
import { useStore } from '../../../../lib/store/data';
import { StoreTop } from '../../../../lib/store/parts';

const STATUS: Record<string, string> = { booked: 'Έγινε', attended: 'Ήρθες', no_show: 'Δεν ήρθες', cancelled: 'Ακυρώθηκε' };

/* Οι κρατήσεις μου σε αυτό το κατάστημα (όπως το «Κρατήσεις» του Gym_Schedule): επερχόμενες, αναμονή, ιστορικό. */
export default function StoreBookings() {
  const S = useStore();
  const [tab, setTab] = useState<'next' | 'past'>('next');
  const [busy, setBusy] = useState(false);
  const refresh = async () => { setBusy(true); await S.reload(); setBusy(false); };

  const Line = ({ date, time, title, sub, right, mute, last }: { date: string; time: string; title: string; sub: string; right?: React.ReactNode; mute?: boolean; last?: boolean }) => {
    const d = new Date(date + 'T00:00');
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line, opacity: mute ? 0.6 : 1 }}>
        <View style={{ width: 52, height: 60, borderRadius: 14, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.mute, fontSize: 11, fontWeight: '600' }}>{DAYS[d.getDay()]}</Text>
          <Text style={{ color: C.text, fontSize: 19, fontWeight: '800' }}>{d.getDate()}</Text>
          <Text style={{ color: C.mute, fontSize: 10 }}>{MONTHS[d.getMonth()]}</Text>
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '500', letterSpacing: -0.8, fontVariant: ['tabular-nums'] }}>{time}</Text>
            <Text style={{ flex: 1, color: C.mute, fontSize: 13 }} numberOfLines={1}>{title}</Text>
          </View>
          <Text style={{ color: C.mute, fontSize: 12 }}>{sub}</Text>
        </View>
        {right}
      </View>
    );
  };

  const Empty = ({ text }: { text: string }) => (
    <View style={{ paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 28 }}>🗓️</Text>
      <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center' }}>{text}</Text>
    </View>
  );
  const Head = ({ t }: { t: string }) => <Text style={{ color: C.mute, fontWeight: '800', fontSize: 12, letterSpacing: 1.2, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 }}>{t}</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title="Οι κρατήσεις μου" />
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE }} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Segmented value={tab} onChange={setTab} items={[{ key: 'next', label: 'Επερχόμενες', count: S.upcoming.length + S.waits.length }, { key: 'past', label: 'Ιστορικό' }]} />
        </View>
        {tab === 'next' ? <>
          {S.upcoming.length === 0 && S.waits.length === 0 && <Empty text="Δεν έχεις κλείσει ώρα εδώ. Διάλεξε μία από το Πρόγραμμα." />}
          {S.upcoming.length > 0 && <Head t="ΕΠΕΡΧΟΜΕΝΕΣ" />}
          {S.upcoming.map((b, i) => (
            <Line key={b.id} date={b.date} time={b.time} title={b.service} sub={countdown(b)} last={i === S.upcoming.length - 1}
              right={<Btn size="sm" kind="danger" title="Ακύρωση" disabled={S.busy === b.id} onPress={() => S.cancelBooking(b)} />} />
          ))}
          {S.waits.length > 0 && <Head t="ΣΕ ΑΝΑΜΟΝΗ" />}
          {S.waits.map((w, i) => (
            <Line key={w.id} date={w.date} time={w.time} title={w.service} sub="Αν ελευθερωθεί θέση, σου κλείνεται αυτόματα." last={i === S.waits.length - 1}
              right={<Btn size="sm" kind="ghost" title="Απόσυρση" disabled={S.busy === w.service_id + w.time} onPress={() => S.leave(w)} />} />
          ))}
        </> : <>
          {S.past.length === 0 && <Empty text="Δεν υπάρχουν παλιές κρατήσεις ακόμα." />}
          {S.past.map((b, i) => (
            <Line key={b.id} date={b.date} time={b.time} title={b.service} sub={STATUS[b.status] ?? b.status} mute={b.status === 'cancelled'} last={i === S.past.length - 1} />
          ))}
        </>}
      </ScrollView>
    </View>
  );
}
