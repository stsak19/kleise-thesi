import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { sb } from '../../../lib/supabase';
import { styleOf } from '../../../lib/presets';
import { NoBiz, Schedule, Stat, useDay, useMyBiz } from '../../../lib/owner/hub';
import { C, Card, DayStrip, Input, ScreenHeader, Section, alpha, fmtLong, iso, s } from '../../../lib/ui';

/* «Ημερολόγιο»: διαλέγεις μέρα, βλέπεις το πρόγραμμα και ανοίγεις ή κλείνεις τη μέρα με ένα σημείωμα. */
export default function Calendar() {
  const biz = useMyBiz();
  const [date, setDate] = useState(iso(new Date()));
  const D = useDay(biz, date);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;

  const brand: string = styleOf(biz).color;
  const days = Array.from({ length: 35 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i - 3); return iso(d); });
  const live = D.day.filter((b) => b.status !== 'cancelled');
  const save = async (closed: boolean) => {
    await sb.from('day_overrides').upsert({ business_id: biz.id, date, closed, note: D.override.note || null }); D.load();
  };
  const Seg = ({ on, label, onPress, color }: { on: boolean; label: string; onPress: () => void; color: string }) => (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: on ? C.card : 'transparent',
      boxShadow: on ? `0px 1px 3px ${alpha(C.shade, 0.1)}` : undefined }}>
      <Text style={{ color: on ? color : C.mute, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} refreshControl={<RefreshControl refreshing={D.loading} onRefresh={D.load} />}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title="Ημερολόγιο" sub={fmtLong(date)} />
      </View>
      <DayStrip days={days} value={date} onChange={setDate} color={brand} />
      <View style={[s.row, { gap: 10 }]}>
        <Stat n={live.length} label="Κρατήσεις" />
        <Stat n={live.filter((b) => b.status === 'attended').length} label="Ήρθαν" color={C.ok} />
        <Stat n={new Set(live.map((b) => b.time)).size} label="Ώρες" />
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4 }}>
          <Seg on={!D.override.closed} label="Ανοιχτά" color={C.ok} onPress={() => save(false)} />
          <Seg on={D.override.closed} label="Κλειστά" color={C.bad} onPress={() => save(true)} />
        </View>
        <Input placeholder="Σημείωμα ημέρας για τους πελάτες" value={D.override.note}
          onChangeText={(note) => D.setOverride({ ...D.override, note })} onEndEditing={() => save(D.override.closed)} />
      </Card>

      <Section title="Πρόγραμμα" />
      <Schedule biz={biz} day={D.day} onChange={D.load} />
    </ScrollView>
  );
}
