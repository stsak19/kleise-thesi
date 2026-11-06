import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { say } from '../../../lib/alert';
import { rpc, sb } from '../../../lib/supabase';
import { PLAN_KIND, kindOf } from '../../../lib/owner/kinds';
import { NoBiz, useClients, useMyBiz } from '../../../lib/owner/hub';
import { Btn, C, Card, Chip, Empty, Input, Pill, T, price, s } from '../../../lib/ui';

/* «Πακέτα / Συνδρομές / Κάρτες»: ό,τι πουλάει η επιχείρηση πέρα από μία επίσκεψη, με πόσους το έχουν τώρα. */
export default function Plans() {
  const biz = useMyBiz();
  const [list, setList] = useState<any[] | null>(null);
  const { list: clients } = useClients(biz);
  const [adding, setAdding] = useState(false);
  const [reqs, setReqs] = useState<any[]>([]);
  const [f, setF] = useState({ name: '', kind: 'pack', price: '', sessions: '', days: '30' });

  const load = useCallback(() => {
    if (!biz) return;
    sb.from('packages').select('*').eq('business_id', biz.id).eq('active', true).then(({ data, error }) => setList(error ? [] : data ?? []));
    rpc<any[]>('owner_package_requests', { p_business: biz.id }).then((x) => setReqs(x ?? [])).catch(() => setReqs([]));
  }, [biz?.id]);
  useFocusEffect(load);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;
  const k = kindOf(biz.category);
  const holders = (name: string) => (clients ?? []).filter((c) => c.pack?.name === name).length;

  /* Αφαίρεση: το πακέτο κρύβεται από τους πελάτες· όσοι το έχουν ήδη το κρατούν μέχρι να λήξει. */
  const remove = (p: any) => say('Αφαίρεση πακέτου', `Το «${p.name}» δεν θα φαίνεται πια στους πελάτες. Όσοι το έχουν ήδη το κρατούν.`, [
    { text: 'Άκυρο', style: 'cancel' },
    { text: 'Αφαίρεση', style: 'destructive', onPress: async () => { const { error } = await sb.from('packages').update({ active: false }).eq('id', p.id); if (error) say('Δεν έγινε', error.message); load(); } }]);

  const add = async () => {
    if (!f.name.trim() || !f.price.trim()) return say('Γράψε όνομα και τιμή');
    const { error } = await sb.from('packages').insert({ business_id: biz.id, name: f.name.trim(), kind: f.kind, price_cents: Math.round(parseFloat(f.price.replace(',', '.')) * 100),
      sessions: f.sessions ? +f.sessions : null, days: f.days ? +f.days : null, note: null, active: true });
    if (error) return say('Δεν αποθηκεύτηκε', error.message);
    setF({ name: '', kind: 'pack', price: '', sessions: '', days: '30' }); setAdding(false); load();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]}>
      <Stack.Screen options={{ title: k.plans }} />
      <T mute>{k.plansText}</T>
      <T mute style={{ fontSize: 13 }}>Οι πελάτες βλέπουν τα πακέτα στη σελίδα του καταστήματος και πατούν «Το θέλω». Εσύ το ενεργοποιείς από το Πρόγραμμα όταν πληρωθεί.</T>
      {!biz.uses_credits && (list ?? []).some((p) => p.sessions) && (
        <Card flat><T style={{ fontSize: 13.5 }}>Για να αφαιρείται μία επίσκεψη σε κάθε κράτηση, άνοιξε τα «Πακέτα κρατήσεων (καρνέ)» στους Κανόνες.</T></Card>
      )}

      {list && list.length === 0 && <Card><Empty icon="pack" title="Δεν έχεις πακέτα ακόμα" text="Πρόσθεσε πακέτα, συνδρομές ή δωροκάρτες για να τα βλέπουν οι πελάτες σου." /></Card>}

      {(list ?? []).map((p) => {
        const n = holders(p.name);
        const asked = reqs.filter((r) => r.package_id === p.id).length;
        const line = [p.sessions ? `${p.sessions} ${p.sessions === 1 ? 'επίσκεψη' : 'επισκέψεις'}` : p.kind === 'sub' ? 'Απεριόριστα' : null,
          p.days ? (p.days >= 365 ? 'ισχύει 1 χρόνο' : `ισχύει ${p.days} μέρες`) : null].filter(Boolean).join(' · ');
        return (
          <Card key={p.id} style={{ gap: 8 }}>
            <View style={[s.row, { gap: 8 }]}>
              <Pill text={PLAN_KIND[p.kind] ?? 'Πακέτο'} />
              {p.popular && <Pill text="Το πιο δημοφιλές" tone="accent" />}
            </View>
            <View style={[s.row, { alignItems: 'flex-end', gap: 10 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{p.name}</Text>
                {!!line && <T mute style={{ fontSize: 14 }}>{line}</T>}
              </View>
              <Text style={{ color: C.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.6 }}>{p.price_cents ? price(p.price_cents) : 'Δωρεάν'}</Text>
            </View>
            {!!p.note && <T style={{ fontSize: 14 }}>{p.note}</T>}
            <View style={[s.row, { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, marginTop: 2, gap: 10 }]}>
              <T mute style={{ fontSize: 13, flex: 1 }}>{[n > 0 ? `${n} ${n === 1 ? 'πελάτης το έχει' : 'πελάτες το έχουν'} τώρα` : '', asked > 0 ? `${asked} το ζήτησαν` : ''].filter(Boolean).join(' · ') || 'Κανείς ακόμα'}</T>
              <Btn size="sm" kind="danger" title="Αφαίρεση" onPress={() => remove(p)} />
            </View>
          </Card>
        );
      })}

      {adding ? (
        <Card style={{ gap: 10 }}>
          <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
            {Object.entries(PLAN_KIND).map(([key, label]) => <Chip key={key} label={label} on={f.kind === key} onPress={() => setF({ ...f, kind: key })} />)}
          </View>
          <Input label="Όνομα" placeholder="π.χ. 10 επισκέψεις" value={f.name} onChangeText={(name) => setF({ ...f, name })} />
          <View style={[s.row, { gap: 10 }]}>
            <View style={{ flex: 1 }}><Input label="Τιμή €" keyboardType="decimal-pad" value={f.price} onChangeText={(v) => setF({ ...f, price: v })} /></View>
            <View style={{ flex: 1 }}><Input label="Επισκέψεις" keyboardType="number-pad" placeholder="—" value={f.sessions} onChangeText={(v) => setF({ ...f, sessions: v })} /></View>
            <View style={{ flex: 1 }}><Input label="Μέρες" keyboardType="number-pad" value={f.days} onChangeText={(v) => setF({ ...f, days: v })} /></View>
          </View>
          <View style={[s.row, { gap: 10 }]}>
            <Btn kind="ghost" title="Άκυρο" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            <Btn title="Προσθήκη" onPress={add} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : <Btn kind="ghost" icon="plus" title="Νέο πακέτο" onPress={() => setAdding(true)} />}
    </ScrollView>
  );
}
