import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../Txt';
import { say } from '../alert';
import { rpc, sb } from '../supabase';
import { useAuth } from '../auth';
import { styleOf } from '../presets';
import { usePerson } from '../profile/data';
import { useSwitchTo } from '../SwitchMode';
import { BizLogo } from '../bookings/parts';
import { Avatar, Btn, C, Icon, Input, alpha, catLabel, iso, price, s } from '../ui';
import type { IconName } from '../Icon';
import { fetchMyBizList, pickActive, setActiveBiz, useActiveBizId } from './active';
import { kindOf } from './kinds';
import { nowHHMM, type Slot } from './day';

/* Η λειτουργία επιχείρησης σε υπολογιστή: πλαϊνό μενού αριστερά, περιεχόμενο στη μέση, στήλη «θέλουν απάντηση» δεξιά.
   Ίδιες οθόνες με το κινητό· σε φαρδιά οθόνη απλώς απλώνονται. */

export const WIDE = 1000;
/* Φαρδιά οθόνη (υπολογιστής, μεγάλο tablet): πλαϊνό μενού αντί για κάτω μπάρα. */
export const useWide = () => useWindowDimensions().width >= WIDE;
/* Στον υπολογιστή οι οθόνες-λίστες δεν απλώνονται σε όλο το πλάτος: μένουν σε μια άνετη στήλη στη μέση. */
export const deskCol = (wide: boolean): ViewStyle | null => (wide ? { width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 32 } : null);

