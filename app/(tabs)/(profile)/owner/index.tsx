import { say, promptText } from '../../../../lib/alert';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { rpc, sb } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { Avatar, Btn, C, Card, DayStrip, Empty, Input, Pill, Section, T, alpha, fmtLong, iso, s } from '../../../../lib/ui';

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
  const [closed, setClosed] = useState(false);
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
    setDay(d); setPending(p); setNote(o.data?.note ?? ''); setClosed(!!o.data?.closed); setLoading(false);
  }, [biz, date]);
  useEffect(() => { load(); }, [load]);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return (
    <View style={[s.screen, s.pad, { justifyContent: 'center' }]}>
      <Card style={{ padding: 4 }}>
        <Empty emoji="🏪" title="Έχεις επιχείρηση;" text="Γράψε την επιχείρησή σου και οι πελάτες σου θα κλείνουν θέση από την εφαρμογή." />
        <View style={{ padding: 12, paddingTop: 0 }}><Btn title="Δημιουργία επιχείρησης" onPress={() => router.push('/owner/setup')} /></View>
      </Card>
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

  const brand: string = biz.brand_color || C.accent;
  const attended = day.filter((b) => b.status === 'attended').length;
  const Stat = ({ n, label, color }: { n: number; label: string; color?: string }) => (
    <Card style={{ flex: 1, padding: 14, gap: 2 }}>
      <Text style={{ color: color ?? C.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 }}>{n}</Text>
      <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Card>
  );
  const Seg = ({ on, label, onPress, color }: { on: boolean; label: string; onPress: () => void; color: string }) => (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: on ? C.card : 'transparent',
      boxShadow: on ? `0px 1px 3px ${alpha(C.text, 0.1)}` : undefined }}>
      <Text style={{ color: on ? color : C.mute, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
        <Avatar name={biz.name} color={brand} size={52} radius={16} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 18, letterSpacing: -0.3 }} numberOfLines={1}>{biz.name}</Text>
          <Pill text={biz.is_published ? '● Δημοσιευμένο' : '○ Μη δημοσιευμένο'} tone={biz.is_published ? 'ok' : 'mute'} />
        </View>
        <Btn kind="ghost" size="sm" title="Ρυθμίσεις" onPress={() => router.push('/owner/setup')} />
      </Card>
      {!biz.is_published && (
        <View style={{ backgroundColor: alpha(C.accent, 0.08), borderRadius: 16, padding: 14 }}>
          <T style={{ fontSize: 14 }}>Η επιχείρηση δεν φαίνεται ακόμα στην αναζήτηση. Ενεργοποίησε τη «Δημοσίευση» στις Ρυθμίσεις.</T>
        </View>
      )}

      {pending.length > 0 && <>
        <Section title="Νέοι πελάτες προς έγκριση" />
        {pending.map((p) => (
          <Card key={p.user_id} style={{ gap: 12 }}>
            <View style={[s.row, { gap: 12 }]}>
              <Avatar name={p.name || '?'} color={brand} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{p.name || 'Χωρίς όνομα'}</Text>
                {!!p.phone && <T mute style={{ fontSize: 13 }}>{p.phone}</T>}
              </View>
            </View>
            <View style={[s.row, { gap: 10 }]}>
              <Btn size="sm" color={C.ok} title="Έγκριση" style={{ flex: 1 }} onPress={async () => { await rpc('owner_set_member', { p_business: biz.id, p_user: p.user_id, p_status: 'approved' }); load(); }} />
              <Btn size="sm" kind="danger" title="Απόρριψη" style={{ flex: 1 }} onPress={async () => { await rpc('owner_set_member', { p_business: biz.id, p_user: p.user_id, p_status: 'blocked' }); load(); }} />
            </View>
          </Card>
        ))}
      </>}

      <Section title="Πρόγραμμα" sub={fmtLong(date)} />
      <DayStrip days={week} value={date} onChange={setDate} color={brand} />
      <View style={[s.row, { gap: 10 }]}>
        <Stat n={day.length} label="Κρατήσεις" />
        <Stat n={attended} label="Ήρθαν" color={C.ok} />
        <Stat n={Object.keys(byTime).length} label="Ώρες" />
      </View>

      <Card flat style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', backgroundColor: alpha(C.text, 0.05), borderRadius: 14, padding: 4 }}>
          <Seg on={!closed} label="Ανοιχτά" color={C.ok} onPress={() => toggleClosed(false)} />
          <Seg on={closed} label="Κλειστά" color={C.bad} onPress={() => toggleClosed(true)} />
        </View>
        <Input placeholder="Σημείωμα ημέρας για τους πελάτες" value={note} onChangeText={setNote} onEndEditing={() => toggleClosed(closed)} style={{ backgroundColor: 'transparent' }} />
      </Card>

      {day.length === 0 && <Empty emoji="☕" title="Καμία κράτηση" text="Δεν έχει κλείσει κανείς θέση αυτή τη μέρα." />}
      {Object.entries(byTime).map(([t, list]) => (
        <View key={t} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 52, alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 16 }}>{t}</Text>
            <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>{list.length} {list.length === 1 ? 'άτομο' : 'άτομα'}</Text>
            <View style={{ flex: 1, width: 2, backgroundColor: C.line, marginTop: 8, borderRadius: 1 }} />
          </View>
          <Card style={{ flex: 1, padding: 0, gap: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: brand }}>
            {list.map((b, i) => (
              <View key={b.id} style={[{ gap: 10, padding: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <View style={[s.row, { gap: 10 }]}>
                  <Avatar name={b.client || 'Π'} color={brand} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{b.client || 'Πελάτης'}</Text>
                    <T mute style={{ fontSize: 13 }}>{b.service}{b.phone ? ` · ${b.phone}` : ''}</T>
                  </View>
                  {b.status === 'attended' && <Pill text="Ήρθε" tone="ok" />}
                  {b.status === 'no_show' && <Pill text="Δεν ήρθε" tone="bad" />}
                </View>
                <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
                  <Btn size="sm" kind="tint" color={C.ok} icon="check" title="Ήρθε" onPress={() => setStatus(b, 'attended')} />
                  <Btn size="sm" kind="ghost" title="Δεν ήρθε" onPress={() => setStatus(b, 'no_show')} />
                  <Btn size="sm" kind="danger" title="Ακύρωση" onPress={() => setStatus(b, 'cancelled')} />
                  {biz.uses_credits && <Btn size="sm" kind="ghost" title="Ανανέωση" onPress={() => renew(b)} />}
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}
