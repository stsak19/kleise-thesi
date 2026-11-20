import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../../../lib/Txt';
import { rpc } from '../../../lib/supabase';
import { NoBiz, useMyBiz } from '../../../lib/owner/hub';
import { deskCol, useWide } from '../../../lib/owner/desk';
import { Kpi } from '../../../lib/admin/parts';
import { C, Chip, DAYS, Empty, Section, alpha, fmtDay, price, s } from '../../../lib/ui';

/* Στατιστικά επιχείρησης (Κατάστημα → Στατιστικά). Όλα από τη συνάρτηση business_stats της βάσης (023),
   που τη βλέπει μόνο ο ιδιοκτήτης. Χωρίς βιβλιοθήκη γραφημάτων: οι μπάρες είναι απλά View, χρώματα από το θέμα. */
type Stats = {
  days: number; since: string; total: number; attended: number; no_show: number; cancelled: number; clients: number; new_clients: number;
  upcoming: number; value_cents: number; packs: number; paid_cents: number; paid_fee_cents: number; paid_n: number;
  weeks: { week: string; n: number }[]; hours: { h: number; n: number }[]; weekdays: { wd: number; n: number }[];
  services: { name: string; n: number; no_show: number; value_cents: number }[];
};
const PERIODS = [7, 30, 90, 365];
const periodLabel = (d: number) => (d === 7 ? '7 μέρες' : d === 365 ? 'Έτος' : `${d} μέρες`);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

