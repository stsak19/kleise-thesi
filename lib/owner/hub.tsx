import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text } from '../Txt';
import { say, promptText } from '../alert';
import { rpc, sb } from '../supabase';
import { useAuth } from '../auth';
import { styleOf } from '../presets';
import { Avatar, Btn, C, Card, Empty, Pill, Section, T, s } from '../ui';
import { useSwitchTo } from '../SwitchMode';

/* Κοινά κομμάτια της λειτουργίας επιχείρησης (app/(biz)): η επιχείρηση του χρήστη,
   το πρόγραμμα μιας μέρας, οι νέοι πελάτες προς έγκριση και τα μικρά νούμερα. */

/* Η επιχείρηση του χρήστη· ξαναφορτώνεται κάθε φορά που ανοίγει η οθόνη. undefined = φορτώνει, null = δεν έχει. */
export function useMyBiz() {
  const { session } = useAuth();
  const [biz, setBiz] = useState<any>(undefined);
  useFocusEffect(useCallback(() => {
    sb.from('businesses').select('*').eq('owner_id', session!.user.id).maybeSingle().then(({ data }) => setBiz(data ?? null));
  }, [session]));
  return biz;
}

/* Οι κρατήσεις μιας μέρας και οι εκκρεμείς εγκρίσεις, με ανανέωση. */
export function useDay(biz: any, date: string) {
  const [day, setDay] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [override, setOverride] = useState<{ note: string; closed: boolean }>({ note: '', closed: false });
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!biz) return;
    setLoading(true);
    const [d, p, o] = await Promise.all([
      rpc('owner_day', { p_business: biz.id, p_date: date }),
      rpc('owner_pending', { p_business: biz.id }),
      sb.from('day_overrides').select('*').eq('business_id', biz.id).eq('date', date).maybeSingle(),
    ]);
    setDay(d ?? []); setPending(p ?? []); setOverride({ note: o.data?.note ?? '', closed: !!o.data?.closed }); setLoading(false);
  }, [biz, date]);
  useEffect(() => { load(); }, [load]);
  return { day, pending, override, setOverride, loading, load };
}

export const Stat = ({ n, label, color }: { n: number | string; label: string; color?: string }) => (
  <Card style={{ flex: 1, padding: 14, gap: 2 }}>
    <Text style={{ color: color ?? C.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 }}>{n}</Text>
    <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600' }}>{label}</Text>
  </Card>
);

/* Νέοι πελάτες που ζήτησαν να κλείνουν θέση (όταν το κατάστημα θέλει έγκριση). */
export function Pending({ biz, list, onDone }: { biz: any; list: any[]; onDone: () => void }) {
  if (!list.length) return null;
  const brand = styleOf(biz).color;
  const set = async (u: string, st: string) => { await rpc('owner_set_member', { p_business: biz.id, p_user: u, p_status: st }); onDone(); };
  return <>
    <Section title="Νέοι πελάτες προς έγκριση" />
    {list.map((p) => (
      <Card key={p.user_id} style={{ gap: 12 }}>
        <View style={[s.row, { gap: 12 }]}>
          <Avatar name={p.name || '?'} color={brand} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{p.name || 'Χωρίς όνομα'}</Text>
            {!!p.phone && <T mute style={{ fontSize: 13 }}>{p.phone}</T>}
          </View>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <Btn size="sm" color={C.ok} title="Έγκριση" style={{ flex: 1 }} onPress={() => set(p.user_id, 'approved')} />
          <Btn size="sm" kind="danger" title="Απόρριψη" style={{ flex: 1 }} onPress={() => set(p.user_id, 'blocked')} />
        </View>
      </Card>
    ))}
  </>;
}

/* Το πρόγραμμα μιας μέρας ανά ώρα, με «Ήρθε / Δεν ήρθε / Ακύρωση / Μήνυμα». */
export function Schedule({ biz, day, onChange, emptyText }: { biz: any; day: any[]; onChange: () => void; emptyText?: string }) {
  const router = useRouter();
  const brand = styleOf(biz).color;
  const byTime: Record<string, any[]> = {};
  day.forEach((b) => (byTime[b.time] ??= []).push(b));

  const setStatus = async (b: any, st: string) => {
    const r = await rpc('owner_set_status', { p_booking: b.id, p_status: st }); if (!r.ok) say(r.error ?? 'Δεν έγινε'); onChange();
  };
  const renew = (u: any) => promptText('Ανανέωση πακέτου', `Πόσες κρατήσεις για ${u.client || 'τον πελάτη'};`, async (v) => {
    const n = parseInt(v, 10); if (n > 0) { await rpc('owner_renew', { p_business: biz.id, p_user: u.user_id, p_credits: n }); say('Ανανεώθηκε'); }
  });

  if (day.length === 0) return <Card><Empty emoji="☕" title="Καμία κράτηση" text={emptyText ?? 'Δεν έχει κλείσει κανείς θέση αυτή τη μέρα.'} /></Card>;
  return <>
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
                <Btn size="sm" kind="ghost" title="Μήνυμα" onPress={() => router.navigate({ pathname: '/inbox', params: { to: b.user_id } })} />
              </View>
            </View>
          ))}
        </Card>
      </View>
    ))}
  </>;
}

/* Όταν ο λογαριασμός δεν έχει (πια) επιχείρηση. */
export function NoBiz() {
  const router = useRouter();
  const switchTo = useSwitchTo();
  return (
    <View style={[s.screen, s.pad, { justifyContent: 'center' }]}>
      <Card style={{ padding: 4 }}>
        <Empty emoji="🏪" title="Έχεις επιχείρηση;" text="Γράψε την επιχείρησή σου και οι πελάτες σου θα κλείνουν θέση από την εφαρμογή." />
        <View style={{ padding: 12, paddingTop: 0 }}><Btn title="Δημιουργία επιχείρησης" onPress={() => router.push('/new-business')} /></View>
        <View style={{ padding: 12, paddingTop: 0 }}><Btn kind="ghost" title="Πίσω στη λειτουργία πελάτη" onPress={() => switchTo('client')} /></View>
      </Card>
    </View>
  );
}
