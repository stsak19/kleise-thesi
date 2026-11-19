import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../Txt';
import { say } from '../alert';
import { rpc, sb } from '../supabase';
import { useAuth } from '../auth';
import { styleOf } from '../presets';
import { DAYNAME, EMPTY_BIZ, HEX, Hours, Slot, Svc, WEEK, badHours, loadBusiness, newKey, nextSpan, presetData, saveBusiness } from './save';
import { Btn, C, CATEGORIES, catLabel, Card, Chip, Group, Icon, Input, Section, SwitchRow, T, TextBtn, Toggle, alpha, catEmoji, s, shadow } from '../ui';
import { AmountPick, DAY_UNITS, TimeBtn } from '../TimePick';
import { ServiceBoard, ServiceModal, draftFor, withSched, type Person, type SvcDraft } from './services';
import { groupOf, svcKind } from './svcKind';
import { useActiveBizId } from './active';
import { PhotosEditor } from './Photos';
import { ColorSample, PAGE_COLORS, Swatches } from './steps';
import { useWide } from '../wide';

/* «Ρυθμίσεις καταστήματος»: Στοιχεία · Υπηρεσίες · Ωράριο · Κανόνες · Εμφάνιση.
   Υπολογιστής: μία ενότητα τη φορά, με το πλαϊνό μενού να δείχνει ποια (app/(biz)/(hub)/shop-settings.tsx).
   Κινητό: μία ενότητα τη φορά, από τη σελίδα «Κατάστημα» (app/(biz)/owner/setup.tsx?s=…). Η λογική των υπηρεσιών αλλάζει ανά είδος (lib/owner/svcKind.ts). */

export type SectionKey = 'details' | 'services' | 'hours' | 'rules' | 'look';
export const SECTIONS: { key: SectionKey; label: string }[] = [
  // Ίδια σειρά με τον οδηγό: στοιχεία → ωράριο → υπηρεσίες → κανόνες → εμφάνιση
  { key: 'details', label: 'Στοιχεία' }, { key: 'hours', label: 'Ωράριο' }, { key: 'services', label: 'Υπηρεσίες' },
  { key: 'rules', label: 'Κανόνες' }, { key: 'look', label: 'Εμφάνιση' },
];
/* Ο τίτλος της ενότητας Υπηρεσίες αλλάζει ανά είδος (Μαθήματα, Συνεδρίες, Είδη επίσκεψης). */
export const sectionLabel = (key: SectionKey, category?: string | null) => (key === 'services' ? svcKind(category).title : SECTIONS.find((x) => x.key === key)!.label);

const DEFAULT_HOURS: Hours = [1, 2, 3, 4, 5].map((d) => ({ weekday: d, opens: '09:00', closes: '21:00', svc: null }));

