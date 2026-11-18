import { say } from '../../../lib/alert';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { rpc, sb } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Avatar, Btn, C, Card, Chip, Empty, Group, Icon, Input, ScreenHeader, Section, T, alpha, fmtDay, iso, s } from '../../../lib/ui';
import { styleOf } from '../../../lib/presets';
import { fetchMyBiz, useActiveBizId } from '../../../lib/owner/active';
import { deskCol, useWide } from '../../../lib/owner/desk';
import { groupsOf, takePicked, type Client, type GroupKey } from '../../../lib/owner/groups';

/* Έξυπνες ομάδες (εκδοχή Α, 2026-11-18): η εφαρμογή βρίσκει μόνη της σε ποιους να στείλεις, από τα owner_clients
   (επόμενη κράτηση, πακέτο, τελευταία επίσκεψη). Κάθε ομάδα έχει έτοιμο κείμενο· το {Όνομα} και η {Ώρα} συμπληρώνονται για τον καθένα. */
const GROUPS: { key: GroupKey; emoji: string; title: string; sub: string; msgTitle: string; body: string }[] = [
  { key: 'tomorrow', emoji: '📅', title: 'Έχουν ραντεβού αύριο', sub: 'υπενθύμιση', msgTitle: 'Υπενθύμιση',
    body: 'Γεια σου {Όνομα}! Σε περιμένουμε αύριο στις {Ώρα}. Αν δεν μπορείς να έρθεις, ακύρωσε από την εφαρμογή.' },
  { key: 'pack', emoji: '🎟️', title: 'Τελειώνει το πακέτο τους', sub: 'μένουν 1–2 επισκέψεις', msgTitle: 'Το πακέτο σου',
    body: 'Γεια σου {Όνομα}! Σου μένουν {Επισκέψεις} στο πακέτο. Ανανέωσέ το στο κατάστημα για να συνεχίσεις χωρίς διακοπή.' },
  { key: 'idle', emoji: '💤', title: 'Δεν ήρθαν 30+ μέρες', sub: 'να τους ξαναφέρεις', msgTitle: 'Μας έλειψες',
    body: 'Γεια σου {Όνομα}! Καιρό έχουμε να σε δούμε. Κλείσε την επόμενη θέση σου από την εφαρμογή, σε περιμένουμε!' },
  { key: 'all', emoji: '👥', title: 'Όλοι οι πελάτες', sub: 'ανακοίνωση', msgTitle: '', body: '' },
  { key: 'one', emoji: '👤', title: 'Διάλεξε πελάτες', sub: 'έναν ή περισσότερους', msgTitle: '', body: '' },
];
const EXTRA: { label: string; title: string; body: string }[] = [
  { label: '🔒 Κλειστά', title: 'Αλλαγή ωραρίου', body: 'Την [μέρα] θα είμαστε κλειστά. Ευχαριστούμε για την κατανόηση!' },
  { label: '🆕 Νέες ώρες', title: 'Νέες ώρες', body: 'Ανοίξαμε νέες ώρες για την επόμενη εβδομάδα. Κλείσε τη θέση σου από την εφαρμογή!' },
  { label: '🎁 Προσφορά', title: 'Προσφορά', body: 'Αυτή την εβδομάδα έχουμε έκπτωση 20% σε όλες τις υπηρεσίες.' },
];
const VARS = ['Όνομα', 'Ώρα', 'Επισκέψεις'];
const first = (n?: string) => (n ?? '').trim().split(' ')[0] || '';
/* Το κείμενο για έναν πελάτη: αντικαθιστά τα {…}. Αν λείπει μια τιμή, φεύγει και η λέξη (π.χ. «Γεια σου !» → «Γεια σου!»). */
const render = (t: string, c?: Client | null) => t
  .replace(/\{Όνομα\}/g, first(c?.name))
  .replace(/\{Ώρα\}/g, c?.next ? c.next.slice(11, 16) : '')
  .replace(/\{Επισκέψεις\}/g, c?.pack?.left != null ? `${c.pack.left} ${c.pack.left === 1 ? 'επίσκεψη' : 'επισκέψεις'}` : '')
  .replace(/ +([!,.])/g, '$1').replace(/ {2,}/g, ' ').trim();

