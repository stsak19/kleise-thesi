import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../lib/Txt';
import { Page } from '../lib/account/Page';
import { Photo } from '../lib/Photo';
import { say } from '../lib/alert';
import { usePerson } from '../lib/profile/data';
import { styleOf } from '../lib/presets';
import { rpc, sb } from '../lib/supabase';
import { Btn, C, Card, Icon, IconBubble, Input, Toggle, alpha, catLabel, iso, s } from '../lib/ui';

/* Αίτηση αφαίρεσης επιχείρησης (μόνο ο ιδιοκτήτης, από Ρυθμίσεις καταστήματος → Στοιχεία).
   Η επιχείρηση αφαιρείται 7 μέρες μετά την αίτηση· ως τότε δουλεύει κανονικά και η αίτηση ακυρώνεται από εδώ.
   Η αφαίρεση γίνεται από τη βάση (process_business_removals, migration 021). */
const GRACE = 7;
const REASONS: { key: string; emoji: string; label: string; sub: string }[] = [
  { key: 'Έκλεισε η επιχείρηση', emoji: '🔒', label: 'Έκλεισε η επιχείρηση', sub: 'Σταματήσαμε να λειτουργούμε' },
  { key: 'Δεν χρησιμοποιώ πια το SpotOn', emoji: '💤', label: 'Δεν χρησιμοποιώ πια το SpotOn', sub: 'Κλείνουμε ραντεβού αλλιώς' },
  { key: 'Πάω σε άλλη πλατφόρμα', emoji: '🔁', label: 'Πάω σε άλλη πλατφόρμα', sub: 'Βρήκαμε κάτι που μας ταιριάζει καλύτερα' },
  { key: 'Διπλή καταχώριση', emoji: '👯', label: 'Είναι διπλή καταχώριση', sub: 'Η επιχείρηση υπάρχει ήδη στο SpotOn' },
  { key: 'Άλλος λόγος', emoji: '✍️', label: 'Άλλος λόγος', sub: 'Γράψε μας παρακάτω' },
];
const dayAfter = (from: string | Date) => { const d = new Date(new Date(from).getTime() + GRACE * 864e5); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };

