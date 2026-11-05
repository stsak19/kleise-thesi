import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { say } from '../../../lib/alert';
import { rpc, sb } from '../../../lib/supabase';
import { styleOf } from '../../../lib/presets';
import { kindOf } from '../../../lib/owner/kinds';
import { Face, NoBiz, useMyBiz, useStaff } from '../../../lib/owner/hub';
import { Btn, C, Card, DAYS, Empty, Input, Pill, T, iso, s } from '../../../lib/ui';

/* «Η ομάδα»: ποιος δουλεύει στην επιχείρηση, ποιες μέρες, ποιες υπηρεσίες κάνει και πόσα ραντεβού έχει σήμερα. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function Team() {
  const biz = useMyBiz();
  const { staff, reload } = useStaff(biz);
  const [svcs, setSvcs] = useState<Record<string, string>>({});
  const [today, setToday] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  useFocusEffect(useCallback(() => {
    if (!biz) return;
    sb.from('services').select('id,name').eq('business_id', biz.id).then(({ data }) => setSvcs(Object.fromEntries((data ?? []).map((x: any) => [x.id, x.name]))));
    rpc<any[]>('owner_day', { p_business: biz.id, p_date: iso(new Date()) }).then((d) => {
      const c: Record<string, number> = {}; (d ?? []).forEach((b) => { if (b.staff_id) c[b.staff_id] = (c[b.staff_id] ?? 0) + 1; }); setToday(c);
    }).catch(() => {});
  }, [biz?.id]));

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;
  const k = kindOf(biz.category);
  const brand = styleOf(biz).color;

  const add = async () => {
    if (!name.trim()) return say('Γράψε όνομα');
    const { error } = await sb.from('staff').insert({ business_id: biz.id, name: name.trim(), role: role.trim() || null, color: brand, days: [1, 2, 3, 4, 5], services: Object.keys(svcs) });
    if (error) return say('Δεν αποθηκεύτηκε', error.message);
    setName(''); setRole(''); setAdding(false); reload();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]}>
      <Stack.Screen options={{ title: k.team }} />
      <T mute>{staff.length > 1 ? `${staff.length} άτομα · ${Object.values(today).reduce((a, b) => a + b, 0)} ραντεβού σήμερα` : k.solo}</T>

      {staff.length === 0 && <Card><Empty icon="user" title="Δεν έχεις προσθέσει ομάδα" text="Πρόσθεσε όσους δουλεύουν μαζί σου, ώστε ο καθένας να έχει το δικό του πρόγραμμα." /></Card>}

      {staff.map((p) => (
        <Card key={p.id} style={{ gap: 12 }}>
          <View style={[s.row, { gap: 14 }]}>
            <Face p={p} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>{p.name}</Text>
              {!!p.role && <T mute style={{ fontSize: 14 }}>{p.role}</T>}
            </View>
            <Pill text={`${today[p.id] ?? 0} σήμερα`} tone={today[p.id] ? 'accent' : 'mute'} />
          </View>
          {!!p.bio && <T style={{ fontSize: 14 }}>{p.bio}</T>}
          <View style={[s.row, { gap: 6 }]}>
            {WEEK.map((d) => {
              const on = (p.days ?? []).includes(d);
              return (
                <View key={d} style={{ flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center', backgroundColor: on ? C.btn : C.soft }}>
                  <Text style={{ color: on ? C.btnText : C.mute, fontWeight: '700', fontSize: 12 }}>{DAYS[d]}</Text>
                </View>
              );
            })}
          </View>
          {!!p.services?.length && (
            <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
              {p.services.filter((id: string) => svcs[id]).map((id: string) => (
                <View key={id} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: C.line }}>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{svcs[id]}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      ))}

      {adding ? (
        <Card style={{ gap: 10 }}>
          <Input label="Όνομα" placeholder="π.χ. Γιώργος Παππάς" value={name} onChangeText={setName} />
          <Input label="Ρόλος" placeholder="π.χ. Κομμωτής" value={role} onChangeText={setRole} />
          <View style={[s.row, { gap: 10 }]}>
            <Btn kind="ghost" title="Άκυρο" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            <Btn title="Προσθήκη" onPress={add} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : <Btn kind="ghost" icon="plus" title="Προσθήκη ατόμου" onPress={() => setAdding(true)} />}
    </ScrollView>
  );
}
