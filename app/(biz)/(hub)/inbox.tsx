import { say } from '../../../lib/alert';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { rpc, sb } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Avatar, Btn, C, Card, Chip, Empty, Group, Icon, Input, ScreenHeader, Section, T, alpha, fmtDay, s } from '../../../lib/ui';
import { styleOf } from '../../../lib/presets';

type Client = { user_id: string; name: string; phone: string | null; last: string | null };

const TEMPLATES: { label: string; title: string; body: string }[] = [
  { label: '🔒 Κλειστά', title: 'Αλλαγή ωραρίου', body: 'Την [μέρα] θα είμαστε κλειστά. Ευχαριστούμε για την κατανόηση!' },
  { label: '🆕 Νέες ώρες', title: 'Νέες ώρες', body: 'Ανοίξαμε νέες ώρες για την επόμενη εβδομάδα. Κλείσε τη θέση σου από την εφαρμογή!' },
  { label: '🎁 Προσφορά', title: 'Προσφορά', body: 'Αυτή την εβδομάδα έχουμε έκπτωση 20% σε όλες τις υπηρεσίες.' },
  { label: '⏰ Υπενθύμιση', title: 'Υπενθύμιση', body: 'Σε περιμένουμε στο ραντεβού σου. Αν δεν μπορείς να έρθεις, ακύρωσέ το από την εφαρμογή.' },
];

/* Καρτέλα «Μηνύματα» της λειτουργίας επιχείρησης. Μηνύματα και ειδοποιήσεις από την επιχείρηση στους πελάτες της: σε όλους ή σε έναν.
   Φτάνουν στον πελάτη στις «Ειδοποιήσεις» της καρτέλας Κρατήσεις. */
