import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../Txt';
import { say } from '../alert';
import { rpc } from '../supabase';
import { styleOf } from '../presets';
import { Avatar, Btn, C, Card, Empty, Icon, Pill, alpha, iso, price, s } from '../ui';
import { Face } from './hub';

/* Το πρόγραμμα της ημέρας με τον τρόπο του Gym Schedule:
   λωρίδα ημερών (μία βδομάδα πίσω, μπροστά όσο ανοίγει το κατάστημα), μεγάλος τίτλος ημέρας,
   τέσσερα μικρά κουτάκια που ανοίγουν λίστα, και οι ώρες της ημέρας σαν κάρτες που ανοίγουν. */

const DAYS_SHORT = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
const DAYS_LONG = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const MONTHS_GEN = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'];
export const fmtDayLong = (d0: string) => { const d = new Date(d0 + 'T00:00'); return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
export const nowHHMM = () => { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; };
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

/* Λωρίδα ημερών: οι περασμένες πιο σβηστές, το σήμερα με τελίτσα, η επιλεγμένη μαύρη και πάντα στη μέση. */
export function DaysBar({ value, onChange, ahead = 14, back = 7 }: { value: string; onChange: (d: string) => void; ahead?: number; back?: number }) {
  const today = iso(new Date());
  const days = useMemo(() => Array.from({ length: back + ahead + 1 }, (_, i) => plusDays(i - back)), [back, ahead]);
  const ref = useRef<any>(null);
  const first = useRef(true);
  const W = 56, GAP = 8;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const i = days.indexOf(value);
    if (i < 0 || !width) return;
    ref.current?.scrollTo({ x: Math.max(0, 20 + i * (W + GAP) - (width - W) / 2), animated: !first.current });
    first.current = false;
  }, [value, width, days]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: GAP, paddingHorizontal: 20, paddingVertical: 2 }}>
      {days.map((d) => {
        const dd = new Date(d + 'T00:00'), on = d === value, past = d < today, isToday = d === today;
        return (
          <Pressable key={d} onPress={() => onChange(d)}
            style={({ pressed }) => [{ width: W, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
              on ? { backgroundColor: C.text, borderColor: C.text } : { backgroundColor: C.bg, borderColor: past ? C.line : alpha(C.text, 0.18) },
              { opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: on ? alpha(C.bg, 0.7) : C.mute, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: past && !on ? 0.6 : 1 }}>{DAYS_SHORT[dd.getDay()]}</Text>
            <Text style={{ color: on ? C.bg : past ? alpha(C.text, 0.4) : C.text, fontWeight: '800', fontSize: 18, marginTop: 2 }}>{dd.getDate()}</Text>
            {isToday && <View style={{ position: 'absolute', bottom: 7, width: 4, height: 4, borderRadius: 2, backgroundColor: on ? C.bg : C.text }} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* Μικρό κουτάκι-νούμερο· πατιέται και ανοίγει τη λίστα του από κάτω. */
const Mini = ({ n, label, on, onPress, color }: { n: number | string; label: string; on: boolean; onPress: () => void; color?: string }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, minWidth: 0, borderRadius: 14, borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
    on ? { backgroundColor: C.text, borderColor: C.text } : { borderColor: alpha(C.text, 0.85), backgroundColor: C.bg }, { opacity: pressed ? 0.8 : 1 }]}>
    <Text style={{ color: on ? C.bg : color ?? C.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.4 }} numberOfLines={1}>{n}</Text>
    <Text style={{ color: on ? alpha(C.bg, 0.75) : C.mute, fontSize: 11, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>{label}</Text>
  </Pressable>
);

/* Ομαδοποίηση: μία κάρτα ανά ώρα· στα τμήματα μία ανά ώρα και μάθημα. */
export type Slot = { key: string; time: string; list: any[]; cls: boolean; cap: number; title?: string; staff?: string | null; color?: string | null };
export function slotsOf(day: any[], staffCount: number): Slot[] {
  const out: Slot[] = [];
  day.forEach((b) => {
    const cls = (b.capacity ?? 1) > 1;
    const key = b.time + (cls ? '|' + b.service_id : '');
    let g = out.find((x) => x.key === key);
    if (!g) {
      g = { key, time: b.time, list: [], cls, cap: cls ? b.capacity : Math.max(1, staffCount), title: cls ? b.service : undefined, staff: cls ? b.staff : null, color: cls ? b.staff_color : null };
      out.push(g);
    }
    g.list.push(b);
  });
  return out.sort((a, z) => a.time.localeCompare(z.time));
}
const seated = (l: any[]) => l.filter((b) => b.status !== 'no_show' && b.status !== 'cancelled').length;

/* Το μπλοκ που μένει καρφωμένο πάνω: λωρίδα, τίτλος ημέρας, κουτάκια, «Οι ώρες της ημέρας». */
export function DayHead({ biz, date, setDate, day, slots, detail, setDetail, extra }:
  { biz: any; date: string; setDate: (d: string) => void; day: any[]; slots: Slot[]; detail: string | null; setDetail: (d: string | null) => void; extra?: React.ReactNode }) {
  const today = iso(new Date());
  const live = day.filter((b) => b.status !== 'cancelled');
  const came = live.filter((b) => b.status === 'attended').length;
  const cap = slots.reduce((a, g) => a + g.cap, 0);
  const fill = cap ? Math.round((slots.reduce((a, g) => a + seated(g.list), 0) / cap) * 100) : 0;
  const hasPrice = live.some((b) => b.price_cents != null);
  const revenue = live.reduce((a, b) => a + (b.status === 'no_show' ? 0 : b.price_cents ?? 0), 0);
  const classes = slots.some((g) => g.cls);
  const toggle = (k: string) => setDetail(detail === k ? null : k);
  return (
    <View style={{ backgroundColor: C.bg, marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <DaysBar value={date} onChange={(d) => { setDate(d); setDetail(null); }} ahead={Math.max(7, biz.max_days_ahead ?? 14)} />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.6, flex: 1 }} numberOfLines={1}>{fmtDayLong(date)}</Text>
        {date !== today && (
          <Pressable onPress={() => { setDate(today); setDetail(null); }} hitSlop={8} style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.soft, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Σήμερα</Text>
          </Pressable>
        )}
      </View>
      <View style={[s.row, { gap: 8 }]}>
        <Mini n={live.length} label={classes ? 'Κρατήσεις' : 'Ραντεβού'} on={detail === 'all'} onPress={() => toggle('all')} />
        <Mini n={came} label="Ήρθαν" color={came ? C.ok : undefined} on={detail === 'came'} onPress={() => toggle('came')} />
        <Mini n={`${fill}%`} label="Πληρότητα" on={detail === 'fill'} onPress={() => toggle('fill')} />
        {hasPrice && !classes
          ? <Mini n={price(revenue) || '0€'} label="Έσοδα" on={detail === 'money'} onPress={() => toggle('money')} />
          : <Mini n={live.filter((b) => b.status === 'no_show').length} label="Δεν ήρθαν" on={detail === 'noshow'} onPress={() => toggle('noshow')} />}
      </View>
      {extra}
      <Text style={{ color: C.mute, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>Οι ώρες της ημέρας</Text>
    </View>
  );
}

/* Η λίστα που ανοίγει όταν πατάς ένα κουτάκι. */
export function DayDetail({ detail, day, slots, onClose }: { detail: string | null; day: any[]; slots: Slot[]; onClose: () => void }) {
  const router = useRouter();
  if (!detail) return null;
  const live = day.filter((b) => b.status !== 'cancelled');
  const rows = detail === 'came' ? live.filter((b) => b.status === 'attended') : detail === 'noshow' ? live.filter((b) => b.status === 'no_show') : live;
  const title = { all: 'Όλες οι κρατήσεις', came: 'Ήρθαν', noshow: 'Δεν ήρθαν', fill: 'Πληρότητα ανά ώρα', money: 'Έσοδα ανά ραντεβού' }[detail] ?? '';
  return (
    <View style={{ borderWidth: 1.5, borderColor: C.text, borderRadius: 18, overflow: 'hidden' }}>
      <View style={[s.row, { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: C.text }]}>
        <Text style={{ flex: 1, color: C.text, fontWeight: '800', fontSize: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={16} color={C.mute} /></Pressable>
      </View>
      {detail === 'fill' ? slots.map((g, i) => (
        <View key={g.key} style={[s.row, { paddingHorizontal: 16, paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, width: 56 }}>{g.time}</Text>
          <Text style={{ flex: 1, color: C.mute, fontSize: 13 }} numberOfLines={1}>{g.title ?? ''}</Text>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{seated(g.list)}/{g.cap}</Text>
        </View>
      )) : rows.length === 0 ? (
        <Text style={{ color: C.mute, textAlign: 'center', paddingVertical: 22, fontSize: 14 }}>Κανένας.</Text>
      ) : rows.map((b, i) => (
        <Pressable key={b.id} onPress={() => b.user_id && router.push({ pathname: '/owner/client', params: { id: b.user_id } })}
          style={({ pressed }) => [s.row, { paddingHorizontal: 16, paddingVertical: 11, backgroundColor: pressed ? C.soft : 'transparent' }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, textDecorationLine: 'underline', textDecorationColor: C.line }} numberOfLines={1}>{b.client || 'Πελάτης'}</Text>
            <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>{[b.service, b.phone].filter(Boolean).join(' · ')}</Text>
          </View>
          <Text style={{ color: C.mute, fontWeight: '700', fontSize: 13 }}>{detail === 'money' ? price(b.price_cents) : b.time}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* Νέοι πελάτες προς έγκριση: ένα μαύρο πλαίσιο που ανοίγει, ώστε να μη σπρώχνει το πρόγραμμα κάτω. */
export function NewClients({ biz, list, onDone }: { biz: any; list: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  const set = async (u: string, st: string) => { await rpc('owner_set_member', { p_business: biz.id, p_user: u, p_status: st }); onDone(); };
  return (
    <View style={{ borderWidth: 1.5, borderColor: C.text, borderRadius: 18, overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen(!open)} style={[s.row, { backgroundColor: C.text, paddingHorizontal: 16, paddingVertical: 12, gap: 8 }]}>
        <Text style={{ flex: 1, color: C.bg, fontWeight: '800', fontSize: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {list.length === 1 ? '1 νέος πελάτης περιμένει' : `${list.length} νέοι πελάτες περιμένουν`}
        </Text>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={12} color={C.bg} /></View>
      </Pressable>
      {open && list.map((p, i) => (
        <View key={p.user_id} style={[s.row, { gap: 10, paddingHorizontal: 16, paddingVertical: 11 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{p.name || 'Χωρίς όνομα'}</Text>
            {!!p.phone && <Text style={{ color: C.mute, fontSize: 13 }}>{p.phone}</Text>}
          </View>
          <Btn size="sm" color={C.ok} title="Έγκριση" onPress={() => set(p.user_id, 'approved')} />
          <Btn size="sm" kind="danger" title="Όχι" onPress={() => set(p.user_id, 'blocked')} />
        </View>
      ))}
    </View>
  );
}

/* «Ήρθαν;»: κρατήσεις της ημέρας που η ώρα τους πέρασε και δεν σημειώθηκαν. Κόκκινο πλαίσιο, ανοίγει με πάτημα. */
export function DidTheyCome({ day, onChange }: { day: any[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [later, setLater] = useState(false);
  const now = nowHHMM();
  const rows = day.filter((b) => b.status === 'booked' && b.time < now);
  if (later || rows.length === 0) return null;
  const set = async (b: any, st: string) => { const r = await rpc('owner_set_status', { p_booking: b.id, p_status: st }); if (!r?.ok) say(r?.error ?? 'Δεν έγινε'); onChange(); };
  return (
    <View style={{ borderWidth: 1.5, borderColor: C.bad, borderRadius: 18, overflow: 'hidden' }}>
      <View style={[s.row, { backgroundColor: C.bad, paddingHorizontal: 16, paddingVertical: 12 }]}>
        <Pressable onPress={() => setOpen(!open)} style={[s.row, { flex: 1, gap: 8 }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            {rows.length === 1 ? '1 κράτηση ήρθε;' : `${rows.length} κρατήσεις ήρθαν;`}
          </Text>
          <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={12} color="#fff" /></View>
        </Pressable>
        <Pressable onPress={() => setLater(true)} hitSlop={8}><Text style={{ color: alpha('#ffffff', 0.85), fontSize: 13, textDecorationLine: 'underline' }}>Αργότερα</Text></Pressable>
      </View>
      {open && rows.map((b, i) => (
        <View key={b.id} style={[s.row, { gap: 10, paddingHorizontal: 16, paddingVertical: 11 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{b.client || 'Πελάτης'}</Text>
            <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{b.time} · {b.service}</Text>
          </View>
          <Btn size="sm" color={C.ok} title="Ήρθε" onPress={() => set(b, 'attended')} />
          <Btn size="sm" kind="ghost" title="Δεν ήρθε" onPress={() => set(b, 'no_show')} />
        </View>
      ))}
    </View>
  );
}

/* Οι ώρες της ημέρας: κάθε ώρα μία κάρτα με μεγάλη ώρα, μπάρα πληρότητας και «Χ από Υ θέσεις · Ζ ήρθαν».
   Πάτημα → ανοίγει από κάτω η λίστα με τους πελάτες και τα κουμπιά. Ανοιχτή μία κάθε φορά. */
export function HourList({ biz, date, slots, onChange, closed }: { biz: any; date: string; slots: Slot[]; onChange: () => void; closed?: boolean }) {
  const router = useRouter();
  const brand = styleOf(biz).color;
  const [open, setOpen] = useState<string | null>(null);
  const today = iso(new Date());
  const now = nowHHMM();
  // Στο σήμερα ανοίγει μόνη της η ώρα που τρέχει ή η επόμενη.
  useEffect(() => {
    if (date !== today) { setOpen(null); return; }
    const next = slots.find((g) => g.time >= now) ?? slots[slots.length - 1];
    setOpen(next?.key ?? null);
  }, [date, slots.length]);

  const setStatus = async (b: any, st: string) => {
    const r = await rpc('owner_set_status', { p_booking: b.id, p_status: st }); if (!r?.ok) say(r?.error ?? 'Δεν έγινε'); onChange();
  };

  if (closed && slots.length === 0) return <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: 18, paddingVertical: 34, alignItems: 'center' }}>
    <Text style={{ color: C.mute, fontSize: 14 }}>Κλειστά — καμία ενεργή ώρα αυτή την ημέρα.</Text></View>;
  if (slots.length === 0) return <Card><Empty emoji="☕" title="Καμία κράτηση" text="Δεν έχει κλείσει κανείς θέση αυτή τη μέρα." /></Card>;

  return <>
    {slots.map((g) => {
      const on = open === g.key;
      const taken = seated(g.list);
      const here = g.list.filter((b) => b.status === 'attended').length;
      const full = taken >= g.cap;
      const pct = Math.min(100, Math.round((taken / g.cap) * 100));
      const past = date < today || (date === today && g.time < now);
      const color = g.color ?? brand;
      const staffs = [...new Map(g.list.filter((b) => b.staff_id).map((b) => [b.staff_id, { name: b.staff, color: b.staff_color }])).values()];
      return (
        <View key={g.key} style={{ borderRadius: 20, borderWidth: 1.5, borderColor: on ? C.text : C.line, overflow: 'hidden', backgroundColor: C.bg }}>
          <Pressable onPress={() => setOpen(on ? null : g.key)} style={({ pressed }) => ({ padding: 14, gap: 8, backgroundColor: pressed ? C.soft : 'transparent' })}>
            <View style={[s.row, { gap: 10 }]}>
              <Text style={{ color: past && !on ? C.mute : C.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 }}>{g.time}</Text>
              <View style={[s.row, { flex: 1, flexWrap: 'wrap', gap: 6 }]}>
                {g.cls && <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{g.title}</Text>}
                {full && <View style={{ backgroundColor: C.text, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: C.bg, fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>Γεμάτη</Text></View>}
              </View>
              {!g.cls && staffs.length > 0 && <View style={{ flexDirection: 'row' }}>
                {staffs.slice(0, 3).map((p, i) => <View key={i} style={{ marginLeft: i ? -8 : 0, borderRadius: 14, borderWidth: 2, borderColor: C.bg }}><Face p={p} size={24} /></View>)}
              </View>}
              <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.text, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.text : 'transparent',
                transform: [{ rotate: on ? '-90deg' : '90deg' }] }}>
                <Icon name="chevron" size={12} color={on ? C.bg : C.text} />
              </View>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.soft, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: full ? C.text : color }} />
            </View>
            <Text style={{ color: C.mute, fontSize: 12 }}>
              {g.cls ? `${taken} από ${g.cap} θέσεις` : `${taken} ραντεβού${g.cap > 1 ? ` · ${g.cap - taken > 0 ? `${g.cap - taken} ελεύθερ${g.cap - taken === 1 ? 'η' : 'ες'}` : 'όλοι απασχολημένοι'}` : ''}`}
              {` · ${here} ήρθ${here === 1 ? 'ε' : 'αν'}`}
              {g.cls && g.staff ? ` · ${g.staff}` : ''}
            </Text>
          </Pressable>

          {on && (
            <View style={{ borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card, paddingHorizontal: 14 }}>
              {g.list.map((b, i) => (
                <View key={b.id} style={[{ paddingVertical: 12, gap: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                  <View style={[s.row, { gap: 10 }]}>
                    <Avatar name={b.client || 'Π'} color={b.staff_color ?? color} size={34} />
                    <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => b.user_id && router.push({ pathname: '/owner/client', params: { id: b.user_id } })}>
                      <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, textDecorationLine: 'underline', textDecorationColor: alpha(C.text, 0.25) }} numberOfLines={1}>{b.client || 'Πελάτης'}</Text>
                      <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>
                        {(g.cls ? [b.phone] : [b.service, b.duration_min ? `${b.duration_min}'` : null, b.price_cents ? price(b.price_cents) : null, b.staff ? b.staff.split(' ')[0] : null]).filter(Boolean).join(' · ')}
                      </Text>
                    </Pressable>
                    {b.status === 'attended' && <Pill text="Ήρθε" tone="ok" />}
                    {b.status === 'no_show' && <Pill text="Δεν ήρθε" tone="bad" />}
                  </View>
                  {b.status === 'booked' ? (
                    <View style={[s.row, { gap: 8 }]}>
                      <Btn size="sm" color={C.ok} icon="check" title="Ήρθε" style={{ flex: 1 }} onPress={() => setStatus(b, 'attended')} />
                      {past
                        ? <Btn size="sm" kind="ghost" title="Δεν ήρθε" style={{ flex: 1 }} onPress={() => setStatus(b, 'no_show')} />
                        : <Btn size="sm" kind="danger" title="Ακύρωση" style={{ flex: 1 }} onPress={() => setStatus(b, 'cancelled')} />}
                      <Pressable onPress={() => router.navigate({ pathname: '/inbox', params: { to: b.user_id } })} hitSlop={6}
                        style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.soft : C.bg })}>
                        <Icon name="chat" size={16} color={C.text} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => setStatus(b, 'booked')} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
                      <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>Αναίρεση</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      );
    })}
  </>;
}

