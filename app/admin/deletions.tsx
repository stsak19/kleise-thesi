import { useRouter } from 'expo-router';
import { Text } from '../../lib/Txt';
import { C } from '../../lib/ui';
import { adminActions, daysLeft, longDate, nameOf, useAdmin } from '../../lib/admin/data';
import { Box, Line, Loading, Page, Person, Small } from '../../lib/admin/parts';

/* Λογαριασμοί που ζήτησαν διαγραφή (σβήνονται αυτόματα 7 μέρες μετά την αίτηση). */
export default function Deletions() {
  const router = useRouter();
  const { data, error, reload } = useAdmin<any[]>('admin_users', { p_q: null });
  const list = (data ?? []).filter((u) => u.delete_requested_at)
    .sort((a, z) => String(a.delete_requested_at).localeCompare(String(z.delete_requested_at)));
  const on = (u: any) => new Date(new Date(u.delete_requested_at).getTime() + 7 * 864e5).toISOString();
  return (
    <Page title="Αιτήσεις διαγραφής" sub={data ? String(list.length) : undefined}>
      <Text style={{ color: C.mute, fontWeight: '600' }}>Ο λογαριασμός σβήνεται αυτόματα 7 μέρες μετά την αίτηση. Ως τότε μπορείς να την ακυρώσεις ή να τον σβήσεις αμέσως.</Text>
      {!data ? <Loading error={error} /> : (
        <Box>
          {list.length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Καμία αίτηση.</Text>}
          {list.map((u, i) => (
            <Line key={u.id} last={i === list.length - 1} lead={<Person name={nameOf(u)} />} title={nameOf(u) + (u.owns ? ` · ${u.owns} κατάστημα` : '')}
              sub={`${u.email ?? ''} · αίτηση ${longDate(u.delete_requested_at)} · σβήνεται σε ${daysLeft(on(u))} μέρες`}
              onPress={() => router.push(`/admin/person/${u.id}` as any)}
              right={<><Small title="Ακύρωση αίτησης" onPress={() => adminActions.cancelDeletion(u, reload)} />
                <Small title="Διαγραφή τώρα" danger onPress={() => adminActions.deleteUser(u, reload)} /></>} />
          ))}
        </Box>
      )}
    </Page>
  );
}
