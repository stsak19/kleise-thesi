import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Attention, BizSwitcher, NoBiz, Pending, Schedule, StaffFilter, Stat, dayStats, useDay, useMyBiz, useStaff } from '../../../lib/owner/hub';
import { Segmented } from '../../../lib/bookings/parts';
import { C, ScreenHeader, Section, T, alpha, fmtLong, iso, price, s } from '../../../lib/ui';

/* «Σήμερα»: η πρώτη οθόνη της επιχείρησης (όπως το Today του Airbnb).
   Νέοι πελάτες προς έγκριση, τα νούμερα της μέρας και τα ραντεβού σήμερα ή αύριο. */
export default function Today() {
  const router = useRouter();
  const biz = useMyBiz();
  const [when, setWhen] = useState<'today' | 'tomorrow'>('today');
  const d = new Date(); if (when === 'tomorrow') d.setDate(d.getDate() + 1);
  const date = iso(d);
  const D = useDay(biz, date);
  const { staff } = useStaff(biz);
  const [who, setWho] = useState<string | null>(null);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;

  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const day = who ? D.day.filter((b) => b.staff_id === who) : D.day;
  const st = dayStats(day);
  const live = st.live;
  const next = when === 'today' ? live.find((b) => b.time >= hhmm && b.status === 'booked') : live[0];
  const attended = live.filter((b) => b.status === 'attended').length;
  const counts: Record<string, number> = {};
  D.day.forEach((b) => { if (b.staff_id && b.status !== 'cancelled') counts[b.staff_id] = (counts[b.staff_id] ?? 0) + 1; });

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader eyebrow={<BizSwitcher biz={biz} />} title="Σήμερα" sub={fmtLong(iso(new Date()))} />
      </View>

      {!biz.is_published && (
        <View style={{ backgroundColor: alpha(C.tint, 0.06), borderRadius: 16, padding: 14 }}>
          <T style={{ fontSize: 14 }}>Η σελίδα σου δεν φαίνεται ακόμα στην αναζήτηση. Άνοιξε τη «Δημοσίευση» από την καρτέλα Σελίδα.</T>
        </View>
      )}

      <Pending biz={biz} list={D.pending} onDone={D.load} />

      <Segmented value={when} onChange={setWhen} items={[
        { key: 'today', label: 'Σήμερα', count: when === 'today' ? live.length : undefined },
        { key: 'tomorrow', label: 'Αύριο', count: when === 'tomorrow' ? live.length : undefined },
      ]} />
      <StaffFilter staff={staff} value={who} onChange={setWho} counts={counts} />
      {st.classes ? (
        <View style={[s.row, { gap: 10 }]}>
          <Stat n={st.groups} label="Μαθήματα" />
          <Stat n={`${st.fill}%`} label="Πληρότητα" />
          <Stat n={next?.time ?? '–'} label={when === 'today' ? 'Επόμενο' : 'Πρώτο'} />
        </View>
      ) : (
        <View style={[s.row, { gap: 10 }]}>
          <Stat n={live.length} label="Ραντεβού" />
          <Stat n={next?.time ?? '–'} label={when === 'today' ? 'Επόμενο' : 'Πρώτο'} />
          {st.revenue != null ? <Stat n={price(st.revenue) || '0€'} label="Έσοδα" /> : <Stat n={attended} label="Ήρθαν" color={attended ? C.ok : undefined} />}
        </View>
      )}
      {D.override.closed && (
        <View style={{ backgroundColor: alpha(C.bad, 0.08), borderRadius: 16, padding: 14 }}>
          <T style={{ fontSize: 14, color: C.bad }}>{when === 'today' ? 'Σήμερα' : 'Αύριο'} το κατάστημα είναι κλειστό.</T>
        </View>
      )}

      <Section title={when === 'today' ? 'Τα σημερινά ραντεβού' : 'Τα αυριανά ραντεβού'} action="Ημερολόγιο" onAction={() => router.navigate('/calendar')} />
      <Schedule biz={biz} day={day} onChange={D.load}
        emptyText={when === 'today' ? 'Δεν έχει κλείσει κανείς θέση για σήμερα.' : 'Δεν έχει κλείσει κανείς θέση για αύριο.'} />
      <Attention biz={biz} />
    </ScrollView>
  );
}
