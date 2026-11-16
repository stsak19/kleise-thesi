import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../lib/Txt';
import { C, DayStrip, iso } from '../../lib/ui';
import { STATUS, adminActions, useAdmin } from '../../lib/admin/data';
import { Box, Chips, Kpi, Line, Loading, Page, Search, Small, Tag } from '../../lib/admin/parts';

/* Όλες οι κρατήσεις μιας μέρας, σε όλα τα καταστήματα. */
export default function Bookings() {
  const router = useRouter();
  const days = useMemo(() => Array.from({ length: 22 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i - 14); return iso(d); }), []);
  const [date, setDate] = useState(iso(new Date()));
  const { data, error, reload } = useAdmin<any[]>('admin_bookings', { p_date: date });
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const all = data ?? [];
  const list = all.filter((b) => (f === 'all' || b.status === f)
    && (!q.trim() || [b.business, b.user, b.email, b.service].some((x) => String(x ?? '').toLowerCase().includes(q.trim().toLowerCase()))));
  const cnt = (st: string) => all.filter((b) => b.status === st).length;
  return (
    <Page title="Κρατήσεις" sub={data ? `${all.filter((b) => b.status !== 'cancelled').length} τη μέρα` : undefined}
      right={<Search value={q} onChange={setQ} placeholder="Κατάστημα, πελάτης, υπηρεσία…" />}>
      <View style={{ paddingHorizontal: 20 }}><DayStrip days={days} value={date} onChange={setDate} color={C.text} /></View>
      {!data ? <Loading error={error} /> : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Kpi n={cnt('booked') + cnt('attended') + cnt('no_show')} label="Κρατήσεις" />
            <Kpi n={cnt('attended')} label="Ήρθαν" />
            <Kpi n={cnt('no_show')} label="Δεν ήρθαν" bad={cnt('no_show') > 0} />
            <Kpi n={cnt('cancelled')} label="Ακυρώσεις" />
            <Kpi n={new Set(all.map((b) => b.business_id)).size} label="Καταστήματα" />
          </View>
          <Chips value={f} onChange={setF} items={[{ key: 'all', label: 'Όλες' }, ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: `${v.label} ${cnt(k)}` }))]} />
          <Box>
            {list.length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Καμία κράτηση.</Text>}
            {list.map((b, i) => (
              <Line key={b.id} last={i === list.length - 1} lead={<Text style={{ color: C.text, fontWeight: '800', fontSize: 16, width: 50 }}>{String(b.time).slice(0, 5)}</Text>}
                title={`${b.business} · ${b.service}`} sub={[b.user, b.email].filter(Boolean).join(' · ')}
                right={<><Tag text={STATUS[b.status]?.label ?? b.status} tone={STATUS[b.status]?.tone} />
                  {b.status === 'booked' && <Small title="Ακύρωση" onPress={() => adminActions.cancelBooking(b, reload)} />}
                  <Small title="Πελάτης" onPress={() => router.push(`/admin/person/${b.user_id}` as any)} />
                  <Small title="Κατάστημα" onPress={() => router.push(`/admin/shop/${b.business_id}` as any)} /></>} />
            ))}
          </Box>
        </>
      )}
    </Page>
  );
}