function useStoreSettings() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [b, setB] = useState<any>(EMPTY_BIZ);
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [removed, setRemoved] = useState<string[]>([]);
  const [staff, setStaff] = useState<Person[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useActiveBizId(); // αλλαγή επιχείρησης από το πλαϊνό μενού → φόρτωσε ξανά

  const load = useCallback(async () => {
    const r = await loadBusiness(uid);
    if (r) {
      setB(r.b); setSvcs(r.svcs); setHours(r.hours.length ? r.hours : DEFAULT_HOURS); setRemoved([]);
      const { data, error } = await sb.from('staff').select('*').eq('business_id', r.b.id);
      setStaff(error ? [] : (data ?? []).filter((p: any) => p.active !== false).map((p: any) => ({ id: p.id, name: p.name, color: p.color, services: p.services ?? [] })));
    }
    setReady(true);
  }, [uid, active]);
  useEffect(() => { load(); }, [load]);

  /* Αποθηκεύει όλο το κατάστημα. next: τιμές που μόλις άλλαξαν (για να μην περιμένουμε το setState). */
  const persist = async (next?: { svcs?: Svc[]; hours?: Hours; removed?: string[] }, team?: { key: string; ids: string[] }) => {
    const S = next?.svcs ?? svcs, H = next?.hours ?? hours, R = next?.removed ?? removed;
    if (!b.name.trim() || !b.city.trim()) { say('Γράψε όνομα και πόλη στα Στοιχεία'); return false; }
    if (b.brand_color && !HEX.test(b.brand_color)) { say('Το χρώμα πρέπει να είναι της μορφής #RRGGBB'); return false; }
    const bad = badHours(H);
    if (bad) { say('Λάθος ωράριο', bad); return false; }
    setBusy(true);
    const r = await saveBusiness(uid, b, S, H, R);
    if (!r.ok) { setBusy(false); say('Δεν αποθηκεύτηκε', r.error); return false; }
    // Ποιος κάνει την υπηρεσία: γράφεται στα άτομα της ομάδας (staff.services).
    const sid = team && r.ids[team.key];
    if (team && sid) {
      for (const p of staff) {
        const has = (p.services ?? []).includes(sid), want = team.ids.includes(p.id);
        if (has !== want) await sb.from('staff').update({ services: want ? [...(p.services ?? []), sid] : (p.services ?? []).filter((x) => x !== sid) }).eq('id', p.id);
      }
    }
    await load();
    setBusy(false);
    return true;
  };
  return { uid, b, setB, svcs, setSvcs, hours, setHours, removed, setRemoved, staff, ready, busy, persist };
}
type St = ReturnType<typeof useStoreSettings>;

