import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { styleOf } from '../../../lib/presets';
import { kindOf } from '../../../lib/owner/kinds';
import { NoBiz, daysTo, packLine, useClients, useMyBiz } from '../../../lib/owner/hub';
import { Avatar, C, Card, Chip, Empty, Icon, Input, Pill, T, fmtDay, s } from '../../../lib/ui';

/* «Πελάτες / Μέλη / Αθλούμενοι / Ασθενείς»: όλοι όσοι έχουν κλείσει θέση, με αναζήτηση και γρήγορα φίλτρα. */
type F = 'all' | 'pack' | 'ending' | 'new';

export default function Clients() {
  const router = useRouter();
  const biz = useMyBiz();
  const { list } = useClients(biz);
  const [q, setQ] = useState('');
  const [f, setF] = useState<F>('all');

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;
  const k = kindOf(biz.category);
  const brand = styleOf(biz).color;
  const all = list ?? [];
  const ending = (c: any) => !!c.pack && ((c.pack.total > 0 && c.pack.left <= 1) || (daysTo(c.pack.expires) ?? 99) <= 7);
  const isNew = (c: any) => (daysTo(c.first) ?? -99) >= -30;
  const shown = all
    .filter((c) => f === 'all' || (f === 'pack' && c.pack) || (f === 'ending' && ending(c)) || (f === 'new' && isNew(c)))
    .filter((c) => !q.trim() || (c.name + ' ' + (c.phone ?? '')).toLowerCase().includes(q.trim().toLowerCase()));
  const hasPacks = all.some((c) => c.pack);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: k.clients }} />
      <Input icon="search" placeholder="Αναζήτηση με όνομα ή κινητό" value={q} onChangeText={setQ} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        <Chip label={`Όλοι ${all.length}`} on={f === 'all'} onPress={() => setF('all')} />
        {hasPacks && <Chip label="Με πακέτο" on={f === 'pack'} onPress={() => setF('pack')} />}
        {hasPacks && <Chip label="Λήγουν σύντομα" on={f === 'ending'} onPress={() => setF('ending')} />}
        <Chip label="Νέοι" on={f === 'new'} onPress={() => setF('new')} />
      </ScrollView>

      {list && shown.length === 0 && <Card><Empty icon="user" title="Κανείς εδώ" text={q ? 'Δεν βρέθηκε κανείς με αυτό το όνομα.' : 'Δεν υπάρχουν πελάτες σε αυτό το φίλτρο.'} /></Card>}

      {shown.length > 0 && (
        <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
          {shown.map((c, i) => (
            <Pressable key={c.user_id} onPress={() => router.push({ pathname: '/owner/client', params: { id: c.user_id } })}
              style={({ pressed }) => [s.row, { gap: 12, padding: 14, backgroundColor: pressed ? C.soft : 'transparent' }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <Avatar name={c.name} color={brand} size={42} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={[s.row, { gap: 8 }]}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, flexShrink: 1 }} numberOfLines={1}>{c.name}</Text>
                  {!!c.tag && <Pill text={c.tag} />}
                </View>
                <T mute style={{ fontSize: 13 }}>
                  {[c.visits != null ? `${c.visits} ${c.visits === 1 ? 'επίσκεψη' : 'επισκέψεις'}` : null, c.last ? `τελευταία ${fmtDay(c.last)}` : null].filter(Boolean).join(' · ')}
                </T>
                {!!c.pack && <Text style={{ color: ending(c) ? C.bad : C.mute, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{c.pack.total ? packLine(c.pack) : `${c.pack.name} · ${packLine(c.pack)}`}</Text>}
              </View>
              <Icon name="chevron" size={15} color={C.mute} />
            </Pressable>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
