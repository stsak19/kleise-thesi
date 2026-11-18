import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../lib/Txt';
import { Btn, C, Icon, alpha, onColor } from '../lib/ui';
import { confirmPayment } from '../lib/pay';

/* Η σελίδα επιστροφής από τη Viva (Success / Failure URL της πηγής πληρωμών): …/paid?s=<orderCode>&t=<transactionId>.
   Επιβεβαιώνει την πληρωμή (viva-pay confirm) και δείχνει ότι το πακέτο ενεργοποιήθηκε.
   Χωρίς t (ο πελάτης ακύρωσε ή η κάρτα απορρίφθηκε) δείχνει «Η πληρωμή δεν ολοκληρώθηκε». */
export default function Paid() {
  const router = useRouter();
  const p = useLocalSearchParams<{ s?: string; t?: string }>();
  const [res, setRes] = useState<{ ok: boolean; error?: string; business_id?: string; package?: string } | null>(null);
  useEffect(() => {
    if (!p.s || !p.t) { setRes({ ok: false, error: 'Η πληρωμή ακυρώθηκε ή δεν έγινε. Δεν χρεώθηκες.' }); return; }
    confirmPayment(String(p.s), String(p.t)).then(setRes).catch(() => setRes({ ok: false, error: 'Δεν μπορέσαμε να ελέγξουμε την πληρωμή.' }));
  }, [p.s, p.t]);

  const color = res?.ok ? C.tint : C.mute;
  const toStore = () => (res?.business_id ? router.replace(`/store/${res.business_id}` as any) : router.replace('/'));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 28 }}>
      {!res ? (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color={C.text} />
          <Text style={{ color: C.mute, fontSize: 16 }}>Ελέγχουμε την πληρωμή…</Text>
        </View>
      ) : (
        <>
          <View style={{ alignItems: 'center', gap: 16 }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: alpha(color, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={res.ok ? 'check' : 'close'} size={42} color={onColor(color)} />
              </View>
            </View>
            <Text style={{ color: C.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' }}>
              {res.ok ? 'Πληρώθηκε! 🎉' : 'Η πληρωμή δεν ολοκληρώθηκε'}
            </Text>
            <Text style={{ color: C.mute, fontSize: 16, textAlign: 'center' }}>
              {res.ok ? `Το «${res.package ?? 'πακέτο'}» ενεργοποιήθηκε. Μπορείς να κλείσεις θέση.` : res.error}
            </Text>
          </View>
          <View style={{ gap: 12 }}>
            <Btn title={res.ok ? 'Κλείσε θέση' : 'Πίσω στο κατάστημα'} onPress={toStore} />
            <Btn kind="ghost" title="Αρχική" onPress={() => router.replace('/')} />
          </View>
        </>
      )}
    </View>
  );
}