/* ---------- Στοιχεία ---------- */
function Details({ st }: { st: St }) {
  const { b, setB, svcs, setSvcs, setHours, setRemoved, uid } = st;
  const [picking, setPicking] = useState(false);
  const applyPreset = (cat: string) => {
    const p = presetData(cat);
    setB((x: any) => ({ ...x, category: cat, layout: null, theme: null, brand_color: null, ...p.rules }));
    setRemoved((r) => [...r, ...svcs.filter((x) => x.id).map((x) => x.id!)]);
    setSvcs(p.svcs); setHours(p.hours);
  };
  const pickCategory = (cat: string) => {
    if (cat === b.category) return;
    setB({ ...b, category: cat });
    say(`Είδος: ${catLabel(cat)}`, `Οι υπηρεσίες θα δουλεύουν πλέον ως «${svcKind(cat).title}». Θέλεις να μπουν και οι προτεινόμενες υπηρεσίες, ωράριο και κανόνες; Αλλάζουν όταν πατήσεις «Αποθήκευση».`,
      [{ text: 'Όχι', style: 'cancel' }, { text: 'Ναι, βάλ’ τες', onPress: () => applyPreset(cat) }]);
  };
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 14 }}>
        <Input label="Όνομα" placeholder="π.χ. Κομμωτήριο Ελένη" value={b.name} onChangeText={(v) => setB({ ...b, name: v })} />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Τι επιχείρηση είναι</Text>
          {/* Μαζεμένο: φαίνεται μόνο το είδος που έχεις· οι επιλογές ανοίγουν με «Αλλαγή». */}
          <Pressable onPress={() => setPicking((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: picking }}
            style={({ pressed }) => [s.row, { gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: pressed ? alpha(C.text, 0.06) : C.soft }]}>
            <Text style={{ fontSize: 22 }}>{catEmoji(b.category)}</Text>
            <Text style={{ flex: 1, color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{b.category ? catLabel(b.category) : 'Διάλεξε είδος'}</Text>
            <Text style={{ color: C.mute, fontWeight: '700', fontSize: 14 }}>{picking ? 'Κλείσιμο' : 'Αλλαγή'}</Text>
          </Pressable>
          {picking && (
            <View style={[s.row, { flexWrap: 'wrap' }]}>
              {CATEGORIES.filter((c) => c.key !== b.category).map((c) => <Chip key={c.key} emoji={c.emoji} label={c.label} onPress={() => { setPicking(false); pickCategory(c.key); }} />)}
            </View>
          )}
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><Input label="Πόλη" placeholder="Αθήνα" value={b.city} onChangeText={(v) => setB({ ...b, city: v })} /></View>
          <View style={{ flex: 1 }}><Input label="Τηλέφωνο" placeholder="210…" keyboardType="phone-pad" value={b.phone ?? ''} onChangeText={(v) => setB({ ...b, phone: v })} /></View>
        </View>
        <View style={[s.row, { gap: 12 }]}>
          <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>Να φαίνεται το τηλέφωνο</T><T mute style={{ fontSize: 13 }}>Οι πελάτες το βλέπουν στη σελίδα σου.</T></View>
          <Toggle value={b.show_phone !== false} onChange={(v) => setB({ ...b, show_phone: v })} />
        </View>
        <Input label="Διεύθυνση" icon="pin" placeholder="Οδός και αριθμός" value={b.address ?? ''} onChangeText={(v) => setB({ ...b, address: v })} />
        <Input label="Περιγραφή" placeholder="Τι κάνετε, τι να περιμένει ο πελάτης…" multiline value={b.description ?? ''} onChangeText={(v) => setB({ ...b, description: v })} />
      </Card>
      {!!b.id && b.owner_id === uid && <RemoveRow b={b} />}
    </View>
  );
}

/* Στο τέλος των Στοιχείων: αίτηση αφαίρεσης της επιχείρησης (app/remove-business.tsx, migration 021). Μόνο ο ιδιοκτήτης. */
function RemoveRow({ b }: { b: any }) {
  const router = useRouter();
  const pending = !!b.removal_requested_at;
  return (
    <Pressable onPress={() => router.push(`/remove-business?id=${b.id}` as any)} accessibilityRole="button"
      style={({ pressed, hovered }: any) => [s.row, { gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1,
        borderColor: alpha(C.bad, 0.25), backgroundColor: pressed || hovered ? alpha(C.bad, 0.08) : alpha(C.bad, 0.04) }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.bad, fontWeight: '800', fontSize: 15 }}>{pending ? 'Η αίτηση αφαίρεσης είναι σε εξέλιξη' : 'Αφαίρεση επιχείρησης από το SpotOn'}</Text>
        <Text style={{ color: C.mute, fontSize: 13 }}>{pending ? 'Πάτα για να δεις πότε αφαιρείται ή να την ακυρώσεις.' : 'Στείλε αίτηση· έχεις 7 μέρες να αλλάξεις γνώμη.'}</Text>
      </View>
      <Icon name="chevron" size={16} color={C.bad} />
    </Pressable>
  );
}

/* ---------- Υπηρεσίες: κάρτες σε ομάδες + παράθυρο επεξεργασίας ---------- */
function Services({ st }: { st: St }) {
  const { b, svcs, hours, staff, persist, busy, removed } = st;
  const [draft, setDraft] = useState<SvcDraft | null>(null);
  const k = svcKind(b.category);
  const groups = [...new Set(svcs.map((x) => groupOf(k, x)))];
  const open = (key: string | null, grp?: string) => setDraft(draftFor(b.category, svcs, hours, staff, key, newKey, grp));
  const save = async (d: SvcDraft) => {
    const x = d.svc;
    const S = d.fresh ? [...svcs, x] : svcs.map((y) => (y.key === x.key ? x : y));
    const isClass = k.mode === 'class' && (+x.capacity || 1) > 1;
    // Μαθήματα: το πρόγραμμα γίνεται το ωράριο της υπηρεσίας. Ατομικά: ό,τι πρόγραμμα είχε φεύγει (ακολουθεί το γενικό ωράριο).
    const H = isClass ? withSched(hours, x.key, d.sched, +x.duration_min) : k.mode === 'class' ? hours.filter((h) => h.svc !== x.key) : hours;
    if (isClass && !d.sched.some((r) => r.days.length)) return say('Βάλε τουλάχιστον μία μέρα και ώρα στο πρόγραμμα');
    if (!b.id) { st.setSvcs(S); st.setHours(H); setDraft(null); return; }
    if (await persist({ svcs: S, hours: H }, staff.length > 1 ? { key: x.key, ids: d.staff } : undefined)) setDraft(null);
  };
  const del = (d: SvcDraft) => say(`Διαγραφή «${d.svc.name}»;`, 'Οι κρατήσεις που έχουν ήδη γίνει μένουν. Νέες δεν θα μπορούν να κλείσουν.', [
    { text: 'Άκυρο', style: 'cancel' },
    { text: 'Διαγραφή', style: 'destructive', onPress: async () => {
      const S = svcs.filter((y) => y.key !== d.svc.key), H = hours.filter((h) => h.svc !== d.svc.key);
      if (!b.id || !d.svc.id) { st.setSvcs(S); st.setHours(H); setDraft(null); return; }
      if (await persist({ svcs: S, hours: H, removed: [...removed, d.svc.id] })) setDraft(null);
    } },
  ]);
  return (
    <>
      <ServiceBoard svcs={svcs} category={b.category} hours={hours} staff={staff} onOpen={(key) => open(key)} onAdd={(g) => open(null, g)} />
      <ServiceModal draft={draft} category={b.category} groups={groups} staff={staff} busy={busy}
        onClose={() => setDraft(null)} onSave={save} onDelete={del} />
    </>
  );
}

/* ---------- Ωράριο: γενικό και, αν χρειάζεται, ξεχωριστό ανά υπηρεσία ---------- */
function HoursSec({ st }: { st: St }) {
  const { hours, setHours, svcs, b } = st;
  const [edit, setEdit] = useState<string | null>(null);
  const k = svcKind(b.category);
  // Τα ομαδικά μαθήματα έχουν το δικό τους πρόγραμμα στις Υπηρεσίες· εδώ μόνο ό,τι ακολουθεί ωράριο.
  const own_ = svcs.filter((x) => x.name.trim() && !(k.mode === 'class' && (+x.capacity || 1) > 1));
  const mine = (h: Slot) => h.svc === edit;
  const own = edit === null || hours.some(mine);
  const dayRows = (d: number) => hours.map((h, i) => ({ h, i })).filter(({ h }) => mine(h) && h.weekday === d);
  const setRow = (i: number, p: Partial<Slot>) => setHours(hours.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const toggleDay = (d: number) => dayRows(d).length
    ? setHours(hours.filter((h) => !(mine(h) && h.weekday === d)))
    : setHours([...hours, { weekday: d, opens: '09:00', closes: '17:00', svc: edit }]);
  const addBreak = (d: number) => {
    const last = dayRows(d).map(({ h }) => h).sort((a, z) => a.closes.localeCompare(z.closes)).pop();
    setHours([...hours, { weekday: d, ...nextSpan(last), svc: edit }]);
  };
  const setOwn = (on: boolean) => setHours(on
    ? [...hours, ...hours.filter((h) => h.svc === null).map((h) => ({ ...h, svc: edit }))]
    : hours.filter((h) => !mine(h)));
  return (
    <View style={{ gap: 12 }}>
      {own_.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[{ key: null as string | null, name: 'Γενικό' }, ...own_].map((x) =>
            <Chip key={x.key ?? 'all'} emoji={x.key === null ? '🏪' : undefined} label={x.name} on={edit === x.key} onPress={() => setEdit(x.key)} />)}
        </ScrollView>
      )}
      {edit !== null && (
        <Group><SwitchRow label={own ? 'Δικό της ωράριο' : 'Ίδιο με το γενικό ωράριο'} sub="Αν η υπηρεσία γίνεται μόνο κάποιες ώρες" value={own} onChange={setOwn} last /></Group>
      )}
      {own && (
        <View style={{ gap: 12 }}>
          {/* Κάθε μέρα στο δικό της πλαίσιο, με κενό και σκιά από κάτω για βάθος. */}
          {WEEK.map((d) => { const rows = dayRows(d); return (
            <View key={d} style={[s.card, shadow(2), { padding: 14, gap: 10 }]}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{DAYNAME[d]}</Text>
                  <Text style={{ color: rows.length ? C.ok : C.mute, fontSize: 12, fontWeight: '600' }}>{rows.length ? (rows.length > 1 ? 'Ανοιχτά, με διάλειμμα' : 'Ανοιχτά') : 'Κλειστά'}</Text>
                </View>
                <Toggle value={rows.length > 0} onChange={() => toggleDay(d)} />
              </View>
              {rows.sort((a, z) => a.h.opens.localeCompare(z.h.opens)).map(({ h, i }) => (
                <View key={i} style={[s.row, { gap: 8, maxWidth: 420 }]}>
                  <View style={{ flex: 1 }}><TimeBtn value={h.opens} title={`${DAYNAME[d]} · ανοίγει`} onChange={(v) => setRow(i, { opens: v })} /></View>
                  <Text style={{ color: C.mute }}>–</Text>
                  <View style={{ flex: 1 }}><TimeBtn value={h.closes} title={`${DAYNAME[d]} · κλείνει`} onChange={(v) => setRow(i, { closes: v })} /></View>
                  {rows.length > 1 && <Pressable onPress={() => setHours(hours.filter((_, j) => j !== i))} hitSlop={6}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: alpha(C.bad, 0.1), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="close" size={14} color={C.bad} /></Pressable>}
                </View>
              ))}
              {rows.length > 0 && <TextBtn title="+ Διάλειμμα" onPress={() => addBreak(d)} />}
            </View>); })}
        </View>
      )}
    </View>
  );
}