export default function RemoveBusiness() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { uid } = usePerson();
  const [b, setB] = useState<any>(undefined);
  const [upcoming, setUpcoming] = useState(0);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return setB(null);
    const { data } = await sb.from('businesses').select('*').eq('id', String(id)).maybeSingle();
    setB(data ?? null);
    const { count } = await sb.from('bookings').select('id', { count: 'exact', head: true })
      .eq('business_id', String(id)).eq('status', 'booked').gte('date', iso(new Date()));
    setUpcoming(count ?? 0);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!reason) return say('Διάλεξε έναν λόγο');
    if (reason === 'Άλλος λόγος' && !note.trim()) return say('Γράψε μας τον λόγο', 'Λίγες λέξεις αρκούν.');
    setBusy(true);
    try {
      const r = await rpc<{ ok: boolean; error?: string; requested_at?: string }>('request_business_removal', { p_business: b.id, p_reason: reason, p_note: note.trim() || null });
      if (!r?.ok) throw new Error(r?.error);
      await load();
      say('Η αίτηση στάλθηκε', `Η επιχείρηση θα αφαιρεθεί στις ${dayAfter(r.requested_at ?? new Date())}. Ως τότε μπορείς να την ακυρώσεις από εδώ.`);
    } catch (e: any) { say('Δεν στάλθηκε η αίτηση', e?.message); }
    setBusy(false);
  };
  const cancel = async () => {
    setBusy(true);
    try {
      const r = await rpc<{ ok: boolean; error?: string }>('cancel_business_removal', { p_business: b.id });
      if (!r?.ok) throw new Error(r?.error);
      await load(); setSure(false);
      say('Η αίτηση ακυρώθηκε', 'Η επιχείρηση μένει στο SpotOn όπως ήταν.');
    } catch (e: any) { say('Δεν ακυρώθηκε', e?.message); }
    setBusy(false);
  };

  const title = 'Αφαίρεση επιχείρησης';
  if (b === undefined) return <Page title={title}><View /></Page>;
  if (!b || b.owner_id !== uid) return (
    <Page title={title}>
      <Card style={{ gap: 8, alignItems: 'center', paddingVertical: 24 }}>
        <IconBubble name="lock" size={56} color={C.mute} />
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, textAlign: 'center' }}>Μόνο ο ιδιοκτήτης μπορεί να ζητήσει αφαίρεση</Text>
        <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center' }}>Συνδέσου με τον λογαριασμό που έφτιαξε την επιχείρηση.</Text>
      </Card>
    </Page>
  );

  const color = styleOf(b).color;
  const head = (
    <View style={[s.row, { gap: 14, backgroundColor: C.card, borderRadius: 20, padding: 14 }]}>
      <View style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: b.logo_url ? 'transparent' : C.bg }}>
        <Photo uri={b.logo_url} color={color} letter={String(b.name || 'Κ').slice(0, 1)} style={{ borderRadius: 16 }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }} numberOfLines={1}>{b.name}</Text>
        <Text style={{ color: C.mute, fontSize: 14 }} numberOfLines={1}>{[catLabel(b.category), b.city].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );

  /* ---------- Υπάρχει ήδη αίτηση ---------- */
  if (b.removal_requested_at) return (
    <Page title={title}>
      {head}
      <Card style={{ gap: 14, alignItems: 'center', paddingVertical: 24 }}>
        <IconBubble name="clock" size={64} color={C.bad} />
        <View style={{ gap: 6, alignItems: 'center' }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 20, textAlign: 'center' }}>Η αίτηση αφαίρεσης είναι σε εξέλιξη</Text>
          <Text style={{ color: C.mute, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Η επιχείρηση θα αφαιρεθεί οριστικά από το SpotOn στις {dayAfter(b.removal_requested_at)}. Ως τότε όλα δουλεύουν κανονικά και μπορείς να αλλάξεις γνώμη.
          </Text>
          {!!b.removal_reason && <Text style={{ color: C.text, fontSize: 14, fontWeight: '700', marginTop: 4 }}>Λόγος: {b.removal_reason}</Text>}
        </View>
        <Btn title={busy ? 'Μια στιγμή…' : 'Ακύρωση αίτησης'} onPress={cancel} disabled={busy} style={{ alignSelf: 'stretch' }} />
      </Card>
    </Page>
  );

  /* ---------- Νέα αίτηση ---------- */
  const on = dayAfter(new Date());
  const steps: [string, string, string][] = [
    ['Σήμερα', 'Στέλνεις την αίτηση', 'Η σελίδα σου και οι κρατήσεις δουλεύουν κανονικά.'],
    [`Ως ${on}`, 'Μπορείς να την ακυρώσεις', 'Από αυτή τη σελίδα, με ένα πάτημα. Δεν χάνεται τίποτα.'],
    [on, 'Η επιχείρηση αφαιρείται', `Σβήνονται η σελίδα, οι υπηρεσίες, τα πακέτα και το ιστορικό της.${upcoming ? ` Τα ${upcoming} επόμενα ραντεβού ακυρώνονται και οι πελάτες ενημερώνονται.` : ''}`],
  ];
  return (
    <Page title={title} sub="Λυπούμαστε που φεύγεις. Πες μας τι έγινε και θα τη βγάλουμε από το SpotOn.">
      {head}

      <View style={{ gap: 10 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>Γιατί θέλεις να αφαιρεθεί;</Text>
        <View style={{ backgroundColor: C.card, borderRadius: 20, overflow: 'hidden' }}>
          {REASONS.map((r, i) => {
            const sel = reason === r.key;
            return (
              <Pressable key={r.key} onPress={() => setReason(r.key)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
                style={({ pressed, hovered }: any) => [s.row, { gap: 12, paddingVertical: 13, paddingHorizontal: 14,
                  borderTopWidth: i ? 1 : 0, borderTopColor: C.line, backgroundColor: sel ? alpha(C.text, 0.06) : pressed || hovered ? alpha(C.text, 0.03) : 'transparent' }]}>
                <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{r.emoji}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{r.label}</Text>
                  <Text style={{ color: C.mute, fontSize: 13 }}>{r.sub}</Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: sel ? C.text : C.line, alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.text }} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Input label={reason === 'Άλλος λόγος' ? 'Πες μας τον λόγο' : 'Θέλεις να μας πεις κάτι ακόμα; (προαιρετικό)'} multiline maxLength={600}
          placeholder="π.χ. τι θα μπορούσαμε να κάνουμε καλύτερα" value={note} onChangeText={setNote} style={{ minHeight: 90, textAlignVertical: 'top' } as any} />
        <Text style={{ color: C.mute, fontSize: 12, alignSelf: 'flex-end' }}>{note.length}/600</Text>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>Τι θα γίνει</Text>
        <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 16, gap: 0 }}>
          {steps.map(([when, what, more], i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 22 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 2 ? C.bad : C.text }}>
                  <Text style={{ color: C.bg, fontWeight: '800', fontSize: 12 }}>{i + 1}</Text>
                </View>
                {i < steps.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: C.line, marginVertical: 4 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 16 : 0, gap: 2 }}>
                <Text style={{ color: i === 2 ? C.bad : C.mute, fontWeight: '800', fontSize: 12, letterSpacing: 0.3 }}>{when}</Text>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{what}</Text>
                <Text style={{ color: C.mute, fontSize: 14, lineHeight: 20 }}>{more}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Pressable onPress={() => setSure((v) => !v)} style={[s.row, { gap: 12, backgroundColor: alpha(C.bad, 0.08), borderRadius: 18, padding: 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.bad, fontWeight: '800', fontSize: 15 }}>Καταλαβαίνω ότι η αφαίρεση είναι οριστική</Text>
          <Text style={{ color: C.bad, fontSize: 13, opacity: 0.85 }}>Μετά τις {on} η επιχείρηση δεν επανέρχεται.</Text>
        </View>
        <Toggle value={sure} onChange={setSure} />
      </Pressable>

      <Btn title={busy ? 'Μια στιγμή…' : 'Στείλε αίτηση αφαίρεσης'} color={C.bad} onPress={send} disabled={busy || !reason || !sure} />
      <View style={[s.row, { gap: 8, justifyContent: 'center' }]}>
        <Icon name="lock" size={13} color={C.mute} />
        <Text style={{ color: C.mute, fontSize: 12.5 }}>Τη βλέπει μόνο η ομάδα του SpotOn.</Text>
      </View>
    </Page>
  );
}
