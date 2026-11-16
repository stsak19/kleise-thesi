import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../lib/Txt';
import { Page } from '../lib/account/Page';
import { say } from '../lib/alert';
import { usePerson } from '../lib/profile/data';
import { rpc, sb } from '../lib/supabase';
import { Btn, C, Card, IconBubble, Input, alpha } from '../lib/ui';
import { GRACE_DAYS, dayOf, useDeletion } from '../lib/account/deletion';

/* Διαγραφή λογαριασμού με αίτηση: ο χρήστης τη ζητά (με τον κωδικό του) και ο λογαριασμός σβήνεται 7 μέρες μετά.
   Ως τότε μπορεί να την ακυρώσει από εδώ. Η διαγραφή γίνεται από τη βάση (process_account_deletions, migration 006). */
export default function DeleteAccount() {
  const { uid, email } = usePerson();
  const { at, reload, deleteOn } = useDeletion(uid);
  const [biz, setBiz] = useState<string[]>([]);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (uid) sb.from('businesses').select('id,name').eq('owner_id', uid).then(({ data }) => setBiz((data ?? []).map((b: any) => b.name)));
  }, [uid]);

  const request = async () => {
    if (!pass) return say('Γράψε τον κωδικό σου');
    setBusy(true);
    const chk = await sb.auth.signInWithPassword({ email, password: pass });
    if (chk.error) { setBusy(false); return say('Λάθος κωδικός', 'Δοκίμασε ξανά.'); }
    try {
      const r = await rpc<{ ok: boolean; error?: string; requested_at?: string }>('request_account_deletion');
      if (!r?.ok) throw new Error(r?.error);
      setPass(''); reload();
      say('Η αίτηση στάλθηκε', `Ο λογαριασμός σου θα διαγραφεί στις ${dayOf(r.requested_at ?? new Date().toISOString())}. Ως τότε μπορείς να την ακυρώσεις από εδώ.`);
    } catch (e: any) { say('Δεν στάλθηκε η αίτηση', e?.message); }
    setBusy(false);
  };
  const cancel = async () => {
    setBusy(true);
    try { await rpc('cancel_account_deletion'); reload(); say('Η αίτηση ακυρώθηκε', 'Ο λογαριασμός σου μένει όπως ήταν.'); }
    catch (e: any) { say('Δεν ακυρώθηκε', e?.message); }
    setBusy(false);
  };

  if (at === undefined) return <Page title="Διαγραφή λογαριασμού"><View /></Page>;
  if (at) return (
    <Page title="Διαγραφή λογαριασμού">
      <Card style={{ gap: 14, alignItems: 'center', paddingVertical: 24 }}>
        <IconBubble name="clock" size={64} color={C.bad} />
        <View style={{ gap: 6, alignItems: 'center' }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 20, textAlign: 'center' }}>Η αίτηση διαγραφής είναι σε εξέλιξη</Text>
          <Text style={{ color: C.mute, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Ο λογαριασμός σου θα διαγραφεί οριστικά στις {deleteOn}. Ως τότε όλα δουλεύουν κανονικά, και μπορείς να αλλάξεις γνώμη.
          </Text>
        </View>
        <Btn title={busy ? 'Μια στιγμή…' : 'Ακύρωση αίτησης'} onPress={cancel} disabled={busy} style={{ alignSelf: 'stretch' }} />
      </Card>
    </Page>
  );

  const shops = biz.length === 1 ? `Το κατάστημα «${biz[0]}» θα κλείσει` : biz.length > 1
    ? `Οι ${biz.length} επιχειρήσεις σου (${biz.slice(0, 3).join(', ')}${biz.length > 3 ? '…' : ''}) θα κλείσουν` : '';
  return (
    <Page title="Διαγραφή λογαριασμού">
      <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 6 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>Πώς γίνεται</Text>
        <Text style={{ color: C.mute, fontSize: 15, lineHeight: 22 }}>
          Στέλνεις αίτηση και ο λογαριασμός σου διαγράφεται σε {GRACE_DAYS} μέρες. Ως τότε όλα δουλεύουν κανονικά και μπορείς να ακυρώσεις την αίτηση από εδώ, ώστε να μη χαθεί τίποτα κατά λάθος.
        </Text>
      </View>
      <View style={{ backgroundColor: alpha(C.bad, 0.08), borderRadius: 18, padding: 16, gap: 8 }}>
        <Text style={{ color: C.bad, fontWeight: '700', fontSize: 15, lineHeight: 22 }}>
          Στη διαγραφή χάνονται οριστικά: προφίλ, κρατήσεις, πακέτα, μηνύματα. Οι μελλοντικές σου κρατήσεις ακυρώνονται και ενημερώνονται τα καταστήματα.
        </Text>
        {!!shops && <Text style={{ color: C.bad, fontWeight: '700', fontSize: 15, lineHeight: 22 }}>
          {shops} και θα ακυρωθούν τα μελλοντικά ραντεβού, με ειδοποίηση στους πελάτες.
        </Text>}
      </View>
      <Input label="Γράψε τον κωδικό σου" icon="lock" placeholder="Κωδικός" secureTextEntry autoCapitalize="none" value={pass} onChangeText={setPass} />
      <Btn title={busy ? 'Μια στιγμή…' : 'Στείλε αίτηση διαγραφής'} color={C.bad} onPress={request} disabled={busy || !pass} />
    </Page>
  );
}