/* Καρτέλα «Μηνύματα» της λειτουργίας επιχείρησης: μηνύματα από την επιχείρηση στους πελάτες της.
   Φτάνουν στον πελάτη στις «Ειδοποιήσεις». */
export default function Messages() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ to?: string }>();
  const active = useActiveBizId();
  const [biz, setBiz] = useState<any>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [group, setGroup] = useState<GroupKey>(params.to ? 'one' : 'all');
  const [ids, setIds] = useState<string[] | null>(params.to ? [params.to] : null); // οι επιλεγμένοι της σελίδας «Σε ποιους»· null = όλη η ομάδα
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [q, setQ] = useState('');
  const [sending, setSending] = useState(false);
  const wide = useWide();
  // «Μήνυμα» από το πρόγραμμα: ανοίγει την καρτέλα με τον πελάτη ήδη επιλεγμένο.
  useEffect(() => { if (params.to) { setGroup('one'); setIds([params.to]); } }, [params.to]);

  useFocusEffect(useCallback(() => {
    // Γύρισε από τη σελίδα «Σε ποιους» με ✓: κρατά την ομάδα, τους επιλεγμένους και το έτοιμο κείμενο.
    const p = takePicked();
    if (p) { setGroup(p.group); setIds(p.ids); const g = GROUPS.find((x) => x.key === p.group)!; if (g.body) { setTitle(g.msgTitle); setBody(g.body); } }
    (async () => {
      const data = await fetchMyBiz(session!.user.id);
      setBiz(data);
      if (data) setClients(await rpc<Client[]>('owner_clients', { p_business: data.id }).catch(() => []));
    })();
  }, [session, active]));

  const list = clients ?? [];
  const members = useMemo(() => groupsOf(list), [clients]);

  if (!biz) return <View style={s.screen} />;
  const brand = styleOf(biz).color;
  const rec = ids ? list.filter((c) => ids.includes(c.user_id)) : group === 'one' ? [] : members[group];
  const personal = /\{[^}]+\}/.test(body); // με {…} στέλνεται ξεχωριστό μήνυμα στον καθένα

  // Πάτημα ομάδας → ανοίγει η σελίδα «Σε ποιους» με τα άτομα (app/(biz)/owner/recipients).
  const pick = (k: GroupKey) => router.push({ pathname: '/owner/recipients', params: { g: k, ...(k === group && ids ? { sel: ids.join(',') } : {}) } } as any);

  const send = async () => {
    if (!body.trim()) return say('Γράψε το μήνυμα');
    if (!rec.length) return say('Κανένας πελάτης σε αυτή την ομάδα');
    const go = async () => {
      setSending(true);
      try {
        let sent = 0;
        if (group === 'all' && !ids && !personal) {
          const r = await rpc('owner_notify', { p_business: biz.id, p_user: null, p_title: title.trim(), p_body: body.trim() });
          if (r && r.ok === false) throw new Error(r.error);
          sent = r?.sent ?? rec.length;
        } else {
          // Ένα μήνυμα ανά πελάτη, με το δικό του όνομα/ώρα (5 τη φορά).
          for (let i = 0; i < rec.length; i += 5) {
            const rs = await Promise.all(rec.slice(i, i + 5).map((c) => rpc('owner_notify', { p_business: biz.id, p_user: c.user_id, p_title: render(title, c), p_body: render(body, c) }).catch(() => null)));
            sent += rs.filter((r: any) => r && r.ok !== false).length;
          }
        }
        say('Στάλθηκε ✓', rec.length === 1 ? `Στον/στην ${rec[0].name || 'πελάτη'}.` : `Σε ${sent} πελάτες.`);
        setBody(''); setTitle('');
      } catch (e: any) { say('Δεν στάλθηκε', e.message); }
      setSending(false);
    };
    if (rec.length === 1) return go();
    say('Αποστολή;', `Το μήνυμα θα σταλεί σε ${rec.length} πελάτες.`, [{ text: 'Άκυρο', style: 'cancel' }, { text: 'Αποστολή', onPress: go }]);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }, deskCol(wide)]} keyboardShouldPersistTaps="handled">
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title="Μηνύματα" sub="Σε ποιους να στείλεις;" />
      </View>
      <Section title="Σε ποιους" />
      <View style={{ gap: 8 }}>
        {GROUPS.map((g) => {
          const on = group === g.key && (!!ids || g.key !== 'one');
          const n = on && ids ? ids.length : g.key === 'one' ? null : members[g.key].length;
          const off = n === 0 && g.key !== 'all' && g.key !== 'one';
          return (
            <Pressable key={g.key} onPress={() => pick(g.key)} disabled={off} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={({ pressed }) => [s.row, { gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, borderWidth: on ? 2 : 1,
                borderColor: on ? C.text : C.line, backgroundColor: C.bg, opacity: off ? 0.45 : pressed ? 0.8 : 1 }]}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{g.title}</Text>
                <Text style={{ color: C.mute, fontSize: 12.5 }} numberOfLines={1}>{on && ids ? (rec.length <= 2 ? rec.map((c) => c.name).join(', ') : `${rec.length} επιλεγμένοι`) || g.sub : g.sub}</Text>
              </View>
              {n !== null && <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{n}</Text>}
              <Icon name="chevron" size={14} color={C.mute} />
            </Pressable>
          );
        })}
      </View>


      <Section title={GROUPS.find((g) => g.key === group)?.body ? 'Μήνυμα (έτοιμο)' : 'Μήνυμα'} />
      {!GROUPS.find((g) => g.key === group)?.body && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
          {EXTRA.map((t) => <Chip key={t.label} label={t.label} onPress={() => { setTitle(t.title); setBody(t.body); }} />)}
        </ScrollView>
      )}
      <Card style={{ gap: 12 }}>
        <Input label="Τίτλος (προαιρετικά)" placeholder="π.χ. Αλλαγή ωραρίου" value={title} maxLength={120} onChangeText={setTitle} />
        <Input label="Κείμενο" placeholder="Γράψε το μήνυμα για τους πελάτες σου…" multiline maxLength={1000} value={body} onChangeText={setBody} />
        <View style={[s.row, { gap: 6, flexWrap: 'wrap' }]}>
          <Text style={{ color: C.mute, fontSize: 12.5, fontWeight: '700' }}>Βάλε:</Text>
          {VARS.map((v) => (
            <Pressable key={v} onPress={() => setBody((b) => (b && !b.endsWith(' ') ? b + ' ' : b) + `{${v}}`)}
              style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 8, backgroundColor: C.text }}>
              <Text style={{ color: C.bg, fontSize: 12.5, fontWeight: '700' }}>+ {v}</Text>
            </Pressable>
          ))}
        </View>
        {/* Πώς θα το δει ο πρώτος πελάτης της ομάδας */}
        <View style={{ backgroundColor: C.soft, borderRadius: 14, padding: 12, gap: 2 }}>
          <Text style={{ color: C.mute, fontSize: 11, fontWeight: '700' }}>{rec[0] ? `ΕΤΣΙ ΘΑ ΤΟ ΔΕΙ ${(first(rec[0].name) || 'Ο ΠΕΛΑΤΗΣ').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}` : 'ΕΤΣΙ ΘΑ ΤΟ ΔΕΙ Ο ΠΕΛΑΤΗΣ'}</Text>
          <Text style={{ color: C.text, fontWeight: '800' }}>{biz.name}{title.trim() ? ` · ${render(title, rec[0])}` : ''}</Text>
          <Text style={{ color: C.text }}>{render(body, rec[0]) || '…'}</Text>
        </View>
      </Card>
      <Btn icon="bell" title={sending ? 'Αποστολή…' : rec.length === 1 ? `Αποστολή σε ${rec[0].name || 'πελάτη'}` : `Αποστολή σε ${rec.length} πελάτες`}
        color={brand} disabled={sending || !body.trim() || !rec.length} onPress={send} />

      {clients !== null && list.length === 0 && (
        <Empty emoji="📭" title="Δεν έχεις ακόμα πελάτες" text="Μόλις κάποιος κλείσει θέση, θα μπορείς να του στείλεις μήνυμα." />
      )}
    </ScrollView>
  );
}
