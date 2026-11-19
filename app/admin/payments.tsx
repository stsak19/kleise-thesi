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
  const setMode = (m: 'test' | 'viva') => {
    if (m === o?.pay_mode) return;
    const go = () => rpc<any>('admin_set_pay_mode', { p_mode: m }).then((r) => (r?.ok === false ? say('Δεν άλλαξε', r.error) : setV(v + 1))).catch((e) => say('Δεν άλλαξε', e.message));
    if (m === 'test') return go();
    say('Πραγματικές πληρωμές;', 'Βεβαιώσου ότι έχεις βάλει τα κλειδιά της Viva στη Supabase (οδηγίες Viva). Από εδώ και πέρα οι πελάτες χρεώνονται κανονικά.',
      [{ text: 'Άκυρο', style: 'cancel' }, { text: 'Ναι, Viva', onPress: go }]);
  };
  return (
    <Page title="Πληρωμές" sub={o?.pay_mode === 'viva' ? 'Πληρωμές πακέτων μέσω Viva' : 'Δοκιμαστικές πληρωμές · χωρίς χρέωση'}>
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
                <Line key={p.id} last={i === a.length - 1} title={`${p.package} · ${price(p.amount_cents)}${p.test ? ' · δοκιμαστική' : ''}`}
                  sub={`${p.business} · ${p.name || 'Πελάτης'} · ${ago(p.paid_at)}`} onPress={() => router.push(`/admin/shop/${p.business_id}` as any)}
                  right={<Text style={{ color: C.text, fontWeight: '800' }}>+{price(p.fee_cents)}</Text>} />
              ))}
            </Box>}
            side={<><Box title="Τρόπος πληρωμής">
              <View style={{ gap: 10, paddingVertical: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn size="sm" kind={o.pay_mode === 'viva' ? 'ghost' : 'primary'} title="Δοκιμαστικές" onPress={() => setMode('test')} style={{ flex: 1 }} />
                  <Btn size="sm" kind={o.pay_mode === 'viva' ? 'primary' : 'ghost'} title="Viva (πραγματικές)" onPress={() => setMode('viva')} style={{ flex: 1 }} />
                </View>
                <Text style={{ color: C.mute, fontSize: 13 }}>{o.pay_mode === 'viva'
                  ? 'Οι πελάτες πληρώνουν πραγματικά μέσω Viva, μόνο στα καταστήματα που έχουν συνδέσει λογαριασμό Viva.'
                  : 'Όλα τα καταστήματα δέχονται πληρωμή στην εφαρμογή, χωρίς χρέωση. Τα πακέτα ενεργοποιούνται κανονικά.'}</Text>
              </View>
            </Box><Box title="Προμήθεια">
              <View style={{ gap: 10, paddingVertical: 6 }}>
                <Input label="Ποσοστό σε κάθε πληρωμή (%)" value={pct} onChangeText={setPct} keyboardType="decimal-pad" />
                <Text style={{ color: C.mute, fontSize: 13 }}>Ισχύει για τις νέες πληρωμές. Η χρέωση της Viva είναι ξεχωριστή και την πληρώνει το κατάστημα.</Text>
                <Btn title="Αποθήκευση" onPress={save} />
              </View>
            </Box></>} />
        </>
      )}
    </Page>
  );
}
