import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text } from '../Txt';
import { rpc, sb } from '../supabase';
import { useAuth } from '../auth';
import { styleOf } from '../presets';
import { Avatar, Btn, C, Card, Empty, Icon, Pill, Section, T, alpha, catLabel, price, s } from '../ui';
import { Photo } from '../Photo';
import { BizLogo } from '../bookings/parts';
import { kindOf } from './kinds';
import { fetchMyBiz, setActiveBiz, useActiveBizId, useMyBizList } from './active';
import { useSwitchTo } from '../SwitchMode';

/* Κοινά κομμάτια της λειτουργίας επιχείρησης (app/(biz)): η επιχείρηση του χρήστη,
   το πρόγραμμα μιας μέρας, οι νέοι πελάτες προς έγκριση και τα μικρά νούμερα. */

/* Η ανοιχτή επιχείρηση του χρήστη· ξαναφορτώνεται κάθε φορά που ανοίγει η οθόνη ή αλλάζει επιχείρηση.
   undefined = φορτώνει, null = δεν έχει. */
export function useMyBiz() {
  const { session } = useAuth();
  const active = useActiveBizId();
  const [biz, setBiz] = useState<any>(undefined);
  useFocusEffect(useCallback(() => { fetchMyBiz(session!.user.id).then(setBiz); }, [session, active]));
  return biz;
}

/* Η ομάδα της επιχείρησης (κομμωτές, προπονητές, θεραπευτές…). Κενή αν η βάση δεν έχει ακόμα ομάδα. */
export function useStaff(biz: any) {
  const [staff, setStaff] = useState<any[]>([]);
  const load = useCallback(() => {
    if (!biz) return;
    sb.from('staff').select('*').eq('business_id', biz.id).then(({ data, error }) => setStaff(error ? [] : data ?? []));
  }, [biz?.id]);
  useFocusEffect(load);
  return { staff, reload: load };
}

/* Πρόσωπο μέλους της ομάδας: φωτογραφία ή αρχικό γράμμα στο χρώμα του. */
export const Face = ({ p, size = 40 }: { p: any; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
    <Photo uri={p?.photo_url} color={p?.color ?? C.tint} letter={(p?.name || '?').slice(0, 1)} style={{ borderRadius: size / 2 }} />
  </View>
);

/* Φίλτρο ομάδας πάνω από το πρόγραμμα: «Όλοι» ή ένα άτομο. Δεν φαίνεται όταν δουλεύει ένας. */
export function StaffFilter({ staff, value, onChange, counts }: { staff: any[]; value: string | null; onChange: (v: string | null) => void; counts?: Record<string, number> }) {
  if (staff.length < 2) return null;
  const Item = ({ id, label, p }: { id: string | null; label: string; p?: any }) => {
    const on = value === id;
    return (
      <Pressable onPress={() => onChange(id)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: p ? 6 : 14, paddingRight: 14,
        borderRadius: 999, borderWidth: 1, borderColor: on ? C.btn : C.line, backgroundColor: on ? C.btn : C.card, opacity: pressed ? 0.85 : 1 }]}>
        {p && <Face p={p} size={26} />}
        <Text style={{ color: on ? C.btnText : C.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
        {counts && <Text style={{ color: on ? C.btnText : C.mute, fontWeight: '700', fontSize: 13, opacity: 0.8 }}>{id ? counts[id] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0)}</Text>}
      </Pressable>
    );
  };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
      <Item id={null} label="Όλοι" />
      {staff.map((p) => <Item key={p.id} id={p.id} label={p.name.split(' ')[0]} p={p} />)}
    </ScrollView>
  );
}

/* Τα νούμερα της μέρας, ανάλογα με το είδος: τμήματα με πληρότητα ή ραντεβού με έσοδα. */
export function dayStats(day: any[]) {
  const live = day.filter((b) => b.status !== 'cancelled');
  const groups = new Map<string, { cap: number; n: number }>();
  live.forEach((b) => { if ((b.capacity ?? 1) > 1) { const k = b.time + b.service_id; const g = groups.get(k) ?? { cap: b.capacity, n: 0 }; g.n++; groups.set(k, g); } });
  const classes = groups.size > 0;
  const cap = [...groups.values()].reduce((a, g) => a + g.cap, 0), seats = [...groups.values()].reduce((a, g) => a + g.n, 0);
  const revenue = live.some((b) => b.price_cents != null) ? live.reduce((a, b) => a + (b.status === 'no_show' ? 0 : b.price_cents ?? 0), 0) : null;
  return { live, classes, groups: groups.size, fill: cap ? Math.round((seats / cap) * 100) : 0, revenue };
}

