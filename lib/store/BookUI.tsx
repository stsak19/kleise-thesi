import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../Txt';
import { Photo } from '../Photo';
import { Btn, C, DAYS, Icon, MONTHS, alpha, price, s, shadow, Toggle } from '../ui';
import { useStore, endOf } from './data';
import { ANY, firstName, useBook, withArticle, type Staff, type Step } from './book';
import { StoreLogo } from './parts';
import { fmtLong } from '../ui';
import { useWide } from '../wide';

/* Τα κομμάτια της ροής κράτησης (lib/store/book): βήματα, φύλλο κινητού, σελίδα και σύνοψη υπολογιστή,
   και η κάρτα «Το συνηθισμένο σου». */

const TITLE: Record<Step, string> = { service: 'Τι θα κάνεις;', staff: 'Με ποιον;', time: 'Πότε;', confirm: 'Όλα σωστά;' };
/* Το πακέτο που θα χρεωθεί: το ενεργό πακέτο του καταστήματος (και στα μαθήματα χωρίς «μονάδες»). */
const packOf = (S: any): { left: number } | null => S.pack ?? (S.packInfo && !S.packInfo.pending && S.packInfo.total ? { left: S.packInfo.left } : null);
const dur = (m: number) => (m >= 60 && m % 60 === 0 ? `${m / 60} ώρ${m === 60 ? 'α' : 'ες'}` : `${m}′`);

