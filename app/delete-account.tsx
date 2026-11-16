import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../lib/Txt';
import { Page } from '../lib/account/Page';
import { say } from '../lib/alert';
import { signOut, usePerson } from '../lib/profile/data';
import { rpc, sb } from '../lib/supabase';
import { Btn, C, Input, alpha } from '../lib/ui';

/* Διαγραφή λογαριασμού (εκδοχή Β): λέει τι χάνεται, ζητά τον κωδικό και σβήνει οριστικά.
   Αν ο χρήστης έχει επιχείρηση, κλείνει κι αυτή και ακυρώνονται τα μελλοντικά της ραντεβού (rpc delete_my_account, migration 006). */
export default function DeleteAccount() {
  const { uid, email } = usePerson();
  const [biz, setBiz] = useState<string[]>([]);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (uid) sb.from('businesses').select('id,name').eq('owner_id', uid).then(({ data }) => setBiz((data ?? []).map((b: any) => b.name)));
  }, [uid]);

  const go = async () => {
    if (!pass) return say('Γράψε τον κωδικό σου');
    setBusy(true);
    const chk = await sb.auth.signInWithPassword({ email, password: pass });
    if (chk.error) { setBusy(false); return say('Λάθος κωδικός', 'Δοκίμασε ξανά.'); }
    try {
      const r = await rpc<{ ok: boolean; error?: string }>('delete_my_account');
      if (!r?.ok) throw new Error(r?.error ?? 'Δεν έγινε η διαγραφή');
    } catch (e: any) { setBusy(false); return say('Δεν έγινε η διαγραφή', e?.message); }
    await signOut();
    say('Ο λογαριασμός σου διαγράφηκε', 'Λυπούμαστε που φεύγεις. Μπορείς να ξαναγραφτείς όποτε θέλεις.');
  };

  const shops = biz.length === 1 ? `Το κατάστημα «${biz[0]}» κλείνει` : biz.length > 1
    ? `Οι ${biz.length} επιχειρήσεις σου (${biz.slice(0, 3).join(', ')}${biz.length > 3 ? '…' : ''}) κλείνουν` : '';
  return (
    <Page title="Διαγραφή λογαριασμού">
      <View style={{ backgroundColor: alpha(C.bad, 0.08), borderRadius: 18, padding: 16, gap: 8 }}>
        <Text style={{ color: C.bad, fontWeight: '700', fontSize: 15, lineHeight: 22 }}>
          Χάνονται οριστικά: προφίλ, κρατήσεις, πακέτα, μηνύματα. Οι μελλοντικές σου κρατήσεις ακυρώνονται και ενημερώνονται τα καταστήματα.
        </Text>
        {!!shops && <Text style={{ color: C.bad, fontWeight: '700', fontSize: 15, lineHeight: 22 }}>
          {shops} και ακυρώνονται τα μελλοντικά ραντεβού, με ειδοποίηση στους πελάτες.
        </Text>}
      </View>
      <Input label="Γράψε τον κωδικό σου" icon="lock" placeholder="Κωδικός" secureTextEntry autoCapitalize="none" value={pass} onChangeText={setPass} />
      <Btn title={busy ? 'Μια στιγμή…' : 'Διαγραφή οριστικά'} color={C.bad} onPress={go} disabled={busy || !pass} />
      <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center' }}>Θέλεις απλώς διάλειμμα; Μπορείς να αποσυνδεθείς.</Text>
      <Btn kind="ghost" title="Αποσύνδεση" onPress={signOut} />
    </Page>
  );
}
