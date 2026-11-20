import { useState } from 'react';
import { Text } from '../../lib/Txt';
import { C } from '../../lib/ui';
import { say } from '../../lib/alert';
import { rpc } from '../../lib/supabase';
import { ago, useAdmin } from '../../lib/admin/data';
import { Box, Chips, Line, Loading, Page, Small } from '../../lib/admin/parts';

/* Σφάλματα από τις συσκευές των χρηστών (lib/errors.ts → log_client_error, migration 024).
   Το ίδιο σφάλμα την ίδια μέρα είναι μία γραμμή με «×N». Σβήνονται μόνα τους μετά από 30 μέρες. */
export default function Errors() {
  const [days, setDays] = useState('7');
  const { data, error, reload } = useAdmin<any[]>('admin_errors', { p_days: Number(days) }, [days]);
  const [open, setOpen] = useState<number | null>(null);
  const all = data ?? [];
  const total = all.reduce((n, e) => n + (e.count ?? 1), 0);
  const clear = () => say('Σβήσιμο όλων;', 'Σβήνονται όλα τα σφάλματα που έχουν καταγραφεί.', [
    { text: 'Όχι', style: 'cancel' }, { text: 'Σβήσ’ τα', style: 'destructive', onPress: () => rpc('admin_clear_errors').then(reload, (e) => say('Δεν σβήστηκαν', e.message)) }]);
  return (
    <Page title="Σφάλματα" sub={data ? `${all.length} διαφορετικά · ${total} φορές` : undefined}>
      <Chips value={days} onChange={setDays} items={[{ key: '1', label: 'Σήμερα' }, { key: '7', label: '7 μέρες' }, { key: '30', label: '30 μέρες' }]} />
      {!data ? <Loading error={error && /admin_errors/.test(error) ? 'Χρειάζεται το migration 024 στη βάση.' : error} /> : (
        <Box>
          {all.length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Κανένα σφάλμα. 🎉</Text>}
          {all.map((e, i) => (
            <Line key={e.id} last={i === all.length - 1}
              title={`${e.count > 1 ? `×${e.count}  ` : ''}${e.message}`}
              sub={[e.platform, e.version && `v${e.version}`, e.path, e.user_name, ago(e.last_at)].filter(Boolean).join(' · ') + (open === e.id && e.stack ? `\n\n${e.stack}` : '')}
              right={e.stack ? <Small title={open === e.id ? 'Λιγότερα' : 'Λεπτομέρειες'} onPress={() => setOpen(open === e.id ? null : e.id)} /> : undefined} />
          ))}
        </Box>
      )}
      {all.length > 0 && <Small title="Σβήσε όλα" danger onPress={clear} />}
    </Page>
  );
}
