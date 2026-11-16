import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text } from '../../lib/Txt';
import { C } from '../../lib/ui';
import { adminActions, ago, useAdmin } from '../../lib/admin/data';
import { Box, Chips, Line, Loading, Page, Small } from '../../lib/admin/parts';

/* Όλες οι κριτικές καταστημάτων. Οι χαμηλές (1–2★) είναι αυτές που «θέλουν προσοχή». */
export default function Reviews() {
  const router = useRouter();
  const { data, error, reload } = useAdmin<any[]>('admin_reviews');
  const [f, setF] = useState('low');
  const all = data ?? [];
  const list = all.filter((r) => f === 'all' || (f === 'low' ? r.stars <= 2 : r.stars >= 4));
  return (
    <Page title="Βαθμολογίες" sub={data ? `${all.length} κριτικές` : undefined}>
      <Chips value={f} onChange={setF} items={[{ key: 'low', label: `1–2★ ${all.filter((r) => r.stars <= 2).length}` },
        { key: 'high', label: `4–5★ ${all.filter((r) => r.stars >= 4).length}` }, { key: 'all', label: 'Όλες' }]} />
      {!data ? <Loading error={error} /> : (
        <Box>
          {list.length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>{all.length ? 'Καμία εδώ.' : 'Δεν υπάρχουν ακόμα κριτικές.'}</Text>}
          {list.map((r, i) => (
            <Line key={r.id} last={i === list.length - 1} title={`${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}  ${r.business}`}
              sub={`${r.comment ? `«${r.comment}» · ` : ''}${r.user ?? 'Πελάτης'} · ${ago(r.created_at)}`}
              right={<><Small title="Κατάστημα" onPress={() => router.push(`/admin/shop/${r.business_id}` as any)} />
                <Small title="Πελάτης" onPress={() => router.push(`/admin/person/${r.user_id}` as any)} />
                <Small title="Διαγραφή" danger onPress={() => adminActions.deleteReview(r, reload)} /></>} />
          ))}
        </Box>
      )}
    </Page>
  );
}