/* ---------- Πλαϊνό μενού ---------- */
export type SideItems = Record<string, { icon: IconName; label: string }>;
export function Sidebar({ items, state, navigateToTab }: { items: SideItems; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const router = useRouter();
  const { session } = useAuth();
  const active = useActiveBizId();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const person = usePerson();
  const switchTo = useSwitchTo();
  useEffect(() => { fetchMyBizList(session!.user.id).then(setList); }, [session, active]);
  const biz = pickActive(list);
  const k = kindOf(biz?.category);
  const label = (name: string) => (name === 'clients' ? k.clients : name === 'team' ? k.team : items[name].label);
  const activeKey = state.routes[state.index]?.key;
  return (
    <View style={{ width: 248, backgroundColor: alpha(C.text, 0.02), borderRightWidth: 1, borderRightColor: C.line, paddingVertical: 20, paddingHorizontal: 14, gap: 4 }}>
      {biz && (
        <Pressable onPress={() => list.length > 1 && setOpen(true)} style={({ pressed }) => [s.row, { gap: 10, padding: 8, marginBottom: 14, borderRadius: 14, backgroundColor: pressed ? C.soft : 'transparent' }]}>
          <BizLogo biz={biz} name={biz.name} color={styleOf(biz).color} size={38} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{biz.name}</Text>
            <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>{list.length > 1 ? 'αλλαγή επιχείρησης ▾' : catLabel(biz.category)}</Text>
          </View>
        </Pressable>
      )}
      {state.routes.filter((r) => items[r.name]).map((r) => {
        const on = r.key === activeKey;
        return (
          <Pressable key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={({ pressed, hovered }: any) => [s.row, { gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12,
              backgroundColor: on ? C.text : pressed || hovered ? C.soft : 'transparent' }]}>
            <Icon name={items[r.name].icon} size={19} color={on ? C.bg : C.text} />
            <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 15 }}>{label(r.name)}</Text>
          </Pressable>
        );
      })}
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => switchTo('client')} style={({ pressed }) => [s.row, { gap: 8, justifyContent: 'center', paddingVertical: 11, borderRadius: 12,
        borderWidth: 1, borderColor: C.btn2Line, backgroundColor: pressed ? C.soft : C.bg }]}>
        <Icon name="search" size={15} color={C.text} />
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Μετάβαση σε πελάτη</Text>
      </Pressable>
      <View style={[s.row, { gap: 10, paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: C.line }]}>
        <Pressable onPress={() => router.push('/account')} style={[s.row, { gap: 10, flex: 1, minWidth: 0 }]}>
          <Avatar name={person.initials} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{person.name || 'Ο λογαριασμός μου'}</Text>
            <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>{person.email}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => router.push('/app-settings')} hitSlop={8} accessibilityLabel="Ρυθμίσεις"
          style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.soft : 'transparent' })}>
          <Icon name="gear" size={18} color={C.mute} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: alpha('#000000', 0.3) }}>
          <Pressable onPress={() => {}} style={{ position: 'absolute', left: 14, top: 76, width: 300, backgroundColor: C.bg, borderRadius: 18, padding: 8,
            boxShadow: `0px 20px 50px ${alpha('#000000', 0.25)}` }}>
            {list.map((b) => (
              <Pressable key={b.id} onPress={() => { setActiveBiz(b.id); setOpen(false); }}
                style={({ pressed, hovered }: any) => [s.row, { gap: 12, padding: 8, borderRadius: 12, backgroundColor: b.id === biz?.id || pressed || hovered ? C.soft : 'transparent' }]}>
                <BizLogo biz={b} name={b.name} color={styleOf(b).color} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ color: C.mute, fontSize: 12 }}>{catLabel(b.category)}</Text>
                </View>
                {b.id === biz?.id && <Icon name="check" size={16} color={C.text} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ---------- Πρόγραμμα: μία γραμμή για κάθε ραντεβού ---------- */
const initials = (n?: string) => (n || 'Π').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const Tag = ({ text, fg, bg }: { text: string; fg: string; bg: string }) => (
  <View style={{ backgroundColor: bg, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 9 }}>
    <Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>{text}</Text>
  </View>
);

/* Οι κρατήσεις της ημέρας σε λίστα (όπως ένα ημερολόγιο ραντεβού): ώρα, πελάτης, υπηρεσία · άτομο, κατάσταση.
   Πάτημα σε γραμμή → ανοίγουν τα κουμπιά της (Ήρθε, Δεν ήρθε / Ακύρωση, Μήνυμα, Καρτέλα).
   Τα τμήματα (γυμναστήριο, pilates) είναι μία γραμμή ανά μάθημα με πληρότητα, και ανοίγουν τη λίστα συμμετεχόντων. */
export function DeskList({ biz, date, slots, onChange, closed }: { biz: any; date: string; slots: Slot[]; onChange: () => void; closed?: boolean }) {
  const router = useRouter();
  const brand = styleOf(biz).color;
  const [open, setOpen] = useState<string | null>(null);
  const today = iso(new Date());
  const now = nowHHMM();
  useEffect(() => setOpen(null), [date]);

  const set = async (b: any, st: string) => { const r = await rpc('owner_set_status', { p_booking: b.id, p_status: st }); if (!r?.ok) say(r?.error ?? 'Δεν έγινε'); onChange(); };

  type Item = { key: string; time: string; b?: any; g?: Slot };
  const items: Item[] = [];
  slots.forEach((g) => (g.cls ? items.push({ key: g.key, time: g.time, g }) : g.list.forEach((b) => items.push({ key: b.id, time: g.time, b }))));
  const live = (it: Item) => (it.b ? it.b.status !== 'cancelled' : true);
  // «Τώρα» = το τελευταίο ραντεβού που έχει ξεκινήσει μέσα στην τελευταία ώρα· «Επόμενο» = το πρώτο που δεν έχει ξεκινήσει.
  const hm = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const nowKey = date === today ? [...items].reverse().find((it) => live(it) && it.time <= now && hm(now) - hm(it.time) < 60)?.time : undefined;
  const nextKey = date === today ? items.find((it) => live(it) && it.time > now)?.time : undefined;

  if (items.length === 0) return (
    <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: 18, paddingVertical: 48, alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 28 }}>☕</Text>
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{closed ? 'Κλειστά αυτή τη μέρα' : 'Καμία κράτηση'}</Text>
      <Text style={{ color: C.mute, fontSize: 14 }}>{closed ? 'Δεν δέχεσαι κρατήσεις.' : 'Δεν έχει κλείσει κανείς θέση αυτή τη μέρα.'}</Text>
    </View>
  );

  return (
    <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 18, overflow: 'hidden' }}>
      {items.map((it, i) => {
        const on = open === it.key;
        const past = date < today || (date === today && it.time < now);
        const b = it.b, g = it.g;
        let tag: React.ReactNode = null;
        if (b) {
          if (b.status === 'attended') tag = <Tag text="Ήρθε" fg={C.ok} bg={alpha(C.ok, 0.12)} />;
          else if (b.status === 'no_show') tag = <Tag text="Δεν ήρθε" fg={C.bad} bg={alpha(C.bad, 0.1)} />;
          else if (b.status === 'cancelled') tag = <Tag text="Ακυρώθηκε" fg={C.mute} bg={C.soft} />;
          else if (it.time === nowKey) tag = <Tag text="Τώρα" fg="#00e676" bg="#0a0a0a" />;
          else if (past) tag = <Tag text="Ήρθε;" fg={C.bad} bg={alpha(C.bad, 0.1)} />;
          else if (it.time === nextKey) tag = <Tag text="Επόμενο" fg={C.text} bg={C.soft} />;
        } else if (g) {
          const n = g.list.filter((x) => x.status !== 'cancelled' && x.status !== 'no_show').length;
          tag = <Tag text={`${n}/${g.cap} θέσεις`} fg={n >= g.cap ? C.bg : C.text} bg={n >= g.cap ? C.text : C.soft} />;
        }
        const name = b ? b.client || 'Πελάτης' : g!.title ?? 'Μάθημα';
        const sub = b ? [b.service, b.staff ? b.staff.split(' ')[0] : null, b.price_cents ? price(b.price_cents) : null].filter(Boolean).join(' · ')
          : [g!.staff, `${g!.list.filter((x) => x.status === 'attended').length} ήρθαν`].filter(Boolean).join(' · ');
        const color = b ? b.staff_color ?? brand : g!.color ?? brand;
        return (
          <View key={it.key} style={[i > 0 && { borderTopWidth: 1, borderTopColor: C.line }, it.time === nowKey && !on && { backgroundColor: alpha(C.text, 0.025) }]}>
            <Pressable onPress={() => setOpen(on ? null : it.key)}
              style={({ pressed, hovered }: any) => [s.row, { gap: 14, paddingVertical: 12, paddingHorizontal: 18, backgroundColor: on ? C.card : pressed || hovered ? alpha(C.text, 0.03) : 'transparent' }]}>
              <Text style={{ width: 52, color: past && !on ? C.mute : C.text, fontWeight: '800', fontSize: 15 }}>{it.time}</Text>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: alpha(color, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{g ? '👥' : initials(b.client)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, textDecorationLine: b?.status === 'cancelled' ? 'line-through' : 'none' }} numberOfLines={1}>{name}</Text>
                <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{sub}</Text>
              </View>
              {tag}
            </Pressable>
            {on && b && <Actions b={b} past={past} set={set} router={router} />}
            {on && g && (
              <View style={{ backgroundColor: C.card, paddingHorizontal: 18, paddingBottom: 8 }}>
                {g.list.map((x) => (
                  <View key={x.id} style={[s.row, { gap: 12, paddingVertical: 8, paddingLeft: 66, borderTopWidth: 1, borderTopColor: C.line }]}>
                    <Avatar name={x.client || 'Π'} color={color} size={28} />
                    <Pressable style={{ flex: 1 }} onPress={() => x.user_id && router.push({ pathname: '/owner/client', params: { id: x.user_id } })}>
                      <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{x.client || 'Πελάτης'}</Text>
                    </Pressable>
                    {x.status === 'booked' ? <>
                      <Btn size="sm" color={C.ok} title="Ήρθε" onPress={() => set(x, 'attended')} />
                      <Btn size="sm" kind="ghost" title={past ? 'Δεν ήρθε' : 'Ακύρωση'} onPress={() => set(x, past ? 'no_show' : 'cancelled')} />
                    </> : <Pressable onPress={() => set(x, 'booked')}><Text style={{ color: x.status === 'attended' ? C.ok : C.bad, fontWeight: '700', fontSize: 13 }}>
                      {x.status === 'attended' ? 'Ήρθε' : x.status === 'no_show' ? 'Δεν ήρθε' : 'Ακυρώθηκε'} · αναίρεση</Text></Pressable>}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Actions({ b, past, set, router }: { b: any; past: boolean; set: (b: any, st: string) => void; router: ReturnType<typeof useRouter> }) {
  return (
    <View style={[s.row, { gap: 8, backgroundColor: C.card, paddingBottom: 14, paddingLeft: 122, paddingRight: 18, flexWrap: 'wrap' }]}>
      {b.status === 'booked' ? <>
        <Btn size="sm" color={C.ok} icon="check" title="Ήρθε" onPress={() => set(b, 'attended')} />
        {past ? <Btn size="sm" kind="ghost" title="Δεν ήρθε" onPress={() => set(b, 'no_show')} />
          : <Btn size="sm" kind="danger" title="Ακύρωση" onPress={() => set(b, 'cancelled')} />}
      </> : <Btn size="sm" kind="ghost" title="Αναίρεση" onPress={() => set(b, 'booked')} />}
      <Btn size="sm" kind="ghost" icon="chat" title="Μήνυμα" onPress={() => router.navigate({ pathname: '/inbox', params: { to: b.user_id } })} />
      {!!b.user_id && <Btn size="sm" kind="ghost" icon="user" title="Καρτέλα πελάτη" onPress={() => router.push({ pathname: '/owner/client', params: { id: b.user_id } })} />}
      {!!b.phone && <Text style={{ color: C.mute, fontSize: 13, marginLeft: 4 }}>{b.phone}</Text>}
    </View>
  );
}

/* ---------- Δεξιά στήλη ---------- */
export const Box = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 4 }}>
    <View style={[s.row, { marginBottom: 6 }]}>
      <Text style={{ flex: 1, color: C.mute, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{title}</Text>
      {right}
    </View>
    {children}
  </View>
);
/* Μικρό κουμπί για τη δεξιά στήλη (τα κανονικά είναι πολύ μεγάλα για 380px). */
const Small = ({ title, tone, onPress }: { title: string; tone: 'ok' | 'bad'; onPress: () => void }) => {
  const c = tone === 'ok' ? C.ok : C.bad;
  return (
    <Pressable onPress={onPress} style={({ pressed, hovered }: any) => ({ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9,
      backgroundColor: alpha(c, pressed || hovered ? 0.2 : 0.12) })}>
      <Text style={{ color: c, fontWeight: '700', fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
};
const Line = ({ children, first }: { children: React.ReactNode; first?: boolean }) =>
  <View style={[s.row, { gap: 10, paddingVertical: 9 }, !first && { borderTopWidth: 1, borderTopColor: C.line }]}>{children}</View>;

/* Νέοι πελάτες που περιμένουν έγκριση. */
export function PendingBox({ biz, list, onDone }: { biz: any; list: any[]; onDone: () => void }) {
  if (!list.length) return null;
  const set = async (u: string, st: string) => { await rpc('owner_set_member', { p_business: biz.id, p_user: u, p_status: st }); onDone(); };
  return (
    <Box title="Θέλουν απάντηση">
      <View style={{ backgroundColor: C.text, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4 }}>
        <Text style={{ color: C.bg, fontWeight: '800', fontSize: 14 }}>{list.length === 1 ? '1 νέος πελάτης περιμένει' : `${list.length} νέοι πελάτες περιμένουν`}</Text>
      </View>
      {list.map((p, i) => (
        <Line key={p.user_id} first={i === 0}>
          <Avatar name={p.name || '?'} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{p.name || 'Χωρίς όνομα'}</Text>
            {!!p.phone && <Text style={{ color: C.mute, fontSize: 12 }}>{p.phone}</Text>}
          </View>
          <Small tone="ok" title="Δεκτός" onPress={() => set(p.user_id, 'approved')} />
          <Small tone="bad" title="Όχι" onPress={() => set(p.user_id, 'blocked')} />
        </Line>
      ))}
    </Box>
  );
}

/* Κρατήσεις που η ώρα τους πέρασε και δεν σημειώθηκαν. */
export function CameBox({ day, onChange }: { day: any[]; onChange: () => void }) {
  const now = nowHHMM();
  const rows = day.filter((b) => b.status === 'booked' && b.time < now);
  if (!rows.length) return null;
  const set = async (b: any, st: string) => { const r = await rpc('owner_set_status', { p_booking: b.id, p_status: st }); if (!r?.ok) say(r?.error ?? 'Δεν έγινε'); onChange(); };
  return (
    <Box title="Ήρθαν;" right={<Text style={{ color: C.bad, fontWeight: '800', fontSize: 13 }}>{rows.length}</Text>}>
      {rows.slice(0, 6).map((b, i) => (
        <Line key={b.id} first={i === 0}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 14, width: 44 }}>{b.time}</Text>
          <Text style={{ flex: 1, color: C.text, fontSize: 14 }} numberOfLines={1}>{b.client || 'Πελάτης'}</Text>
          <Small tone="ok" title="Ήρθε" onPress={() => set(b, 'attended')} />
          <Small tone="bad" title="Δεν ήρθε" onPress={() => set(b, 'no_show')} />
        </Line>
      ))}
      {rows.length > 6 && <Text style={{ color: C.mute, fontSize: 13, paddingTop: 6 }}>και άλλες {rows.length - 6} στη λίστα</Text>}
    </Box>
  );
}

/* Ανοιχτά / κλειστά τη μέρα, με σημείωμα για τους πελάτες (ήταν στο «Ημερολόγιο»). */
export function DayOpenBox({ biz, date, override, setOverride, onSaved }:
  { biz: any; date: string; override: { note: string; closed: boolean }; setOverride: (o: { note: string; closed: boolean }) => void; onSaved: () => void }) {
  const save = async (closed: boolean) => {
    const { error } = await sb.from('day_overrides').upsert({ business_id: biz.id, date, closed, note: override.note || null });
    if (error) say('Δεν αποθηκεύτηκε', error.message); onSaved();
  };
  const Seg = ({ on, label, color, onPress }: { on: boolean; label: string; color: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: on ? C.bg : 'transparent',
      boxShadow: on ? `0px 1px 3px ${alpha(C.shade, 0.1)}` : undefined }}>
      <Text style={{ color: on ? color : C.mute, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
  return (
    <Box title="Η μέρα">
      <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 12, padding: 3, marginBottom: 8 }}>
        <Seg on={!override.closed} label="Ανοιχτά" color={C.ok} onPress={() => save(false)} />
        <Seg on={override.closed} label="Κλειστά" color={C.bad} onPress={() => save(true)} />
      </View>
      <Input placeholder="Σημείωμα ημέρας για τους πελάτες" value={override.note}
        onChangeText={(note) => setOverride({ ...override, note })} onEndEditing={() => save(override.closed)} onBlur={() => save(override.closed)} />
    </Box>
  );
}

export const DeskScroll = ({ children }: { children: React.ReactNode }) => (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
);