export default function Messages() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ to?: string }>();
  const [biz, setBiz] = useState<any>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [to, setTo] = useState<string | null>(params.to ?? null); // null = όλοι
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [q, setQ] = useState('');
  const [sending, setSending] = useState(false);
  // «Μήνυμα» από το πρόγραμμα: ανοίγει την καρτέλα με τον πελάτη ήδη επιλεγμένο.
  useEffect(() => { if (params.to) setTo(params.to); }, [params.to]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data } = await sb.from('businesses').select('*').eq('owner_id', session!.user.id).maybeSingle();
      setBiz(data);
      if (data) setClients(await rpc<Client[]>('owner_clients', { p_business: data.id }).catch(() => []));
    })();
  }, [session]));

  if (!biz) return <View style={s.screen} />;
  const brand = styleOf(biz).color;
  const list = clients ?? [];
  const target = to ? list.find((c) => c.user_id === to) : null;
  const shown = list.filter((c) => !q.trim() || (c.name + ' ' + (c.phone ?? '')).toLowerCase().includes(q.trim().toLowerCase()));

  const send = async () => {
    if (!body.trim()) return say('Γράψε το μήνυμα');
    if (!to && list.length === 0) return say('Δεν έχεις ακόμα πελάτες', 'Τα μηνύματα πηγαίνουν σε όσους έχουν κλείσει θέση στο κατάστημά σου.');
    const go = async () => {
      setSending(true);
      try {
        const r = await rpc('owner_notify', { p_business: biz.id, p_user: to, p_title: title.trim(), p_body: body.trim() });
        if (r && r.ok === false) say('Δεν στάλθηκε', r.error);
        else { say('Στάλθηκε ✓', to ? `Στον/στην ${target?.name || 'πελάτη'}.` : `Σε ${r?.sent ?? list.length} πελάτες.`); setBody(''); setTitle(''); }
      } catch (e: any) {
        say('Δεν στάλθηκε', e.message.includes('owner_notify') ? 'Χρειάζεται ενημέρωση της βάσης (supabase/migrations/003).' : e.message);
      }
      setSending(false);
    };
    if (to) return go();
    say('Αποστολή σε όλους;', `Το μήνυμα θα σταλεί σε ${list.length} ${list.length === 1 ? 'πελάτη' : 'πελάτες'}.`,
      [{ text: 'Άκυρο', style: 'cancel' }, { text: 'Αποστολή', onPress: go }]);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled">
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title="Μηνύματα" sub="Σε όλους τους πελάτες σου ή σε έναν" />
      </View>
      <Section title="Προς" />
      <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4 }}>
        {[{ k: false, label: `👥 Όλοι (${list.length})` }, { k: true, label: target ? `👤 ${target.name.split(' ')[0]}` : '👤 Ένας πελάτης' }].map((o) => {
          const on = !!to === o.k;
          return (
            <Pressable key={String(o.k)} onPress={() => setTo(o.k ? to ?? list[0]?.user_id ?? null : null)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: on ? C.card : 'transparent' }}>
              <Text style={{ color: on ? brand : C.mute, fontWeight: '700' }} numberOfLines={1}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!!to && <>
        {list.length > 6 && <Input icon="search" placeholder="Αναζήτηση πελάτη" value={q} onChangeText={setQ} />}
        <Group>
          {shown.length === 0 && <View style={{ padding: 16 }}><T mute>Δεν βρέθηκε πελάτης.</T></View>}
          {shown.slice(0, 30).map((c, i) => {
            const on = c.user_id === to;
            return (
              <Pressable key={c.user_id} onPress={() => setTo(c.user_id)}
                style={[s.row, { gap: 12, padding: 12, backgroundColor: on ? alpha(brand, 0.08) : 'transparent' },
                  i < Math.min(shown.length, 30) - 1 && { borderBottomWidth: 1, borderBottomColor: alpha(C.text, 0.08) }]}>
                <Avatar name={c.name || '?'} color={brand} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{c.name || 'Χωρίς όνομα'}</Text>
                  <Text style={{ color: C.mute, fontSize: 12 }}>{[c.phone, c.last && `τελευταία κράτηση ${fmtDay(c.last)}`].filter(Boolean).join(' · ')}</Text>
                </View>
                {on && <Icon name="check" size={18} color={brand} />}
              </Pressable>
            );
          })}
        </Group>
      </>}

      <Section title="Μήνυμα" sub="Γρήγορα πρότυπα" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {TEMPLATES.map((t) => <Chip key={t.label} label={t.label} onPress={() => { setTitle(t.title); setBody(t.body); }} />)}
      </ScrollView>
      <Card style={{ gap: 12 }}>
        <Input label="Τίτλος (προαιρετικά)" placeholder="π.χ. Αλλαγή ωραρίου" value={title} maxLength={120} onChangeText={setTitle} />
        <Input label="Κείμενο" placeholder="Γράψε το μήνυμα για τους πελάτες σου…" multiline maxLength={1000} value={body} onChangeText={setBody} />
        {/* Πώς θα το δει ο πελάτης */}
        <View style={{ backgroundColor: C.soft, borderRadius: 14, padding: 12, gap: 2 }}>
          <Text style={{ color: C.mute, fontSize: 11, fontWeight: '700' }}>ΕΤΣΙ ΘΑ ΤΟ ΔΕΙ Ο ΠΕΛΑΤΗΣ</Text>
          <Text style={{ color: C.text, fontWeight: '800' }}>{biz.name}{title.trim() ? ` · ${title.trim()}` : ''}</Text>
          <Text style={{ color: C.text }}>{body.trim() || '…'}</Text>
        </View>
      </Card>
      <Btn icon="bell" title={sending ? 'Αποστολή…' : to ? `Αποστολή σε ${target?.name || 'πελάτη'}` : `Αποστολή σε όλους (${list.length})`}
        color={brand} disabled={sending || !body.trim()} onPress={send} />

      {clients !== null && list.length === 0 && (
        <Empty emoji="📭" title="Δεν έχεις ακόμα πελάτες" text="Μόλις κάποιος κλείσει θέση, θα μπορείς να του στείλεις μήνυμα." />
      )}
    </ScrollView>
  );
}
