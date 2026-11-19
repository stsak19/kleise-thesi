import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../lib/Txt';
import { Page } from '../lib/account/Page';
import { say } from '../lib/alert';
import { rpc, sb } from '../lib/supabase';
import { firePaid } from '../lib/pay';
import { Btn, C, Card, Input, alpha, price, s } from '../lib/ui';

/* Η οθόνη πληρωμής πακέτου. Μέχρι να μπει η Viva (018) είναι ΔΟΚΙΜΑΣΤΙΚΗ (019, pay_mode = 'test'):
   ίδια διαδικασία με την πραγματική (Apple Pay / Google Pay / κάρτα → «Πληρώθηκε»), χωρίς καμία χρέωση.
   Ανοίγει από το «Το θέλω» (lib/store/data.tsx → choosePack). Μετά πάει στην οθόνη /paid. */
type Method = 'card' | 'apple' | 'google';
const digits = (v: string) => v.replace(/\D/g, '');
const fmtCard = (v: string) => digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const fmtExp = (v: string) => { const d = digits(v).slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

export default function Checkout() {
  const p = useLocalSearchParams<{ pkg: string; store: string }>();
  const [pk, setPk] = useState<any>(null);
  const [card, setCard] = useState(''), [exp, setExp] = useState(''), [cvc, setCvc] = useState(''), [name, setName] = useState('');
  const [busy, setBusy] = useState<Method | null>(null);
  useEffect(() => {
    sb.from('packages').select('id,name,price_cents,sessions,days,businesses(name)').eq('id', p.pkg).single()
      .then(({ data }) => setPk(data ?? false));
  }, [p.pkg]);

  const pay = async (m: Method) => {
    if (m === 'card') {
      const mm = +exp.slice(0, 2);
      if (digits(card).length < 15) return say('Έλεγξε τον αριθμό της κάρτας');
      if (exp.length < 5 || mm < 1 || mm > 12) return say('Έλεγξε τη λήξη (ΜΜ/ΕΕ)');
      if (digits(cvc).length < 3) return say('Έλεγξε τον κωδικό CVC');
    }
    setBusy(m);
    await new Promise((r) => setTimeout(r, 1200)); // όπως η πραγματική έγκριση της τράπεζας
    try {
      const r = await rpc<any>('test_pay_package', { p_package: p.pkg, p_method: m });
      if (r?.ok === false) { setBusy(null); return say('Η πληρωμή δεν έγινε', r.error); }
      firePaid();
      router.replace({ pathname: '/paid', params: { done: '1', store: p.store, pkg: r?.package ?? pk?.name ?? '' } } as any);
    } catch (e: any) { setBusy(null); say('Η πληρωμή δεν έγινε', e.message); }
  };

  if (pk === null) return <Page title="Πληρωμή"><ActivityIndicator color={C.text} style={{ marginTop: 30 }} /></Page>;
  if (pk === false) return <Page title="Πληρωμή"><Text style={{ color: C.mute }}>Το πακέτο δεν βρέθηκε.</Text></Page>;
  const total = price(pk.price_cents);
  const line = [pk.sessions ? `${pk.sessions} επισκέψεις` : null, pk.days ? `ισχύει ${pk.days} μέρες` : null].filter(Boolean).join(' · ');
  const wallets: Method[] = Platform.OS === 'ios' ? ['apple'] : Platform.OS === 'android' ? ['google'] : ['apple', 'google'];

  return (
    <Page title="Πληρωμή" sub={pk.businesses?.name}>
      <View style={{ backgroundColor: alpha(C.tint, 0.1), borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 13.5 }}>Δοκιμαστική πληρωμή · δεν χρεώνεται τίποτα</Text>
      </View>
      <Card style={{ gap: 4 }}>
        <View style={[s.row, { alignItems: 'flex-end', gap: 10 }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>{pk.name}</Text>
            {!!line && <Text style={{ color: C.mute, fontSize: 13.5 }}>{line}</Text>}
          </View>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5 }}>{total}</Text>
        </View>
      </Card>

      {wallets.map((w) => (
        <Pressable key={w} onPress={() => !busy && pay(w)} accessibilityRole="button"
          style={({ pressed }) => [s.btn, { backgroundColor: '#000', borderColor: '#000', opacity: pressed ? 0.85 : 1 }]}>
          {busy === w ? <ActivityIndicator color="#fff" /> :
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Πληρωμή με {w === 'apple' ? 'Apple Pay' : 'Google Pay'}</Text>}
        </Pressable>
      ))}

      <View style={[s.row, { gap: 10, marginVertical: 4 }]}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600' }}>ή με κάρτα</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      </View>
      <Card style={{ gap: 12 }}>
        <Input label="Αριθμός κάρτας" value={card} onChangeText={(v) => setCard(fmtCard(v))} keyboardType="number-pad" placeholder="1234 5678 9012 3456" />
        <View style={[s.row, { gap: 12 }]}>
          <View style={{ flex: 1 }}><Input label="Λήξη" value={exp} onChangeText={(v) => setExp(fmtExp(v))} keyboardType="number-pad" placeholder="ΜΜ/ΕΕ" /></View>
          <View style={{ flex: 1 }}><Input label="CVC" value={cvc} onChangeText={(v) => setCvc(digits(v).slice(0, 4))} keyboardType="number-pad" placeholder="123" secureTextEntry /></View>
        </View>
        <Input label="Όνομα κατόχου" value={name} onChangeText={setName} autoCapitalize="characters" placeholder="ΟΠΩΣ ΣΤΗΝ ΚΑΡΤΑ" />
      </Card>
      {busy === 'card' ? <View style={[s.btn, { backgroundColor: C.btn }]}><ActivityIndicator color={C.btnText} /></View>
        : <Btn title={`Πλήρωσε ${total}`} onPress={() => !busy && pay('card')} />}
      <Text style={{ color: C.mute, fontSize: 12.5, textAlign: 'center' }}>Το πακέτο ενεργοποιείται αμέσως μόλις πληρωθεί.</Text>
    </Page>
  );
}