/* Κάθετες μπάρες με ετικέτα από κάτω. Η πιο ψηλή τονίζεται. */
function Bars({ data, height = 120 }: { data: { label: string; n: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((x) => x.n));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: height + 34, paddingTop: 16 }}>
      {data.map((x, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${x.label}: ${x.n}`}>
          {x.n > 0 && <Text style={{ color: C.mute, fontSize: 10, fontWeight: '700' }}>{x.n}</Text>}
          <View style={{ width: '100%', maxWidth: 28, height: Math.max(2, (x.n / max) * height), borderRadius: 6,
            backgroundColor: x.n === max && x.n > 0 ? C.text : alpha(C.text, x.n ? 0.25 : 0.08) }} />
          <Text numberOfLines={1} style={{ color: C.mute, fontSize: 10, fontWeight: '600' }}>{x.label}</Text>
        </View>
      ))}
    </View>
  );
}
const Box = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 14 }}>{children}</View>
);

export default function BizStats() {
  const biz = useMyBiz();
  const wide = useWide();
  const [days, setDays] = useState(30);
  const [st, setSt] = useState<Stats | null | 'missing'>(null);
  useEffect(() => {
    if (!biz?.id) return;
    let live = true; setSt(null);
    rpc<Stats>('business_stats', { p_business: biz.id, p_days: days })
      .then((r) => live && setSt(r ?? 'missing')).catch(() => live && setSt('missing'));
    return () => { live = false; };
  }, [biz?.id, days]);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;

  const body = () => {
    if (st === null) return <Text style={{ color: C.mute, textAlign: 'center', marginTop: 30 }}>Μια στιγμή…</Text>;
    if (st === 'missing') return <Empty icon="calendar" title="Τα στατιστικά δεν είναι έτοιμα" text="Χρειάζεται το migration 023 στη βάση. Δοκίμασε ξανά σε λίγο." />;
    if (!st.total && !st.cancelled && !st.paid_n) return <Empty icon="calendar" title="Δεν υπάρχουν κρατήσεις ακόμα" text={`Στις τελευταίες ${st.days} μέρες δεν έγινε κράτηση. Μόλις αρχίσουν, θα δεις εδώ πότε έχεις κόσμο.`} />;
    // Ώρες: από την πρώτη ως την τελευταία ώρα με κρατήσεις.
    const hs = st.hours.map((x) => x.h);
    const hours = hs.length ? Array.from({ length: Math.max(...hs) - Math.min(...hs) + 1 }, (_, i) => Math.min(...hs) + i) : [];
    const byH = Object.fromEntries(st.hours.map((x) => [x.h, x.n]));
    const byW = Object.fromEntries(st.weekdays.map((x) => [x.wd, x.n]));
    const week = [1, 2, 3, 4, 5, 6, 0]; // Δευτέρα πρώτη
    const busiestH = st.hours.reduce((a, b) => (b.n > a.n ? b : a), { h: -1, n: 0 });
    const busiestW = st.weekdays.reduce((a, b) => (b.n > a.n ? b : a), { wd: -1, n: 0 });
    const past = st.attended + st.no_show;
    return <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Kpi n={st.total} label="Κρατήσεις" />
        <Kpi n={st.clients} label="Πελάτες" extra={st.new_clients ? `+${st.new_clients} νέοι` : undefined} />
        <Kpi n={pct(st.no_show, past)} label={`Δεν ήρθαν (${st.no_show})`} bad={past > 0 && st.no_show / past >= 0.1} />
        <Kpi n={st.cancelled} label="Ακυρώσεις" />
      </View>
      {(busiestH.h >= 0 || busiestW.wd >= 0) && (
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>
          Πιο πολύς κόσμος{busiestW.wd >= 0 ? ` ${['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'][busiestW.wd]}` : ''}
          {busiestH.h >= 0 ? ` γύρω στις ${String(busiestH.h).padStart(2, '0')}:00` : ''}.
          {st.upcoming ? ` Τις επόμενες 7 μέρες έχεις ${st.upcoming} ${st.upcoming === 1 ? 'κράτηση' : 'κρατήσεις'}.` : ''}
        </Text>
      )}

      <Section title="Ώρες" sub="Πότε κλείνουν οι πελάτες σου" />
      <Box><Bars data={hours.map((h) => ({ label: String(h), n: byH[h] ?? 0 }))} /></Box>

      <Section title="Μέρες" />
      <Box><Bars height={90} data={week.map((d) => ({ label: DAYS[d], n: byW[d] ?? 0 }))} /></Box>

      {st.weeks.length > 1 && <>
        <Section title="Ανά εβδομάδα" />
        <Box><Bars height={90} data={st.weeks.slice(-13).map((w) => ({ label: fmtDay(w.week).split(' ')[1], n: w.n }))} /></Box>
      </>}

      {st.services.length > 0 && <>
        <Section title="Υπηρεσίες" sub="Οι πιο δημοφιλείς, με αξία από τον τιμοκατάλογο" />
        <Box>
          {st.services.map((x, i) => (
            <View key={x.name} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <Text style={{ flex: 1, color: C.text, fontWeight: '700' }} numberOfLines={1}>{x.name}</Text>
              {x.no_show > 0 && <Text style={{ color: C.bad, fontSize: 12, fontWeight: '700' }}>{x.no_show} δεν ήρθαν</Text>}
              <Text style={{ color: C.mute, fontWeight: '700', minWidth: 34, textAlign: 'right' }}>{x.n}</Text>
              {x.value_cents > 0 && <Text style={{ color: C.text, fontWeight: '800', minWidth: 64, textAlign: 'right' }}>{price(x.value_cents)}</Text>}
            </View>
          ))}
        </Box>
      </>}

      <Section title="Πακέτα και έσοδα" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Kpi n={st.packs} label="Πακέτα ενεργοποιήθηκαν" />
        <Kpi n={price(st.paid_cents) || '0€'} label={`Πληρωμές online (${st.paid_n})`} extra={st.paid_fee_cents ? `−${price(st.paid_fee_cents)} προμήθεια` : undefined} />
        {st.value_cents > 0 && <Kpi n={price(st.value_cents)} label="Αξία ραντεβού (τιμοκατάλογος)" />}
      </View>
      <Text style={{ color: C.mute, fontSize: 12 }}>
        Από {fmtDay(st.since)} ως σήμερα. «Δεν ήρθαν» μετράει όσα σημείωσες στο Πρόγραμμα. Η αξία ραντεβού είναι από τις τιμές των υπηρεσιών, όχι από πραγματικές πληρωμές.
      </Text>
    </>;
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 14, paddingBottom: 60 }, deskCol(wide)]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PERIODS.map((d) => <Chip key={d} label={periodLabel(d)} on={d === days} onPress={() => setDays(d)} />)}
      </View>
      {body()}
    </ScrollView>
  );
}