/* ---------- Κανόνες ---------- */
function Rules({ st }: { st: St }) {
  const { b, setB } = st;
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 22 }}>
        <AmountPick label="Πόσο νωρίτερα κλείνουν;" sub="Μέχρι πόσες μέρες μπροστά βλέπουν ελεύθερες ώρες." units={DAY_UNITS} max={365}
          options={[15, 30]} value={+b.max_days_ahead} onPick={(v) => setB({ ...b, max_days_ahead: v })} />
        <AmountPick label="Μέχρι πότε ακυρώνουν;" sub="Πόση ώρα πριν από το ραντεβού μπορούν να το ακυρώσουν." max={60 * 1440}
          options={[60, 1440]} value={+b.cancel_before_min} onPick={(v) => setB({ ...b, cancel_before_min: v })} />
      </Card>
      <Group>
        <SwitchRow label="Έγκριση νέων πελατών" sub="Ο νέος πελάτης κλείνει μόνο αφού τον εγκρίνεις" value={!!b.requires_approval} onChange={(v) => setB({ ...b, requires_approval: v })} />
        <SwitchRow label="Πακέτα κρατήσεων (καρνέ)" sub="Κάθε κράτηση χρεώνεται από το πακέτο του πελάτη. Τα πακέτα (τιμή, επισκέψεις, μέρες) είναι στο Κατάστημα → Πακέτα." value={!!b.uses_credits} onChange={(v) => setB({ ...b, uses_credits: v })} last />
      </Group>
      {!!b.id && <OnlinePay bizId={b.id} />}
    </View>
  );
}