/* ---------- μικρά κομμάτια ---------- */
function Face({ st, size = 64, any, on }: { st?: Staff | null; size?: number; any?: boolean; on?: boolean }) {
  return (
    <View style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderWidth: 2, borderColor: on ? C.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: any ? C.soft : st?.color ?? C.accent, alignItems: 'center', justifyContent: 'center' }}>
        {any ? <Icon name="user" size={size * 0.4} color={C.text} />
          : <Photo uri={st?.photo_url} color="#ffffff" letter={firstName(st?.name).slice(0, 1)} style={{ backgroundColor: st?.color ?? C.accent }} />}
      </View>
    </View>
  );
}
const Chips = ({ items }: { items: string[] }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
    {items.filter(Boolean).map((t) => (
      <View key={t} style={{ backgroundColor: C.soft, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 9 }}>
        <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }}>{t}</Text>
      </View>
    ))}
  </View>
);
const Note = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: C.soft, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13 }}>
    <Text style={{ color: C.mute, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>{children}</Text>
  </View>
);

/* ---------- βήμα: υπηρεσία ---------- */
export function StepService({ grid }: { grid?: boolean }) {
  const S = useStore(); const B = useBook();
  return (
    <View style={grid ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : undefined}>
      {S.services.map((sv, i) => {
        const on = B.service?.id === sv.id;
        const pick = () => { B.pickService(sv); if (!grid) B.next(); };
        return (
          <Pressable key={sv.id} onPress={pick} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ pressed, hovered }: any) => grid
              ? { width: '48.8%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: on ? 2 : 1.5, borderColor: on ? C.text : C.line, backgroundColor: hovered ? C.soft : C.bg, opacity: pressed ? 0.8 : 1 }
              : { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: i === S.services.length - 1 ? 0 : 1, borderBottomColor: C.line, opacity: pressed ? 0.7 : 1 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.text : C.line, backgroundColor: on ? C.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on && <Icon name="check" size={13} color={C.bg} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{sv.name}</Text>
              <Text style={{ color: C.mute, fontSize: 12.5, marginTop: 1 }}>{dur(sv.duration_min)}</Text>
            </View>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{sv.price_cents == null ? '' : price(sv.price_cents)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- βήμα: άτομο ---------- */
export function StepStaff({ row }: { row?: boolean }) {
  const B = useBook();
  const team = B.team;
  const fav = B.favStaff && team.some((x) => x.id === B.favStaff!.id) ? B.favStaff : null;
  const list: (Staff | null)[] = [...(fav ? [fav] : []), null, ...team.filter((x) => x.id !== fav?.id)];
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: row ? 18 : 10, paddingVertical: 4 }}>
        {list.map((st) => {
          const id = st?.id ?? ANY, on = B.who === id;
          return (
            <Pressable key={id} onPress={() => B.pickWho(id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={({ pressed }) => ({ width: 100, alignItems: 'center', gap: 4, opacity: pressed ? 0.7 : 1 })}>
              <Face st={st} any={!st} on={on} />
              <Text style={{ color: C.text, fontSize: 13, fontWeight: on ? '800' : '700' }} numberOfLines={1}>{st ? firstName(st.name) : 'Οποιοσδήποτε'}</Text>
              {st && st.id === fav?.id
                ? <View style={{ backgroundColor: C.text, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ color: C.bg, fontSize: 10.5, fontWeight: '800' }}>♥ Η δική σου</Text></View>
                : <Text style={{ color: C.mute, fontSize: 11.5 }} numberOfLines={1}>{st ? st.role?.split('·')[0].trim() ?? '' : 'πιο γρήγορα'}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
      <Note>Βλέπεις μόνο όσους κάνουν «{B.service?.name}». Με «Οποιοσδήποτε» σου δείχνουμε όλες τις ελεύθερες ώρες.</Note>
    </View>
  );
}

/* ---------- βήμα: ώρα ---------- */
export function StepTime({ wide }: { wide?: boolean }) {
  const S = useStore(); const B = useBook();
  const today = S.days[0];
  const free = (B.slots ?? []).filter((x) => x.free > 0);
  const am = (B.slots ?? []).filter((x) => x.time < '12:00'), pm = (B.slots ?? []).filter((x) => x.time >= '12:00');
  const Slots = ({ list }: { list: typeof am }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {list.map((x) => {
        const on = B.time === x.time, full = x.free <= 0;
        return (
          <Pressable key={x.time} disabled={full} onPress={() => B.setTime(x.time)} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: full }}
            style={({ pressed, hovered }: any) => ({ width: wide ? 92 : '23.2%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderStyle: full ? 'dashed' : 'solid', borderColor: on ? C.text : C.line,
              backgroundColor: on ? C.text : hovered && !full ? C.soft : C.bg, opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ color: on ? C.bg : full ? alpha(C.mute, 0.6) : C.text, fontWeight: '700', fontSize: 14.5, textDecorationLine: full ? 'line-through' : 'none', fontVariant: ['tabular-nums'] }}>{x.time}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  const fav = B.person && B.favStaff?.id === B.person.id && B.team.length > 1;
  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {S.days.map((x) => {
          const dd = new Date(x + 'T00:00'), on = x === B.date;
          return (
            <Pressable key={x} onPress={() => { B.setDate(x); B.setTime(null); }} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ width: wide ? 64 : 52, height: 62, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? C.text : C.soft, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <Text style={{ color: on ? alpha(C.bg, 0.7) : C.mute, fontSize: 11.5, fontWeight: '700' }}>{x === today ? 'Σήμ.' : DAYS[dd.getDay()]}</Text>
              <Text style={{ color: on ? C.bg : C.text, fontSize: 18, fontWeight: '800', marginTop: 1 }}>{dd.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {B.slots === null ? <Text style={{ color: C.mute, paddingVertical: 10 }}>Φόρτωση…</Text>
        : free.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Note>{B.person && B.team.length > 1 ? `${fav ? '♥ ' : ''}${firstName(B.person.name)}: δεν υπάρχει ελεύθερη ώρα ${fmtLong(B.date)}.` : `Δεν υπάρχουν ελεύθερες ώρες ${fmtLong(B.date)}.`} Δοκίμασε άλλη μέρα.</Note>
            {B.person && B.team.length > 1 && <Btn kind="ghost" size="sm" title="Δες ώρες με οποιονδήποτε" onPress={() => B.pickWho(ANY)} />}
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {am.length > 0 && <Text style={{ color: C.mute, fontSize: 12.5, fontWeight: '800' }}>Πρωί</Text>}
            {am.length > 0 && <Slots list={am} />}
            {pm.length > 0 && <Text style={{ color: C.mute, fontSize: 12.5, fontWeight: '800', marginTop: 4 }}>Απόγευμα</Text>}
            {pm.length > 0 && <Slots list={pm} />}
          </View>
        )}
    </View>
  );
}

/* ---------- σύνοψη (επιβεβαίωση) ---------- */
function Line({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <View style={[s.row, { justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.line }]}>
      <Text style={{ color: big ? C.text : C.mute, fontWeight: big ? '800' : '600', fontSize: big ? 16 : 14 }}>{k}</Text>
      <Text style={{ color: v ? C.text : C.mute, fontWeight: '800', fontSize: big ? 16 : 14, flexShrink: 1, textAlign: 'right' }} numberOfLines={2}>{v || '—'}</Text>
    </View>
  );
}
export function SummaryLines() {
  const S = useStore(); const B = useBook();
  const sv = B.service, cls = !!B.classSlot;
  const when = B.time ? `${fmtLong(B.date)} · ${B.time}${sv ? '–' + endOf(B.time, sv.duration_min) : ''}` : '';
  const withWho = B.team.length === 0 ? null : B.who === ANY ? 'Όποιος είναι ελεύθερος' : B.person ? firstName(B.person.name) : '';
  const pk = packOf(S);
  const pay = pk ? `Από πακέτο · μένουν ${Math.max(0, pk.left - 1)}` : sv?.price_cents != null ? price(sv.price_cents) : '';
  return (
    <View>
      <Line k={cls ? 'Μάθημα' : 'Υπηρεσία'} v={sv ? `${sv.name}` : ''} />
      {withWho !== null && <Line k="Με" v={withWho} />}
      <Line k="Πότε" v={when} />
      {cls && B.classSlot && <Line k="Θέσεις" v={B.classSlot.free === 1 ? 'Η τελευταία ελεύθερη' : `${B.classSlot.free} ελεύθερες`} />}
      {!!pay && <Line k={pk ? 'Πληρωμή' : 'Σύνολο'} v={pay} big={!pk} />}
    </View>
  );
}
function KeepFav() {
  const B = useBook();
  if (!B.person || B.team.length < 2) return null;
  return (
    <Pressable onPress={() => B.setKeep(!B.keep)} style={[s.row, { gap: 12, borderWidth: 1.5, borderColor: B.keep ? C.text : C.line, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 }]}>
      <Text style={{ fontSize: 18, color: C.text }}>{B.keep ? '♥' : '♡'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>Θέλω πάντα {withArticle(B.person.name)}</Text>
        <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600', marginTop: 1 }}>Την επόμενη φορά δεν θα σε ρωτήσουμε ξανά</Text>
      </View>
      <Toggle value={B.keep} onChange={B.setKeep} />
    </Pressable>
  );
}
function Policy() {
  const S = useStore();
  const m = S.biz?.cancel_before_min ?? 0;
  const c = m >= 1440 ? `${Math.round(m / 1440)} ${m >= 2880 ? 'μέρες' : 'μέρα'}` : m >= 60 ? `${Math.round(m / 60)} ${m >= 120 ? 'ώρες' : 'ώρα'}` : `${m} λεπτά`;
  return (
    <Text style={{ color: C.mute, fontSize: 12.5, lineHeight: 18, fontWeight: '600' }}>
      {S.biz?.requires_approval ? 'Το κατάστημα εγκρίνει κάθε κράτηση· θα ειδοποιηθείς. ' : ''}
      {packOf(S) ? '' : 'Πληρωμή στο κατάστημα. '}{m ? `Δωρεάν ακύρωση έως ${c} πριν.` : ''}
    </Text>
  );
}
const ctaText = (S: any, B: any) => (B.classSlot ? 'Κλείσε θέση' : S.biz?.requires_approval ? 'Στείλε αίτημα' : 'Κλείσε το ραντεβού');

export function StepConfirm() {
  const S = useStore();
  const color = S.st?.color ?? C.accent;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 20, overflow: 'hidden' }}>
        <View style={[s.row, { gap: 12, padding: 14, backgroundColor: color }]}>
          <StoreLogo size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{S.biz?.name}</Text>
            <Text style={{ color: alpha('#ffffff', 0.85), fontSize: 12.5 }} numberOfLines={1}>{S.biz?.address}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 14 }}><SummaryLines /></View>
      </View>
      <KeepFav />
      <Policy />
    </View>
  );
}

/* ---------- φύλλο κινητού ---------- */
export function BookSheet() {
  const S = useStore(); const B = useBook();
  const bottom = useSafeAreaInsets().bottom;
  const wide = useWide();
  const y = useRef(new Animated.Value(600)).current;
  useEffect(() => { if (B.open) { y.setValue(600); Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start(); } }, [B.open]);
  if (!B.open) return null;
  const i = B.steps.indexOf(B.step), n = B.steps.length;
  const sub = [B.step !== 'service' && B.service ? B.service.name + ' · ' + dur(B.service.duration_min) : '',
    B.step === 'time' && B.team.length ? (B.who === ANY ? 'Οποιοσδήποτε' : B.person ? (B.favStaff?.id === B.person.id ? '♥ ' : '') + firstName(B.person.name) : '') : ''].filter(Boolean);
  const canNext = B.step === 'service' ? !!B.service : B.step === 'staff' ? !!B.who : B.step === 'time' ? !!B.time : true;
  const cta = B.step === 'confirm' ? ctaText(S, B)
    : B.step === 'time' && B.time ? `Συνέχεια · ${fmtLong(B.date)}, ${B.time}`
    : B.step === 'service' && B.service ? `Συνέχεια · ${B.service.price_cents != null ? price(B.service.price_cents) : dur(B.service.duration_min)}` : 'Συνέχεια';
  const title = B.classSlot ? 'Όλα σωστά;' : TITLE[B.step];
  return (
    <Modal transparent visible animationType="fade" onRequestClose={B.close} statusBarTranslucent>
      <Pressable onPress={B.close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} accessibilityLabel="Κλείσιμο" />
      <Animated.View style={[wide
          ? { position: 'absolute', alignSelf: 'center', top: '10%', width: 520, maxHeight: '80%', borderRadius: 28, paddingBottom: 22 }
          : { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: bottom + 18 },
        { backgroundColor: C.bg, paddingTop: 10, paddingHorizontal: 20, transform: [{ translateY: y }] }, shadow(3)]}>
        {!wide && <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 12 }} />}
        <View style={[s.row, { gap: 10 }]}>
          {i > 0 && !B.classSlot && (
            <Pressable onPress={B.back} accessibilityLabel="Πίσω" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={17} color={C.text} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            {!B.classSlot && n > 1 && <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700' }}>Βήμα {i + 1} από {n}</Text>}
            <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
          </View>
          <Pressable onPress={B.close} accessibilityLabel="Κλείσιμο" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.mute, fontWeight: '800', fontSize: 15 }}>✕</Text>
          </Pressable>
        </View>
        {!B.classSlot && n > 1 && (
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 10, marginBottom: 12 }}>
            {B.steps.map((x, j) => <View key={x} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: j <= i ? C.text : C.line }} />)}
          </View>
        )}
        {B.step !== 'confirm' && sub.length > 0 && <View style={{ marginBottom: 12 }}><Chips items={sub} /></View>}
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 4, paddingTop: B.classSlot ? 12 : 0 }} showsVerticalScrollIndicator={false}>
          {B.step === 'service' && <StepService />}
          {B.step === 'staff' && <StepStaff />}
          {B.step === 'time' && <StepTime />}
          {B.step === 'confirm' && <StepConfirm />}
        </ScrollView>
        {B.step !== 'service' && (
          <Btn title={B.busy ? '…' : cta} disabled={!canNext || B.busy} onPress={B.step === 'confirm' ? B.submit : B.next} style={{ marginTop: 14 }} />
        )}
      </Animated.View>
    </Modal>
  );
}

/* ---------- «Το συνηθισμένο σου» ---------- */
export function UsualCard() {
  const B = useBook();
  const st = B.favStaff, sv = B.usualService;
  if (!st || !sv || B.classes) return null;
  const nx = B.usualNext;
  return (
    <View style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 14, gap: 12, backgroundColor: C.bg }, shadow(2)]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={{ color: C.mute, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }}>ΤΟ ΣΥΝΗΘΙΣΜΕΝΟ ΣΟΥ</Text>
        <Pressable onPress={() => B.setFav(null)} hitSlop={8}><Text style={{ color: C.mute, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }}>Ξέχνα το</Text></Pressable>
      </View>
      <View style={[s.row, { gap: 12 }]}>
        <Face st={st} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{sv.name}</Text>
          <Text style={{ color: C.mute, fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>με {withArticle(st.name)} · {dur(sv.duration_min)}{sv.price_cents != null ? ' · ' + price(sv.price_cents) : ''}</Text>
        </View>
      </View>
      <Note>{nx === undefined ? 'Ψάχνουμε την πρώτη ελεύθερη ώρα…' : nx === null ? `${firstName(st.name)}: δεν υπάρχει ελεύθερη ώρα τις επόμενες μέρες.` : `Πρώτη ελεύθερη ώρα: ${fmtLong(nx.date)} · ${nx.time}`}</Note>
      {nx ? <Btn title={`Κλείσε ${fmtLong(nx.date)}, ${nx.time}`} onPress={() => B.start({ service: sv, who: st.id, date: nx.date, time: nx.time, at: 'confirm' })} /> : null}
      <Btn kind="ghost" title="Άλλη ώρα" onPress={() => B.start({ service: sv, who: st.id, at: 'time', date: nx?.date })} />
    </View>
  );
}

/* ---------- αρχική καρτέλα καταστήματος με ραντεβού (κινητό) ---------- */
export function BookHome() {
  const S = useStore(); const B = useBook();
  return (
    <View style={{ gap: 18, paddingHorizontal: 20, paddingTop: 16 }}>
      <UsualCard />
      {!!S.biz?.description && <Text style={{ color: C.mute, fontSize: 14, lineHeight: 20 }}>{S.biz.description}</Text>}
      {S.services.length > 0 && (
        <View>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginBottom: 2 }}>Υπηρεσίες</Text>
          {S.services.map((sv, i) => (
            <Pressable key={sv.id} onPress={() => B.start({ service: sv })} style={({ pressed }) => [s.row, { gap: 12, paddingVertical: 13, borderBottomWidth: i === S.services.length - 1 ? 0 : 1, borderBottomColor: C.line, opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{sv.name}</Text>
                <Text style={{ color: C.mute, fontSize: 12.5 }}>{dur(sv.duration_min)}</Text>
              </View>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{sv.price_cents == null ? '' : price(sv.price_cents)}</Text>
              <Icon name="chevron" size={16} color={C.mute} />
            </Pressable>
          ))}
        </View>
      )}
      {B.staff.length > 1 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>Η ομάδα</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {B.staff.map((st) => (
              <View key={st.id} style={{ width: 84, alignItems: 'center', gap: 4 }}>
                <Face st={st} size={60} />
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{firstName(st.name)}{B.favStaff?.id === st.id ? ' ♥' : ''}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* ---------- υπολογιστής: όλα τα βήματα σε μία σελίδα ---------- */
function Sec({ n, title, done, value, onChange, children }: { n: number; title: string; done?: boolean; value?: string; onChange?: () => void; children?: React.ReactNode }) {
  return (
    <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 22, gap: 14, backgroundColor: done ? alpha(C.text, 0.02) : C.bg }}>
      <View style={[s.row, { gap: 12 }]}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' }}>
          {done ? <Icon name="check" size={14} color={C.bg} /> : <Text style={{ color: C.bg, fontWeight: '800', fontSize: 13 }}>{n}</Text>}
        </View>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{title}</Text>
        {!!value && <Text style={{ color: C.mute, fontWeight: '700', fontSize: 14, flex: 1 }} numberOfLines={1}>· {value}</Text>}
        {!!onChange && <Pressable onPress={onChange} style={{ marginLeft: 'auto' }}><Text style={{ color: C.text, fontWeight: '700', fontSize: 13.5, textDecorationLine: 'underline' }}>Αλλαγή</Text></Pressable>}
      </View>
      {children}
    </View>
  );
}
export function BookPage() {
  const S = useStore(); const B = useBook();
  const svDone = !!B.service && B.step !== 'service';
  let n = 0;
  return (
    <View style={{ gap: 14, paddingHorizontal: 20, paddingBottom: 40 }}>
      <UsualCard />
      {S.services.length > 1 && (
        <Sec n={++n} title={svDone ? 'Υπηρεσία' : 'Τι θα κάνεις;'} done={svDone} value={svDone ? `${B.service!.name}, ${dur(B.service!.duration_min)}${B.service!.price_cents != null ? ', ' + price(B.service!.price_cents) : ''}` : ''}
          onChange={svDone ? () => B.setStep('service') : undefined}>
          {!svDone && <StepService grid />}
          {!svDone && !!B.service && <Btn title="Συνέχεια" onPress={() => B.setStep('time')} style={{ alignSelf: 'flex-start' }} />}
        </Sec>
      )}
      {svDone || S.services.length <= 1 ? (
        <>
          {B.team.length > 1 && <Sec n={++n} title="Με ποιον;"><StepStaff row /></Sec>}
          {!!B.service && (
            <Sec n={++n} title="Πότε;" value={S.services.length <= 1 ? `${B.service.name}, ${dur(B.service.duration_min)}${B.person ? ' με ' + withArticle(B.person.name) : ''}` : ''}>
              <StepTime wide />
            </Sec>
          )}
        </>
      ) : null}
    </View>
  );
}
/* Η δεξιά στήλη στον υπολογιστή: η σύνοψη της κράτησης και το κουμπί. */
export function BookSummary() {
  const S = useStore(); const B = useBook();
  const color = S.st?.color ?? C.accent;
  const ready = !!B.service && !!B.time && (B.team.length < 2 || !!B.who);
  return (
    <View style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 24, overflow: 'hidden', backgroundColor: C.bg }, shadow(2)]}>
      <View style={{ height: 96, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 18, top: 70 }}><StoreLogo size={50} /></View>
      <View style={{ paddingTop: 34, paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
        <View>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }} numberOfLines={1}>{S.biz?.name}</Text>
          <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{S.biz?.address}</Text>
        </View>
        <SummaryLines />
        <KeepFav />
        <Btn title={B.busy ? '…' : ctaText(S, B)} disabled={!ready || B.busy} onPress={B.submit} />
        <Policy />
      </View>
    </View>
  );
}
