import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../lib/Txt';
import { C } from '../../lib/ui';
import { useWide } from '../../lib/wide';
import { ago, longDate, nameOf, useAdmin } from '../../lib/admin/data';
import { Box, Chips, Line, Loading, Page, Person, Search, State } from '../../lib/admin/parts';
import { Row } from '../../lib/admin/parts';

/* Όλοι οι λογαριασμοί (πελάτες και καταστηματάρχες). Πατάς έναν → η καρτέλα του. */
export default function People() {
  const router = useRouter();
  const wide = useWide();
  const { data, error } = useAdmin<any[]>('admin_users', { p_q: null });
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const all = data ?? [];
  const test: Record<string, (u: any) => boolean> = {
    all: () => true, owners: (u) => u.owns > 0, clients: (u) => !u.owns, noshow: (u) => u.no_shows >= 3, off: (u) => u.suspended,
  };
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((u) => test[f](u) && (!t || [u.name, u.email, u.phone].some((x) => String(x ?? '').toLowerCase().includes(t))));
  }, [all, q, f]);
  return (
    <Page title="Πελάτες" sub={data ? `${all.length} λογαριασμοί` : undefined} right={<Search value={q} onChange={setQ} placeholder="Όνομα, email, τηλέφωνο…" />}>
      <Chips value={f} onChange={setF} items={[
        { key: 'all', label: 'Όλοι' }, { key: 'clients', label: `Πελάτες ${all.filter(test.clients).length}` },
        { key: 'owners', label: `Καταστηματάρχες ${all.filter(test.owners).length}` },
        { key: 'noshow', label: `3+ «δεν ήρθε» ${all.filter(test.noshow).length}` }, { key: 'off', label: `Σε αναστολή ${all.filter(test.off).length}` }]} />
      {!data ? <Loading error={error} /> : wide ? (
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 18, overflow: 'hidden' }}>
          <Row head widths={W} cells={['Όνομα', 'Email', 'Τηλέφωνο', 'Κρατήσεις', 'Δεν ήρθε', 'Μέλος από', 'Κατάσταση']} />
          {list.map((u) => (
            <Row key={u.id} widths={W} onPress={() => router.push(`/admin/person/${u.id}` as any)} cells={[
              <View key="n" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}><Person name={nameOf(u)} size={28} />
                <Text style={{ color: C.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{u.name || '–'}</Text></View>,
              u.email ?? '–', u.phone || '–', String(u.bookings), u.no_shows ? String(u.no_shows) : '–', longDate(u.created_at), <State key="s" u={u} />]} />
          ))}
          {list.length === 0 && <Text style={{ color: C.mute, padding: 20 }}>Κανένας λογαριασμός.</Text>}
        </View>
      ) : (
        <Box>
          {list.map((u, i) => (
            <Line key={u.id} last={i === list.length - 1} lead={<Person name={nameOf(u)} />} title={nameOf(u)}
              sub={`${u.email ?? ''} · ${u.bookings} κρατ. · ${ago(u.created_at)}`} right={<State u={u} />}
              onPress={() => router.push(`/admin/person/${u.id}` as any)} />
          ))}
        </Box>
      )}
    </Page>
  );
}
const W = [1.7, 2, 1.2, 0.9, 0.8, 1.4, 1.3];

