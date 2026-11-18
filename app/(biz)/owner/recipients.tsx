import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../lib/Txt';
import { rpc } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Avatar, C, Icon, Input, T, alpha, fmtDay, s } from '../../../lib/ui';
import { styleOf } from '../../../lib/presets';
import { fetchMyBiz } from '../../../lib/owner/active';
import { groupsOf, setPicked, type Client, type GroupKey } from '../../../lib/owner/groups';
import { deskCol, useWide } from '../../../lib/owner/desk';

const TITLE: Record<GroupKey, string> = { tomorrow: 'Έχουν ραντεβού αύριο', pack: 'Τελειώνει το πακέτο τους', idle: 'Δεν ήρθαν 30+ μέρες', all: 'Όλοι οι πελάτες', one: 'Διάλεξε πελάτες' };

/* Σε ποιους: η ομάδα που πάτησες στα Μηνύματα, σε δική της σελίδα. Όλοι της ομάδας είναι επιλεγμένοι
   (στο «Διάλεξε πελάτες» κανένας)· βγάζεις ή βάζεις άτομα και πατάς το ✓ στο μαύρο πλαίσιο κάτω στη μέση. */
export default function Recipients() {
  const { g, sel } = useLocalSearchParams<{ g: GroupKey; sel?: string }>();
  const key = (g ?? 'all') as GroupKey;
  const { session } = useAuth();
  const router = useRouter();
  const wide = useWide();
  const bottom = useSafeAreaInsets().bottom;
  const [list, setList] = useState<Client[] | null>(null);
  const [brand, setBrand] = useState<string>(C.accent);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      const b = await fetchMyBiz(session!.user.id);
      if (!b) return setList([]);
      setBrand(styleOf(b).color);
      const all = await rpc<Client[]>('owner_clients', { p_business: b.id }).catch(() => []);
      const mine = groupsOf(all ?? [])[key];
      setList(mine);
      const pre = sel ? sel.split(',') : key === 'one' ? [] : mine.map((c) => c.user_id);
      setOn(new Set(pre.filter((id) => mine.some((c) => c.user_id === id))));
    })();
  }, [session, key]));

  const shown = (list ?? []).filter((c) => !q.trim() || (c.name + ' ' + (c.phone ?? '')).toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => setOn((v) => { const n = new Set(v); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = !!list?.length && on.size === list.length;
  const done = () => { setPicked({ group: key, ids: [...on] }); router.back(); };
  const sub = (c: Client) => key === 'tomorrow' && c.next ? `αύριο στις ${c.next.slice(11, 16)}`
    : key === 'pack' && c.pack ? `${c.pack.name} · μένουν ${c.pack.left}`
    : c.last ? `τελευταία επίσκεψη ${fmtDay(c.last)}` : c.phone ?? '';

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: TITLE[key] }} />
      <ScrollView contentContainerStyle={[{ padding: 20, gap: 12, paddingBottom: 130 + bottom }, deskCol(wide)]} keyboardShouldPersistTaps="handled">
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <T mute>{list === null ? 'Φόρτωση…' : `${on.size} από ${list.length} επιλεγμένοι`}</T>
          {!!list?.length && (
            <Pressable onPress={() => setOn(allOn ? new Set() : new Set(list.map((c) => c.user_id)))} hitSlop={8}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, textDecorationLine: 'underline' }}>{allOn ? 'Κανένας' : 'Όλοι'}</Text>
            </Pressable>
          )}
        </View>
        {(list?.length ?? 0) > 6 && <Input icon="search" placeholder="Αναζήτηση πελάτη" value={q} onChangeText={setQ} />}
        {list !== null && list.length === 0 && <T mute>Κανένας πελάτης σε αυτή την ομάδα τώρα.</T>}
        <View style={{ gap: 8 }}>
          {shown.map((c) => {
            const yes = on.has(c.user_id);
            return (
              <Pressable key={c.user_id} onPress={() => toggle(c.user_id)} accessibilityRole="checkbox" accessibilityState={{ checked: yes }}
                style={({ pressed }) => [s.row, { gap: 12, padding: 12, borderRadius: 16, borderWidth: yes ? 2 : 1, borderColor: yes ? C.text : C.line,
                  backgroundColor: yes ? alpha(brand, 0.06) : C.bg, opacity: pressed ? 0.8 : 1 }]}>
                <Avatar name={c.name || '?'} color={brand} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{c.name || 'Χωρίς όνομα'}</Text>
                  {!!sub(c) && <Text style={{ color: C.mute, fontSize: 12.5 }} numberOfLines={1}>{sub(c)}</Text>}
                </View>
                <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: yes ? C.text : C.line, backgroundColor: yes ? C.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {yes && <Icon name="check" size={15} color={C.bg} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {/* Το ✓: μαύρο, λίγο ορθογώνιο πλαίσιο κάτω στη μέση */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(bottom, 12) + 14, alignItems: 'center' }}>
        <Pressable onPress={done} disabled={!on.size} accessibilityRole="button" accessibilityLabel={`Έτοιμο, ${on.size} επιλεγμένοι`}
          style={({ pressed }) => ({ width: 96, height: 60, borderRadius: 18, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center',
            opacity: !on.size ? 0.35 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }], shadowColor: C.text, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } })}>
          <Icon name="check" size={28} color={C.bg} />
        </Pressable>
      </View>
    </View>
  );
}
