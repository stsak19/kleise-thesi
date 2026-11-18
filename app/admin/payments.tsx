import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../lib/Txt';
import { say } from '../../lib/alert';
import { rpc } from '../../lib/supabase';
import { Btn, C, Input, price } from '../../lib/ui';
import { ago, useAdmin } from '../../lib/admin/data';
import { Box, Cols, Kpi, Line, Loading, Page } from '../../lib/admin/parts';

/* Πληρωμές: η προμήθεια της πλατφόρμας (ποσοστό σε κάθε online πληρωμή, migration 018) και οι τελευταίες πληρωμές.
   Τα χρήματα πάνε στον λογαριασμό Viva κάθε καταστήματος· η Viva κρατά την προμήθεια για τον λογαριασμό ISV της πλατφόρμας. */
export default function Payments() {
  const router = useRouter();
  const [v, setV] = useState(0);
  const { data: o, error } = useAdmin<any>('admin_payments', {}, [v]);
  const [pct, setPct] = useState('');
  useEffect(() => { if (o) setPct(String(o.commission_pct ?? '').replace('.', ',')); }, [o?.commission_pct]);
  const save = async () => {
    const n = Number(pct.replace(',', '.'));
    try {
      const r = await rpc<any>('admin_set_commission', { p_pct: n });
      if (r?.ok === false) say('Δεν αποθηκεύτηκε', r.error); else { say('Αποθηκεύτηκε ✓', `Οι νέες πληρωμές θα έχουν προμήθεια ${pct}%.`); setV(v + 1); }
    } catch (e: any) { say('Δεν αποθηκεύτηκε', e.message); }
  };
  return (
    <Page title="Πληρωμές" sub="Πληρωμές πακέτων μέσα στην εφαρμογή (Viva)">
      {!o ? <Loading error={error} /> : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Kpi n={price(o.month_total)} label="Πληρωμές αυτόν τον μήνα" />
            <Kpi n={price(o.month_fee)} label="Η προμήθειά σου" />
            <Kpi n={o.shops_online ?? 0} label="Καταστήματα με online πληρωμή" />
          </View>
          <Cols
            main={<Box title="Τελευταίες πληρωμές">
              {(o.recent ?? []).length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Καμία πληρωμή ακόμα.</Text>}
              {(o.recent ?? []).map((p: any, i: number, a: any[]) => (
                <Line key={p.id} last={i === a.length - 1} title={`${p.package} · ${price(p.amount_cents)}`}
                  sub={`${p.business} · ${p.name || 'Πελάτης'} · ${ago(p.paid_at)}`} onPress={() => router.push(`/admin/shop/${p.business_id}` as any)}
                  right={<Text style={{ color: C.text, fontWeight: '800' }}>+{price(p.fee_cents)}</Text>} />
              ))}
            </Box>}
            side={<Box title="Προμήθεια">
              <View style={{ gap: 10, paddingVertical: 6 }}>
                <Input label="Ποσοστό σε κάθε πληρωμή (%)" value={pct} onChangeText={setPct} keyboardType="decimal-pad" />
                <Text style={{ color: C.mute, fontSize: 13 }}>Ισχύει για τις νέες πληρωμές. Η χρέωση της Viva είναι ξεχωριστή και την πληρώνει το κατάστημα.</Text>
                <Btn title="Αποθήκευση" onPress={save} />
              </View>
            </Box>} />
        </>
      )}
    </Page>
  );
}