/* Πληρωμή πακέτων μέσα στην εφαρμογή (Viva). Ο ιδιοκτήτης γράφει τον κωδικό εμπόρου (Merchant ID) του λογαριασμού
   Viva του καταστήματος και ανοίγει τον διακόπτη. Αποθηκεύεται αμέσως (rpc owner_set_payments, migration 018). */
function OnlinePay({ bizId }: { bizId: string }) {
  const [st, setSt] = useState<{ pay_online: boolean; viva_merchant_id: string | null; commission_pct: number } | null>(null);
  const [mid, setMid] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  useEffect(() => { rpc<string>('pay_mode').then(setMode).catch(() => setMode(null)); }, []);
  useEffect(() => {
    rpc<any>('owner_payment_settings', { p_business: bizId }).then((r) => { setSt(r); setMid(r?.viva_merchant_id ?? ''); }).catch(() => setSt(null));
  }, [bizId]);
  if (!st) return null; // η migration 018 δεν έχει τρέξει ακόμα
  const save = async (on: boolean) => {
    setBusy(true);
    try {
      const r = await rpc<any>('owner_set_payments', { p_business: bizId, p_merchant: mid, p_on: on });
      if (r?.ok === false) say('Δεν αποθηκεύτηκε', r.error);
      else setSt({ ...st, pay_online: on, viva_merchant_id: mid.trim() || null });
    } catch (e: any) { say('Δεν αποθηκεύτηκε', e.message); }
    setBusy(false);
  };
  const pct = Number(st.commission_pct ?? 0).toLocaleString('el-GR');
  // Δοκιμαστική πληρωμή (019): ισχύει για όλα τα καταστήματα, χωρίς Viva και χωρίς χρέωση.
  if (mode === 'test') return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginTop: 6 }}>Πληρωμή στην εφαρμογή</Text>
      <Card><T mute>Οι πελάτες πληρώνουν τα πακέτα μέσα στην εφαρμογή και ενεργοποιούνται αμέσως. Προς το παρόν οι πληρωμές είναι δοκιμαστικές, χωρίς χρέωση.</T></Card>
    </View>
  );
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginTop: 6 }}>Πληρωμή στην εφαρμογή</Text>
      <Group>
        <SwitchRow label="Οι πελάτες πληρώνουν τα πακέτα online" value={st.pay_online} onChange={(v) => !busy && save(v)}
          sub={`Με κάρτα, Apple Pay ή Google Pay μέσω Viva. Τα χρήματα πάνε στον λογαριασμό Viva του καταστήματος· η πλατφόρμα κρατά ${pct}%. Το πακέτο ενεργοποιείται μόνο του.`} last />
      </Group>
      <Card style={{ gap: 10 }}>
        <Input label="Κωδικός εμπόρου Viva (Merchant ID)" value={mid} onChangeText={setMid} autoCapitalize="none" autoCorrect={false}
          placeholder="π.χ. 1a2b3c4d-5e6f-…" onBlur={() => mid.trim() !== (st.viva_merchant_id ?? '') && save(st.pay_online && !!mid.trim())} />
        <T mute>Τον βρίσκεις στη Viva → Ρυθμίσεις → API Access. Ο λογαριασμός πρέπει να είναι συνδεδεμένος με την εφαρμογή (ISV).</T>
      </Card>
    </View>
  );
}