/* Γρήγορη εναλλαγή ανάμεσα στις επιχειρήσεις του λογαριασμού (όπως οι λογαριασμοί στο Instagram). */
export function BizSwitcher({ biz, card }: { biz: any; card?: boolean }) {
  const list = useMyBizList();
  const [open, setOpen] = useState(false);
  const many = list.length > 1;
  return <>
    {card ? (
      <Card onPress={many ? () => setOpen(true) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
        <BizLogo biz={biz} name={biz.name} color={styleOf(biz).color} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>{biz.name}</Text>
          <T mute style={{ fontSize: 14 }}>{[catLabel(biz.category), biz.city].filter(Boolean).join(' · ')}</T>
        </View>
        {many && <Text style={{ color: C.tint, fontWeight: '700', fontSize: 14 }}>Αλλαγή</Text>}
      </Card>
    ) : (
      <Pressable disabled={!many} onPress={() => setOpen(true)} hitSlop={6} style={({ pressed }) => [s.row, { gap: 8, alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 }]}>
        <BizLogo biz={biz} name={biz.name} color={styleOf(biz).color} size={24} />
        <Text style={{ color: C.mute, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{biz.name}</Text>
        {many && <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="chevron" size={13} color={C.mute} /></View>}
      </Pressable>
    )}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: alpha('#000000', 0.35), justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingBottom: 34, maxHeight: '80%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 14 }} />
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', paddingHorizontal: 20, marginBottom: 8 }}>Οι επιχειρήσεις μου</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 12 }}>
            {list.map((b) => {
              const on = b.id === biz.id;
              return (
                <Pressable key={b.id} onPress={() => { setActiveBiz(b.id); setOpen(false); }}
                  style={({ pressed }) => [s.row, { gap: 14, padding: 10, borderRadius: 18, backgroundColor: on ? C.soft : pressed ? C.soft : 'transparent' }]}>
                  <BizLogo biz={b} name={b.name} color={styleOf(b).color} size={46} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{b.name}</Text>
                    <Text style={{ color: C.mute, fontSize: 13 }}>{[catLabel(b.category), b.city].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {on && <Icon name="check" size={18} color={C.text} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

/* Οι κρατήσεις μιας μέρας και οι εκκρεμείς εγκρίσεις, με ανανέωση. */
export function useDay(biz: any, date: string) {
  const [day, setDay] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [packReqs, setPackReqs] = useState<any[]>([]);
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
    rpc<any[]>('owner_package_requests', { p_business: biz.id }).then((x) => setPackReqs(x ?? [])).catch(() => setPackReqs([]));
    setDay(d ?? []); setPending(p ?? []); setOverride({ note: o.data?.note ?? '', closed: !!o.data?.closed }); setLoading(false);
  }, [biz, date]);
  useEffect(() => { load(); }, [load]);
  return { day, pending, packReqs, override, setOverride, loading, load };
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

/* Οι πελάτες της επιχείρησης με την καρτέλα τους (επισκέψεις, πακέτο, στοιχεία ανά επάγγελμα). */
export function useClients(biz: any) {
  const [list, setList] = useState<any[] | null>(null);
  const load = useCallback(() => { if (biz) rpc<any[]>('owner_clients', { p_business: biz.id }).then((x) => setList(x ?? [])).catch(() => setList([])); }, [biz?.id]);
  useFocusEffect(load);
  return { list, reload: load };
}

export const daysTo = (d?: string | null) => (d ? Math.round((new Date(d.slice(0, 10) + 'T00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 864e5) : null);
export const packLine = (pk: any) => {
  if (!pk) return '';
  const left = daysTo(pk.expires);
  const when = left == null ? '' : left < 0 ? 'έληξε' : left === 0 ? 'λήγει σήμερα' : left === 1 ? 'λήγει αύριο' : `λήγει σε ${left} μέρες`;
  return [pk.total ? `${pk.left} από ${pk.total}` : null, when].filter(Boolean).join(' · ');
};
const ending = (pk: any) => !!pk && ((pk.total > 0 && pk.left <= 1) || (daysTo(pk.expires) ?? 99) <= 5);

/* «Χρειάζονται προσοχή»: πακέτα/συνδρομές που τελειώνουν, με γρήγορο μήνυμα. */
export function Attention({ biz }: { biz: any }) {
  const router = useRouter();
  const { list } = useClients(biz);
  const due = (list ?? []).filter((c) => ending(c.pack)).sort((a, z) => (daysTo(a.pack.expires) ?? 99) - (daysTo(z.pack.expires) ?? 99)).slice(0, 4);
  if (!due.length) return null;
  const k = kindOf(biz.category);
  return <>
    <Section title={k.attention} action="Όλοι" onAction={() => router.navigate('/clients')} />
    <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
      {due.map((c, i) => (
        <Pressable key={c.user_id} onPress={() => router.push({ pathname: '/owner/client', params: { id: c.user_id } })}
          style={({ pressed }) => [s.row, { gap: 12, padding: 14, backgroundColor: pressed ? C.soft : 'transparent' }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
          <Avatar name={c.name} color={styleOf(biz).color} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{c.name}</Text>
            <T mute style={{ fontSize: 13 }}>{c.pack.name} · {packLine(c.pack)}</T>
          </View>
          <Btn size="sm" kind="ghost" title="Μήνυμα" onPress={() => router.navigate({ pathname: '/inbox', params: { to: c.user_id } })} />
        </Pressable>
      ))}
    </Card>
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
