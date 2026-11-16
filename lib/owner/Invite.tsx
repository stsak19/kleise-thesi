import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, Share, View } from 'react-native';
import { Text } from '../Txt';
import { say } from '../alert';
import { sb } from '../supabase';
import { Btn, C, alpha, s } from '../ui';

/* Πρόσκληση υπαλλήλου (εκδοχή Α): ο ιδιοκτήτης διαλέγει τι θα βλέπει και στέλνει σύνδεσμο σε Viber/WhatsApp/SMS.
   Ο υπάλληλος ανοίγει τον σύνδεσμο (app/join.tsx), συνδέεται και μπαίνει στην ομάδα. */
export type Access = 'staff' | 'manager';
const ACCESS: { key: Access; title: string; sub: string }[] = [
  { key: 'staff', title: 'Υπάλληλος', sub: 'Βλέπει και αλλάζει μόνο τα δικά του ραντεβού, το ωράριό του και τους πελάτες του.' },
  { key: 'manager', title: 'Υπεύθυνος', sub: 'Βλέπει όλο το πρόγραμμα και κλείνει για όλους. Χωρίς ρυθμίσεις, πακέτα και έσοδα.' },
];
export const accessLabel = (a?: string) => (a === 'manager' ? 'Υπεύθυνος' : 'Υπάλληλος');

const newCode = () => Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const SITE = 'https://stsak19.github.io/kleise-thesi';
const linkFor = (code: string) => {
  const base = Platform.OS === 'web' && typeof location !== 'undefined' ? location.origin + (location.pathname.startsWith('/kleise-thesi') ? '/kleise-thesi' : '') : SITE;
  return `${base}/join?code=${code}`;
};

export function InviteSheet({ person, biz, onClose }: { person: any; biz: any; onClose: (changed: boolean) => void }) {
  const [access, setAccess] = useState<Access>(person.access === 'manager' ? 'manager' : 'staff');
  const [code, setCode] = useState<string | null>(person.invite_code ?? null);
  const [busy, setBusy] = useState(false);

  // Ο σύνδεσμος φτιάχνεται (ή ανανεώνεται με τον ρόλο) τη στιγμή που πάει να σταλεί.
  const ensure = async () => {
    const c = code ?? newCode();
    if (c === person.invite_code && access === person.access) return c;
    setBusy(true);
    const { error } = await sb.from('staff').update({ invite_code: c, access }).eq('id', person.id);
    setBusy(false);
    if (error) { say('Δεν φτιάχτηκε η πρόσκληση', error.message); return null; }
    person.invite_code = c; person.access = access; setCode(c);
    return c;
  };
  const text = (c: string) => `Γεια σου! Σε προσκαλώ στην ομάδα του «${biz.name}» στο SpotOn. Άνοιξε τον σύνδεσμο για να δεις το πρόγραμμά σου: ${linkFor(c)}`;
  const send = async (how: 'copy' | 'viber' | 'whatsapp' | 'sms' | 'other') => {
    const c = await ensure(); if (!c) return;
    const t = text(c), e = encodeURIComponent(t);
    if (how === 'copy') {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(linkFor(c)).catch(() => {}); say('Ο σύνδεσμος αντιγράφηκε'); }
      else Share.share({ message: t });
      return;
    }
    const url = how === 'viber' ? `viber://forward?text=${e}` : how === 'whatsapp' ? `https://wa.me/?text=${e}` : how === 'sms' ? `sms:?&body=${e}` : null;
    if (!url) { Share.share({ message: t }); return; }
    Linking.openURL(url).catch(() => Share.share({ message: t }));
  };
  const cancel = async () => {
    await sb.from('staff').update({ invite_code: null }).eq('id', person.id);
    person.invite_code = null; onClose(true);
  };

  const APPS: { key: 'viber' | 'whatsapp' | 'sms' | 'other'; label: string; bg: string; ch: string }[] = [
    { key: 'viber', label: 'Viber', bg: '#7360f2', ch: 'V' }, { key: 'whatsapp', label: 'WhatsApp', bg: '#25d366', ch: 'W' },
    { key: 'sms', label: 'SMS', bg: '#0a0a0a', ch: '✉' }, { key: 'other', label: 'Άλλο', bg: '#9a9a9a', ch: '…' },
  ];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable onPress={() => onClose(false)} style={{ flex: 1, backgroundColor: alpha('#000000', 0.38), justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 480, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderRadius: Platform.OS === 'web' ? 28 : undefined, padding: 20, paddingTop: 10, paddingBottom: 30, gap: 12 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 4 }} />
          <View style={{ gap: 4 }}>
            <Text style={{ color: C.text, fontSize: 21, fontWeight: '800' }}>Πρόσκληση: {person.name}</Text>
            <Text style={{ color: C.mute, fontSize: 14, lineHeight: 20 }}>Ανοίγει τον σύνδεσμο, φτιάχνει λογαριασμό και μπαίνει κατευθείαν στην ομάδα σου.</Text>
          </View>
          {ACCESS.map((o) => {
            const on = o.key === access;
            return (
              <Pressable key={o.key} onPress={() => setAccess(o.key)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={[s.row, { gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: on ? C.text : C.line, backgroundColor: on ? C.card : 'transparent' }]}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 2, borderColor: on ? C.text : C.mute, marginTop: 1 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{o.title}</Text>
                  <Text style={{ color: C.mute, fontSize: 13, lineHeight: 18 }}>{o.sub}</Text>
                </View>
              </Pressable>
            );
          })}
          <Pressable onPress={() => send('copy')} style={({ pressed }) => [s.row, { gap: 8, backgroundColor: C.soft, borderRadius: 14, padding: 14, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ flex: 1, color: C.mute, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{code ? linkFor(code).replace(/^https?:\/\//, '') : 'Ο σύνδεσμος φτιάχνεται μόλις τον στείλεις'}</Text>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>Αντιγραφή</Text>
          </Pressable>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            {APPS.map((a) => (
              <Pressable key={a.key} onPress={() => send(a.key)} disabled={busy} style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 5, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 19 }}>{a.ch}</Text>
                </View>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 12 }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
          {code ? <Btn kind="ghost" title="Ακύρωση πρόσκλησης" onPress={cancel} /> : <Btn kind="ghost" title="Κλείσιμο" onPress={() => onClose(false)} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
