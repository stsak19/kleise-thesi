import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Attention, BizSwitcher, NoBiz, StaffFilter, useDay, useMyBiz, useStaff } from '../../../lib/owner/hub';
import { DayDetail, DayHead, DidTheyCome, HourList, NewClients, slotsOf } from '../../../lib/owner/day';
import { C, ScreenHeader, T, alpha, iso, s } from '../../../lib/ui';

/* «Σήμερα»: το πρόγραμμα της ημέρας με τον τρόπο του Gym Schedule.
   Πάνω καρφωμένα: λωρίδα ημερών, τίτλος ημέρας και τέσσερα κουτάκια. Από κάτω οι ώρες σαν κάρτες που ανοίγουν. */
export default function Today() {
  const biz = useMyBiz();
  const todayISO = iso(new Date());
  const [date, setDate] = useState(todayISO);
  const D = useDay(biz, date);
  const T0 = useDay(biz, todayISO);
  const { staff } = useStaff(biz);
  const [who, setWho] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;

  const day = who ? D.day.filter((b) => b.staff_id === who) : D.day;
  const slots = slotsOf(day, who ? 1 : staff.length);
  const counts: Record<string, number> = {};
  D.day.forEach((b) => { if (b.staff_id && b.status !== 'cancelled') counts[b.staff_id] = (counts[b.staff_id] ?? 0) + 1; });
  const reload = () => { D.load(); T0.load(); };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} stickyHeaderIndices={[2]}
      refreshControl={<RefreshControl refreshing={D.loading} onRefresh={reload} />}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader eyebrow={<BizSwitcher biz={biz} />} title="Σήμερα" />
      </View>

      <View style={{ gap: 12 }}>
        {!biz.is_published && (
          <View style={{ backgroundColor: alpha(C.tint, 0.06), borderRadius: 16, padding: 14 }}>
            <T style={{ fontSize: 14 }}>Η σελίδα σου δεν φαίνεται ακόμα στην αναζήτηση. Άνοιξε τη «Δημοσίευση» από την καρτέλα Σελίδα.</T>
          </View>
        )}
        <NewClients biz={biz} list={D.pending} onDone={D.load} />
        <DidTheyCome day={T0.day} onChange={reload} />
      </View>

      <DayHead biz={biz} date={date} setDate={setDate} day={day} slots={slots} detail={detail} setDetail={setDetail}
        extra={<StaffFilter staff={staff} value={who} onChange={setWho} counts={counts} />} />

      <DayDetail detail={detail} day={day} slots={slots} onClose={() => setDetail(null)} />
      {D.override.closed && slots.length > 0 && (
        <View style={{ backgroundColor: alpha(C.bad, 0.08), borderRadius: 16, padding: 14 }}>
          <T style={{ fontSize: 14, color: C.bad }}>Το κατάστημα είναι κλειστό αυτή τη μέρα.</T>
        </View>
      )}
      <HourList biz={biz} date={date} slots={slots} onChange={reload} closed={D.override.closed} />
      <Attention biz={biz} />
    </ScrollView>
  );
}