/* ---------- Εμφάνιση: ίδια με το βήμα «Εμφάνιση» του οδηγού (εξώφυλλο, φωτογραφία προφίλ, χρώμα σελίδας) ---------- */
function Look({ st }: { st: St }) {
  const { b, setB, uid } = st;
  const wide = useWide();
  return (
    <View style={{ gap: 22 }}>
      <PhotosEditor uid={uid} b={b} setB={setB} wide={wide} />
      <View style={{ gap: 10 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>Χρώμα σελίδας</Text>
        <Swatches colors={PAGE_COLORS} value={styleOf(b).color} onPick={(c) => setB({ ...b, brand_color: c })} />
        <ColorSample color={styleOf(b).color} category={b.category} />
      </View>
    </View>
  );
}

const SUB: Record<SectionKey, string | undefined> = {
  details: 'Όνομα, είδος, διεύθυνση και τηλέφωνο.',
  services: undefined,
  hours: 'Για μεσημεριανό κενό πάτα «+ Διάλειμμα».',
  rules: 'Πώς και πότε κλείνουν θέση οι πελάτες.',
  look: 'Εξώφυλλο, φωτογραφία προφίλ και χρώμα σελίδας.',
};
const servicesSub = (st: St) => {
  const k = svcKind(st.b.category);
  const list = st.svcs.filter((x) => x.name.trim());
  const g = new Set(list.map((x) => groupOf(k, x))).size;
  return `${list.length} ${list.length === 1 ? k.one : k.many}${g > 1 ? ` σε ${g} ομάδες` : ''} · πάτα μία για να την αλλάξεις`;
};

/* Υπολογιστής: μία ενότητα, με τίτλο και κουμπί αποθήκευσης πάνω δεξιά. */
export function SettingsDesk({ section }: { section: SectionKey }) {
  const st = useStoreSettings();
  const k = svcKind(st.b.category);
  if (!st.ready) return <View style={s.screen} />;
  const save = async () => { if (await st.persist()) say('Αποθηκεύτηκε'); };
  const Body = { details: Details, services: Services, hours: HoursSec, rules: Rules, look: Look }[section];
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingHorizontal: 40, paddingTop: 30, paddingBottom: 60, width: '100%', maxWidth: 1180, alignSelf: 'center' }}>
      <View style={[s.row, { alignItems: 'flex-end', gap: 16, marginBottom: 22 }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 30, letterSpacing: -0.6 }}>{sectionLabel(section, st.b.category)}</Text>
          <T mute style={{ fontSize: 14 }}>{section === 'services' ? servicesSub(st) : SUB[section]}</T>
        </View>
        {section === 'services'
          ? <ServicesAdd st={st} label={k.add} />
          : <Btn title={st.busy ? 'Αποθήκευση…' : 'Αποθήκευση'} disabled={st.busy} onPress={save} />}
      </View>
      <View style={section === 'services' ? null : { maxWidth: 760 }}><Body st={st} /></View>
    </ScrollView>
  );
}
/* Το «+ Νέα υπηρεσία» πάνω δεξιά ανοίγει το ίδιο παράθυρο με τις κάρτες. */
function ServicesAdd({ st, label }: { st: St; label: string }) {
  const [on, setOn] = useState(false);
  return (
    <>
      <Btn icon="plus" title={label} onPress={() => setOn(true)} />
      {on && <AddOnly st={st} onClose={() => setOn(false)} />}
    </>
  );
}
function AddOnly({ st, onClose }: { st: St; onClose: () => void }) {
  const { b, svcs, hours, staff, persist, busy } = st;
  const k = svcKind(b.category);
  const [draft] = useState(() => draftFor(b.category, svcs, hours, staff, null, newKey));
  return (
    <ServiceModal draft={draft} category={b.category} groups={[...new Set(svcs.map((x) => groupOf(k, x)))]} staff={staff} busy={busy} onClose={onClose}
      onDelete={onClose}
      onSave={async (d) => {
        const isClass = k.mode === 'class' && (+d.svc.capacity || 1) > 1;
        if (isClass && !d.sched.some((r) => r.days.length)) return say('Βάλε τουλάχιστον μία μέρα και ώρα στο πρόγραμμα');
        const H = isClass ? withSched(hours, d.svc.key, d.sched, +d.svc.duration_min) : hours;
        if (await persist({ svcs: [...svcs, d.svc], hours: H }, staff.length > 1 ? { key: d.svc.key, ids: d.staff } : undefined)) onClose();
      }} />
  );
}

