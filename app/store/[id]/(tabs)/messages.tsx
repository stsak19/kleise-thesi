import { useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../../../../lib/Txt';
import { Btn, C, TAB_SPACE } from '../../../../lib/ui';
import { useStore } from '../../../../lib/store/data';
import { StoreLogo, StoreTop } from '../../../../lib/store/parts';

const when = (ts: string) => {
  const d = new Date(ts), now = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return hm;
  return `${d.getDate()}/${d.getMonth() + 1} · ${hm}`;
};

/* Μηνύματα από το κατάστημα (ανακοινώσεις, αλλαγές προγράμματος). */
export default function StoreMessages() {
  const S = useStore();
  const [busy, setBusy] = useState(false);
  const refresh = async () => { setBusy(true); await S.reload(); setBusy(false); };
  const name = String(S.biz?.name ?? '');
  const phone = S.biz?.phone ? String(S.biz.phone).replace(/\s/g, '') : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title="Μηνύματα" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: TAB_SPACE }} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}>
        {S.messages.length === 0 && (
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 28 }}>💬</Text>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>Κανένα μήνυμα ακόμα</Text>
            <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>Εδώ θα βλέπεις ό,τι σου στέλνει το κατάστημα: αλλαγές στο πρόγραμμα, ανακοινώσεις και υπενθυμίσεις.</Text>
          </View>
        )}
        {S.messages.map((m) => {
          // Ο τίτλος είναι «Όνομα καταστήματος · θέμα»· εδώ δείχνουμε μόνο το θέμα.
          const subject = String(m.title).slice(name.length).replace(/^\s*·\s*/, '');
          return (
            <View key={m.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <StoreLogo size={30} />
              <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 18, borderBottomLeftRadius: 6, padding: 14, gap: 4 }}>
                {!!subject && <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{subject}</Text>}
                <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{m.body}</Text>
                <Text style={{ color: C.mute, fontSize: 11, alignSelf: 'flex-end' }}>{when(m.created_at)}</Text>
              </View>
            </View>
          );
        })}
        {!!phone && <Btn kind="ghost" icon="phone" title="Κλήση στο κατάστημα" onPress={() => Linking.openURL(`tel:${phone}`)} style={{ marginTop: 8 }} />}
      </ScrollView>
    </View>
  );
}
