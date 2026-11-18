import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../lib/Txt';
import { C, CATEGORIES, catLabel } from '../../lib/ui';
import { useWide } from '../../lib/wide';
import { RATINGS, nameOf, rating, useAdmin } from '../../lib/admin/data';
import { Box, Chips, Lead, Line, Loading, Page, Row, Search, ShopTag } from '../../lib/admin/parts';

/* Όλα τα καταστήματα της πλατφόρμας, με φίλτρα και αναζήτηση. Πατάς ένα → η καρτέλα του. */
export default function Shops() {
  const router = useRouter();
  const wide = useWide();
  const { data, error } = useAdmin<any[]>('admin_businesses', { p_q: null });
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const [cat, setCat] = useState('all');
  const all = data ?? [];
  const count = (fn: (b: any) => boolean) => all.filter(fn).length;
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((b) => (f === 'all' || (f === 'live' ? b.is_published && !b.suspended : f === 'draft' ? !b.is_published && !b.suspended : b.suspended))
      && (cat === 'all' || b.category === cat)
      && (!t || [b.name, b.city, b.owner?.name, b.owner?.email].some((x) => String(x ?? '').toLowerCase().includes(t))));
  }, [all, q, f, cat]);
  const cats = CATEGORIES.filter((c) => all.some((b) => b.category === c.key));
  return (
    <Page title="Καταστήματα" sub={data ? String(all.length) : undefined} right={<Search value={q} onChange={setQ} placeholder="Όνομα, πόλη, ιδιοκτήτης…" />}>
      <Chips value={f} onChange={setF} items={[
        { key: 'all', label: 'Όλα' }, { key: 'live', label: `Δημοσιευμένα ${count((b) => b.is_published && !b.suspended)}` },
        { key: 'draft', label: `Πρόχειρα ${count((b) => !b.is_published && !b.suspended)}` }, { key: 'off', label: `Σε αναστολή ${count((b) => b.suspended)}` }]} />
      {cats.length > 1 && <Chips value={cat} onChange={setCat} items={[{ key: 'all', label: 'Όλα τα είδη' }, ...cats.map((c) => ({ key: c.key, label: c.label }))]} />}
      {!data ? <Loading error={error} /> : wide ? (
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 18, overflow: 'hidden' }}>
          <Row head widths={W} cells={['Κατάστημα', 'Ιδιοκτήτης', 'Πόλη', 'Κρατήσεις 30ημ.', 'Ακυρώσεις', ...(RATINGS ? ['★'] : []), 'Κατάσταση']} />
          {list.map((b) => (
            <Row key={b.id} widths={W} onPress={() => router.push(`/admin/shop/${b.id}` as any)} cells={[
              <View key="n" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}><Lead name={b.name} color={b.brand_color} size={26} />
                <View style={{ minWidth: 0, flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>{catLabel(b.category)}</Text></View></View>,
              nameOf(b.owner), b.city, String(b.bookings_30), pct(b), ...(RATINGS ? [rating(b.rating_avg)] : []), <ShopTag key="t" b={b} />]} />
          ))}
          {list.length === 0 && <Text style={{ color: C.mute, padding: 20 }}>Κανένα κατάστημα.</Text>}
        </View>
      ) : (
        <Box>
          {list.map((b, i) => (
            <Line key={b.id} last={i === list.length - 1} lead={<Lead name={b.name} color={b.brand_color} />} title={b.name}
              sub={`${catLabel(b.category)} · ${b.city} · ${nameOf(b.owner)} · ${b.bookings_30} κρατ.`} right={<ShopTag b={b} />}
              onPress={() => router.push(`/admin/shop/${b.id}` as any)} />
          ))}
          {list.length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Κανένα κατάστημα.</Text>}
        </Box>
      )}
    </Page>
  );
}

const pct = (b: any) => { const t = (b.bookings_30 ?? 0) + (b.cancelled_30 ?? 0); return t ? `${Math.round((100 * b.cancelled_30) / t)}%` : '–'; };
const W = RATINGS ? [2.4, 1.6, 1.2, 1.1, 0.9, 0.5, 1.2] : [2.4, 1.6, 1.2, 1.1, 0.9, 1.2];