/* Κινητό: όλες οι ενότητες σε μία σελίδα, με αποθήκευση στο τέλος. */
/* Κινητό: μία ενότητα τη φορά (owner/setup?s=…), όπως στον υπολογιστή. Χωρίς ενότητα: όλες μαζί. */
export function SettingsPhone({ section }: { section?: SectionKey }) {
  const st = useStoreSettings();
  const router = useRouter();
  if (!st.ready) return <View style={s.screen} />;
  const save = async () => { if (await st.persist()) { say('Αποθηκεύτηκε'); router.back(); } };
  const Body = { details: Details, services: Services, hours: HoursSec, rules: Rules, look: Look };
  const list = section ? SECTIONS.filter((x) => x.key === section) : SECTIONS;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      {list.map(({ key }) => {
        const B = Body[key];
        return (
          <View key={key} style={{ gap: 12 }}>
            {section
              ? !!(key === 'services' ? servicesSub(st) : SUB[key]) && <T mute style={{ fontSize: 14 }}>{key === 'services' ? servicesSub(st) : SUB[key]}</T>
              : <Section title={sectionLabel(key, st.b.category)} sub={key === 'services' ? servicesSub(st) : SUB[key]} />}
            <B st={st} />
          </View>
        );
      })}
      {section !== 'services' && <Btn title={st.busy ? 'Αποθήκευση…' : 'Αποθήκευση'} disabled={st.busy} onPress={save} style={{ marginTop: 8 }} />}
    </ScrollView>
  );
}
