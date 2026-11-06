import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Attention, BizSwitcher, NoBiz, StaffFilter, useDay, useMyBiz, useStaff } from '../../../lib/owner/hub';
import { DayDetail, DayHead, DidTheyCome, HourList, NewClients, slotsOf } from '../../../lib/owner/day';
import { C, ScreenHeader, T, alpha, iso, s } from '../../../lib/ui';
import { CameBox, DayOpenBox, DeskList, PendingBox, useWide } from '../../../lib/owner/desk';

/* «Πρόγραμμα» (ενώνει τα παλιά Σήμερα και Ημερολόγιο).
   Κινητό: πάνω καρφωμένα λωρίδα ημερών, τίτλος ημέρας και τέσσερα κουτάκια· από κάτω οι ώρες σαν κάρτες που ανοίγουν.
   Υπολογιστής: στη μέση μία γραμμή για κάθε ραντεβού, δεξιά ό,τι θέλει απάντηση (νέοι πελάτες, «ήρθαν;», ανοιχτά/κλειστά). */
export default function Today() {
  const biz = useMyBiz();
  const todayISO = iso(new Date());
  const [date, setDate] = useState(todayISO);
  const D = useDay(biz, date);
  const T0 = useDay(biz, todayISO);
  const { staff } = useStaff(biz);
  const [who, setWho] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const wide = useWide();

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;

  const day = who ? D.day.filter((b) => b.staff_id === who) : D.day;
  const slots = slotsOf(day, who ? 1 : staff.length);
  const counts: Record<string, number> = {};
  D.day.forEach((b) => { if (b.staff_id && b.status !== 'cancelled') counts[b.staff_id] = (counts[b.staff_id] ?? 0) + 1; });
  const reload = () => { D.load(); T0.load(); };

  if (wide) return (
    <View style={[s.screen, { flexDirection: 'row' }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 26, paddingBottom: 40, gap: 12 }} stickyHeaderIndices={[1]}>
        <T style={{ fontSize: 30, fontWeight: '900', letterSpacing: -0.6 }}>Πρόγραμμα</T>
        <DayHead biz={biz} date={date} setDate={setDate} day={day} slots={slots} detail={detail} setDetail={setDetail}
          extra={<StaffFilter staff={staff} value={who} onChange={setWho} counts={counts} />} />
        <DayDetail detail={detail} day={day} slots={slots} onClose={() => setDetail(null)} />
        <DeskList biz={biz} date={date} slots={slots} onChange={reload} closed={D.override.closed} />
      </ScrollView>
      <ScrollView style={{ width: 380, flexGrow: 0, borderLeftWidth: 1, borderLeftColor: C.line }} contentContainerStyle={{ padding: 20, paddingTop: 26, gap: 12 }}>
        {!biz.is_published && (
          <View style={{ backgroundColor: alpha(C.tint, 0.06), borderRadius: 16, padding: 14 }}>
            <T style={{ fontSize: 14 }}>Η σελίδα σου δεν φαίνεται ακόμα στην αναζήτηση. Άνοιξε τη «Δημοσίευση» από το Κατάστημα.</T>
          </View>
        )}
        <PendingBox biz={biz} list={D.pending} onDone={D.load} />
        <CameBox day={T0.day} onChange={reload} />
        <DayOpenBox biz={biz} date={date} override={D.override} setOverride={D.setOverride} onSaved={D.load} />
        <Attention biz={biz} />
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} stickyHeaderIndices={[2]}
      refreshControl={<RefreshControl refreshing={D.loading} onRefresh={reload} />}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader eyebrow={<BizSwitcher biz={biz} />} title="Πρόγραμμα" />
      </View>

      <View style={{ gap: 12 }}>
        {!biz.is_published && (
          <View style={{ backgroundColor: alpha(C.tint, 0.06), borderRadius: 16, padding: 14 }}>
            <T style={{ fontSize: 14 }}>Η σελίδα σου δεν φαίνεται ακόμα στην αναζήτηση. Άνοιξε τη «Δημοσίευση» από την καρτέλα Κατάστημα.</T>
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
      <DayOpenBox biz={biz} date={date} override={D.override} setOverride={D.setOverride} onSaved={D.load} />
    </ScrollView>
  );
}
