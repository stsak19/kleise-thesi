import { say } from '../../../lib/alert';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { rpc, sb } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Avatar, Btn, C, Card, Chip, Empty, Group, Icon, Input, ScreenHeader, Section, T, alpha, fmtDay, iso, s } from '../../../lib/ui';
import { styleOf } from '../../../lib/presets';
import { fetchMyBiz, useActiveBizId } from '../../../lib/owner/active';
import { deskCol, useWide } from '../../../lib/owner/desk';

type Client = { user_id: string; name: string; phone: string | null; last: string | null; next?: string | null;
  pack?: { name: string; left: number | null; total: number | null; expires: string | null } | null };
type GroupKey = 'tomorrow' | 'pack' | 'idle' | 'all' | 'one';

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
  { key: 'one', emoji: '👤', title: 'Ένας πελάτης', sub: 'διάλεξε ποιον', msgTitle: '', body: '' },
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
  const [to, setTo] = useState<string | null>(params.to ?? null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [q, setQ] = useState('');
  const [sending, setSending] = useState(false);
  const wide = useWide();
  // «Μήνυμα» από το πρόγραμμα: ανοίγει την καρτέλα με τον πελάτη ήδη επιλεγμένο.
  useEffect(() => { if (params.to) { setGroup('one'); setTo(params.to); } }, [params.to]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const data = await fetchMyBiz(session!.user.id);
      setBiz(data);
      if (data) setClients(await rpc<Client[]>('owner_clients', { p_business: data.id }).catch(() => []));
    })();
  }, [session, active]));

  const list = clients ?? [];
  const members = useMemo(() => {
    const now = new Date(), today = iso(now);
    const tm = new Date(now); tm.setDate(tm.getDate() + 1); const tomorrow = iso(tm);
    const ago = new Date(now); ago.setDate(ago.getDate() - 30); const old = iso(ago);
    return {
      tomorrow: list.filter((c) => c.next?.slice(0, 10) === tomorrow),
      pack: list.filter((c) => c.pack && c.pack.left != null && c.pack.left <= 2 && (!c.pack.expires || c.pack.expires >= today)),
      idle: list.filter((c) => !c.next && !!c.last && c.last < old),
      all: list,
      one: list.filter((c) => c.user_id === to),
    } as Record<GroupKey, Client[]>;
  }, [clients, to]);

  if (!biz) return <View style={s.screen} />;
  const brand = styleOf(biz).color;
  const target = to ? list.find((c) => c.user_id === to) : null;
  const shown = list.filter((c) => !q.trim() || (c.name + ' ' + (c.phone ?? '')).toLowerCase().includes(q.trim().toLowerCase()));
  const rec = members[group];
  const personal = /\{[^}]+\}/.test(body); // με {…} στέλνεται ξεχωριστό μήνυμα στον καθένα

  const pick = (k: GroupKey) => {
    const g = GROUPS.find((x) => x.key === k)!;
    setGroup(k);
    if (k === 'one' && !to) setTo(list[0]?.user_id ?? null);
    if (g.body) { setTitle(g.msgTitle); setBody(g.body); }
    else if (GROUPS.some((x) => x.body && x.body === body)) { setTitle(''); setBody(''); } // έφυγε από ομάδα με έτοιμο κείμενο
  };

  const send = async () => {
    if (!body.trim()) return say('Γράψε το μήνυμα');
    if (!rec.length) return say('Κανένας πελάτης σε αυτή την ομάδα');
    const go = async () => {
      setSending(true);
      try {
        let sent = 0;
        if (group === 'all' && !personal) {
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
          const on = group === g.key, n = g.key === 'one' ? null : members[g.key].length;
          const off = n === 0 && g.key !== 'all';
          return (
            <Pressable key={g.key} onPress={() => pick(g.key)} disabled={off} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={({ pressed }) => [s.row, { gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16, borderWidth: on ? 2 : 1,
                borderColor: on ? C.text : C.line, backgroundColor: C.bg, opacity: off ? 0.45 : pressed ? 0.8 : 1 }]}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{g.key === 'one' && target ? target.name || 'Πελάτης' : g.title}</Text>
                <Text style={{ color: C.mute, fontSize: 12.5 }}>{g.sub}</Text>
              </View>
              {n !== null && <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{n}</Text>}
            </Pressable>
          );
        })}
      </View>

      {group === 'one' && <>
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
                  <Text style={{ color: C.mute, fontSize: 12 }}>{[c.phone, c.last && `τελευταία επίσκεψη ${fmtDay(c.last)}`].filter(Boolean).join(' · ')}</Text>
                </View>
                {on && <Icon name="check" size={18} color={brand} />}
              </Pressable>
            );
          })}
        </Group>
      </>}

      <Section title={GROUPS.find((g) => g.key === group)?.body ? 'Μήνυμα (έτοιμο)' : 'Μήνυμα'} />
      {(group === 'all' || group === 'one') && (
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
