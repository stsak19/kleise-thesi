import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../lib/Txt';
import { Page } from '../lib/account/Page';
import { say } from '../lib/alert';
import { setActiveBiz } from '../lib/owner/active';
import { accessLabel } from '../lib/owner/Invite';
import { rpc } from '../lib/supabase';
import { Btn, C, Card, Empty, IconBubble } from '../lib/ui';

/* Ο υπάλληλος άνοιξε τον σύνδεσμο πρόσκλησης: βλέπει ποια επιχείρηση τον καλεί και μπαίνει στην ομάδα.
   Χρειάζεται λογαριασμό· αν δεν είναι συνδεδεμένος, η σύνδεση ανοίγει πρώτα και μετά γυρίζει εδώ. */
type Info = { ok: boolean; error?: string; business?: string; business_id?: string; staff?: string; access?: string };

export default function Join() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!code) { setInfo({ ok: false, error: 'Ο σύνδεσμος δεν είναι σωστός.' }); return; }
    rpc<Info>('staff_invite_info', { p_code: String(code).toUpperCase() }).then(setInfo).catch((e) => setInfo({ ok: false, error: e.message }));
  }, [code]);

  const accept = async () => {
    setBusy(true);
    try {
      const r = await rpc<{ ok: boolean; error?: string; business_id?: string }>('accept_staff_invite', { p_code: String(code).toUpperCase() });
      if (!r.ok) throw new Error(r.error);
      if (r.business_id) setActiveBiz(r.business_id);
      say(`Καλώς ήρθες στην ομάδα!`, `Από εδώ και πέρα βλέπεις το πρόγραμμά σου στο «${info?.business}».`);
      router.replace('/');
    } catch (e: any) { say('Δεν έγινε', e?.message); }
    setBusy(false);
  };

  return (
    <Page title="Πρόσκληση στην ομάδα">
      {!info ? null : !info.ok ? (
        <Card><Empty icon="team" title="Η πρόσκληση δεν βρέθηκε" text={info.error} /></Card>
      ) : (
        <Card style={{ gap: 14, alignItems: 'center', paddingVertical: 24 }}>
          <IconBubble name="team" size={64} />
          <View style={{ gap: 6, alignItems: 'center' }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 21, textAlign: 'center' }}>{info.business}</Text>
            <Text style={{ color: C.mute, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
              Σε προσκαλεί ως «{info.staff}» με ρόλο {accessLabel(info.access)}.{'\n'}
              {info.access === 'manager' ? 'Θα βλέπεις όλο το πρόγραμμα και θα κλείνεις για όλους.' : 'Θα βλέπεις τα δικά σου ραντεβού, το ωράριό σου και τους πελάτες σου.'}
            </Text>
          </View>
          <Btn title={busy ? 'Μια στιγμή…' : 'Μπες στην ομάδα'} onPress={accept} disabled={busy} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}
    </Page>
  );
}
