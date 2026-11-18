import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { say } from '../../../lib/alert';
import { rpc, sb } from '../../../lib/supabase';
import { PLAN_KIND, kindOf } from '../../../lib/owner/kinds';
import { NoBiz, useClients, useMyBiz } from '../../../lib/owner/hub';
import { Btn, C, Card, Empty, Pill, T, price, s } from '../../../lib/ui';
import { PackFields, blankPack, packMissing, savePack, toForm, type PackForm } from '../../../lib/owner/packs';

/* «Πακέτα / Συνδρομές / Κάρτες»: ό,τι πουλάει η επιχείρηση πέρα από μία επίσκεψη, με πόσους το έχουν τώρα.
   Ανοίγει από το Κατάστημα και από τους Πελάτες. Κάθε πακέτο αλλάζει («Αλλαγή») ή αφαιρείται. */
export default function Plans() {
  const biz = useMyBiz();
  const [list, setList] = useState<any[] | null>(null);
  const { list: clients } = useClients(biz);
  const [adding, setAdding] = useState(false); // νέο πακέτο ή αλλαγή υπάρχοντος (f.id)
  const [reqs, setReqs] = useState<any[]>([]);
  const [f, setF] = useState<PackForm>(blankPack());
  const [svcs, setSvcs] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(() => {
    if (!biz) return;
    sb.from('packages').select('*').eq('business_id', biz.id).eq('active', true).then(({ data, error }) => setList(error ? [] : data ?? []));
    sb.from('services').select('id,name').eq('business_id', biz.id).eq('active', true).order('name').then(({ data }) => setSvcs(data ?? []));
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
    const bad = packMissing(f);
    if (bad) return say(bad);
    /* Για ποια μαθήματα (015_pack_services): με ένα ο πελάτης βλέπει μόνο εκείνο· με δύο ή περισσότερα του δείχνει και «Όλα».
       Όλα επιλεγμένα = κενό (ισχύει και για νέα μαθήματα). */
    if (svcs.length > 1 && !f.only.length) return say('Διάλεξε μάθημα', 'Πάτα σε ποιο μάθημα ισχύει το πακέτο. Μπορείς να διαλέξεις και περισσότερα μαζί.');
    const err = await savePack(f, biz.id, svcs.length);
    if (err) return say('Δεν αποθηκεύτηκε', err);
    setF(blankPack()); setAdding(false); load();
  };
  const edit = (p: any) => { const x = toForm(p); setF(x.only.length ? x : { ...x, only: svcs.map((y) => y.id) }); setAdding(true); };

  const form = (
    <Card style={{ gap: 10 }}>
      {!!f.id && <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>Αλλαγή «{f.name}»</Text>}
      <PackFields f={f} setF={setF} svcs={svcs} />
      {!!f.id && <T mute style={{ fontSize: 13 }}>Όσοι έχουν ήδη αυτό το πακέτο το κρατούν όπως το πήραν.</T>}
      <View style={[s.row, { gap: 10 }]}>
        <Btn kind="ghost" title="Άκυρο" onPress={() => { setAdding(false); setF(blankPack()); }} style={{ flex: 1 }} />
        <Btn title={f.id ? 'Αποθήκευση' : 'Προσθήκη'} onPress={add} style={{ flex: 1 }} />
      </View>
    </Card>
  );

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
          p.days ? (p.days >= 365 ? 'ισχύει 1 χρόνο' : `ισχύει ${p.days} μέρες`) : null,
          p.service_ids?.length ? `για ${svcs.filter((x) => p.service_ids.includes(x.id)).map((x) => x.name).join(', ')}` : null].filter(Boolean).join(' · ');
        return (
          adding && f.id === p.id ? <View key={p.id}>{form}</View> : <Card key={p.id} style={{ gap: 8 }}>
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
              <Btn size="sm" kind="ghost" title="Αλλαγή" onPress={() => edit(p)} />
              <Btn size="sm" kind="danger" title="Αφαίρεση" onPress={() => remove(p)} />
            </View>
          </Card>
        );
      })}

      {adding && !f.id ? form : !adding && <Btn kind="ghost" icon="plus" title="Νέο πακέτο" onPress={() => { setF(blankPack()); setAdding(true); }} />}
    </ScrollView>
  );
}
