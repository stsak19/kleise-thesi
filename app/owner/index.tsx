import { say, promptText } from '../../lib/alert';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { rpc, sb } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Btn, C, Card, DAYS, H, Input, T, fmtDay, iso, s } from '../../lib/ui';

/* Πίνακας επιχείρησης: πρόγραμμα ημέρας, check-in / δεν ήρθε / ακύρωση,
   εγκρίσεις νέων πελατών, ανανέωση πακέτων, κλειστές μέρες. */
export default function Owner() {
  const router = useRouter();
  const { session } = useAuth();
  const [biz, setBiz] = useState<any>(undefined);
  const [date, setDate] = useState(iso(new Date()));
  const [day, setDay] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    sb.from('businesses').select('*').eq('owner_id', session!.user.id).maybeSingle().then(({ data }) => setBiz(data ?? null));
  }, [session]));

  const load = useCallback(async () => {
    if (!biz) return;
    setLoading(true);
    const [d, p, o] = await Promise.all([
      rpc('owner_day', { p_business: biz.id, p_date: date }),
      rpc('owner_pending', { p_business: biz.id }),
      sb.from('day_overrides').select('*').eq('business_id', biz.id).eq('date', date).maybeSingle(),
    ]);
    setDay(d); setPending(p); setNote(o.data?.note ?? ''); setLoading(false);
  }, [biz, date]);
  useEffect(() => { load(); }, [load]);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return (
    <View style={[s.screen, s.pad]}>
      <H>Έχεις επιχείρηση;</H>
      <T mute>Γράψε την επιχείρησή σου και οι πελάτες σου θα κλείνουν θέση από την εφαρμογή.</T>
      <Btn title="Δημιουργία επιχείρησης" onPress={() => router.push('/owner/setup')} />
    </View>
  );

  const setStatus = async (b: any, st: string) => {
    const r = await rpc('owner_set_status', { p_booking: b.id, p_status: st }); if (!r.ok) say(r.error ?? 'Δεν έγινε'); load();
  };
  const toggleClosed = async (closed: boolean) => {
    await sb.from('day_overrides').upsert({ business_id: biz.id, date, closed, note: note || null }); load();
  };
  const renew = (u: any) => promptText('Ανανέωση πακέτου', `Πόσες κρατήσεις για ${u.client || 'τον πελάτη'};`, async (v) => {
    const n = parseInt(v, 10); if (n > 0) { await rpc('owner_renew', { p_business: biz.id, p_user: u.user_id, p_credits: n }); say('Ανανεώθηκε'); }
  });

  const week = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i - 2); return iso(d); });
  const byTime: Record<string, any[]> = {};
  day.forEach((b) => (byTime[b.time] ??= []).push(b));

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={s.row}>
        <H>{biz.name}</H>
        <View style={{ flex: 1 }} />
        <Btn kind="ghost" title="Ρυθμίσεις" onPress={() => router.push('/owner/setup')} />
      </View>
      {!biz.is_published && <Card style={{ borderColor: C.accent }}><T>Η επιχείρηση δεν φαίνεται ακόμα στην αναζήτηση. Ενεργοποίησε το «Δημοσίευση» στις Ρυθμίσεις.</T></Card>}

      {pending.length > 0 && <>
        <H>Νέοι πελάτες προς έγκριση</H>
        {pending.map((p) => (
          <Card key={p.user_id}>
            <T>{p.name || 'Χωρίς όνομα'} {p.phone ? `· ${p.phone}` : ''}</T>
            <View style={s.row}>
              <Btn title="Έγκριση" onPress={async () => { await rpc('owner_set_member', { p_business: biz.id, p_user: p.user_id, p_status: 'approved' }); load(); }} />
              <Btn kind="danger" title="Απόρριψη" onPress={async () => { await rpc('owner_set_member', { p_business: biz.id, p_user: p.user_id, p_status: 'blocked' }); load(); }} />
            </View>
          </Card>
        ))}
      </>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {week.map((d) => { const dd = new Date(d + 'T00:00'); const on = d === date; return (
          <Pressable key={d} onPress={() => setDate(d)} style={[s.chip, { alignItems: 'center' }, on && { backgroundColor: C.accent, borderColor: C.accent }]}>
            <Text style={{ color: on ? '#111' : C.mute, fontSize: 12 }}>{DAYS[dd.getDay()]}</Text>
            <Text style={{ color: on ? '#111' : C.text, fontWeight: '700' }}>{dd.getDate()}</Text>
          </Pressable>); })}
      </ScrollView>

      <H>Πρόγραμμα · {fmtDay(date)}</H>
      <Input placeholder="Σημείωμα ημέρας για τους πελάτες" value={note} onChangeText={setNote} onEndEditing={() => toggleClosed(false)} />
      <View style={s.row}>
        <Btn kind="ghost" title="Κλειστά σήμερα" onPress={() => toggleClosed(true)} />
        <Btn kind="ghost" title="Ανοιχτά" onPress={() => toggleClosed(false)} />
      </View>
      {day.length === 0 && <T mute>Καμία κράτηση.</T>}
      {Object.entries(byTime).map(([t, list]) => (
        <Card key={t}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{t} · {list.length}</Text>
          {list.map((b) => (
            <View key={b.id} style={{ gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line }}>
              <T>{b.client || 'Πελάτης'} — {b.service}{b.phone ? ` · ${b.phone}` : ''} {b.status === 'attended' ? '✅' : b.status === 'no_show' ? '❌' : ''}</T>
              <View style={[s.row, { flexWrap: 'wrap' }]}>
                <Btn kind="ghost" title="Ήρθε" onPress={() => setStatus(b, 'attended')} />
                <Btn kind="ghost" title="Δεν ήρθε" onPress={() => setStatus(b, 'no_show')} />
                <Btn kind="danger" title="Ακύρωση" onPress={() => setStatus(b, 'cancelled')} />
                {biz.uses_credits && <Btn kind="ghost" title="Ανανέωση" onPress={() => renew(b)} />}
              </View>
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
