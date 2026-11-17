import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../Txt';
import { say } from '../alert';
import { pickAndUpload } from '../upload';
import { sb } from '../supabase';
import { useAuth } from '../auth';
import { LAYOUTS, styleOf } from '../presets';
import { DAYNAME, EMPTY_BIZ, HEX, Hours, Slot, Svc, WEEK, badHours, loadBusiness, newKey, presetData, saveBusiness } from './save';
import { Btn, C, CATEGORIES, catLabel, Card, Chip, Group, Icon, Input, Section, SwitchRow, T, TextBtn, Toggle, alpha, catEmoji, s, shadow } from '../ui';
import { AmountPick, DAY_UNITS, TimeBtn } from '../TimePick';
import { ServiceBoard, ServiceModal, draftFor, withSched, type Person, type SvcDraft } from './services';
import { groupOf, svcKind } from './svcKind';
import { useActiveBizId } from './active';

/* «Ρυθμίσεις καταστήματος»: Στοιχεία · Υπηρεσίες · Ωράριο · Κανόνες · Εμφάνιση.
   Υπολογιστής: μία ενότητα τη φορά, με το πλαϊνό μενού να δείχνει ποια (app/(biz)/(hub)/shop-settings.tsx).
   Κινητό: όλες μαζί σε μία σελίδα (app/(biz)/owner/setup.tsx). Η λογική των υπηρεσιών αλλάζει ανά είδος (lib/owner/svcKind.ts). */

export type SectionKey = 'details' | 'services' | 'hours' | 'rules' | 'look';
export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'details', label: 'Στοιχεία' }, { key: 'services', label: 'Υπηρεσίες' }, { key: 'hours', label: 'Ωράριο' },
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
  const [up, setUp] = useState<string | null>(null);
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
  const photo = async (kind: 'logo' | 'cover') => {
    setUp(kind);
    try { const url = await pickAndUpload(uid, kind); if (url) setB({ ...b, [kind === 'logo' ? 'logo_url' : 'cover_url']: url }); }
    catch (e: any) { say('Δεν ανέβηκε η φωτογραφία', e.message); }
    setUp(null);
  };
  const brand = styleOf(b).color;
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 14 }}>
        <Input label="Όνομα" placeholder="π.χ. Κομμωτήριο Ελένη" value={b.name} onChangeText={(v) => setB({ ...b, name: v })} />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Τι επιχείρηση είναι</Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {CATEGORIES.map((c) => <Chip key={c.key} emoji={c.emoji} label={c.label} on={b.category === c.key} onPress={() => pickCategory(c.key)} />)}
          </View>
          <T mute style={{ fontSize: 13 }}>Από το είδος εξαρτάται πώς στήνονται οι {svcKind(b.category).many}: {svcKind(b.category).badge.toLowerCase()}.</T>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><Input label="Πόλη" placeholder="Αθήνα" value={b.city} onChangeText={(v) => setB({ ...b, city: v })} /></View>
          <View style={{ flex: 1 }}><Input label="Τηλέφωνο" placeholder="210…" keyboardType="phone-pad" value={b.phone ?? ''} onChangeText={(v) => setB({ ...b, phone: v })} /></View>
        </View>
        <Input label="Διεύθυνση" icon="pin" placeholder="Οδός και αριθμός" value={b.address ?? ''} onChangeText={(v) => setB({ ...b, address: v })} />
        <Input label="Περιγραφή" placeholder="Τι κάνετε, τι να περιμένει ο πελάτης…" multiline value={b.description ?? ''} onChangeText={(v) => setB({ ...b, description: v })} />
      </Card>
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <Pressable onPress={() => photo('cover')} style={{ height: 150, backgroundColor: C.banner, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {!!b.cover_url && <Image source={{ uri: b.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />}
          <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{up === 'cover' ? 'Ανέβασμα…' : b.cover_url ? '📷 Αλλαγή εξωφύλλου' : '📷 Εξώφυλλο 16:9'}</Text>
          </View>
        </Pressable>
        <View style={[s.row, { padding: 16, paddingTop: 0, gap: 14, alignItems: 'flex-end' }]}>
          <Pressable onPress={() => photo('logo')} style={{ marginTop: -36, width: 80, height: 80, borderRadius: 24, backgroundColor: C.card, padding: 4, ...shadow(2) }}>
            <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: alpha(brand, 0.14), alignItems: 'center', justifyContent: 'center' }}>
              {b.logo_url ? <Image source={{ uri: b.logo_url }} style={{ width: '100%', height: '100%' }} />
                : <Text style={{ color: brand, fontWeight: '900', fontSize: 28 }}>{(b.name || '🏪').slice(0, 1)}</Text>}
            </View>
          </Pressable>
          <View style={{ flex: 1, paddingTop: 12, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 18 }} numberOfLines={1}>{b.name || 'Το κατάστημά σου'}</Text>
            <TextBtn title={up === 'logo' ? 'Ανέβασμα…' : b.logo_url ? 'Αλλαγή λογότυπου' : 'Προσθήκη λογότυπου (1:1)'} color={brand} onPress={() => photo('logo')} />
          </View>
        </View>
      </Card>
    </View>
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
    const hh = Math.min(22, parseInt(last ? last.closes : '09:00', 10) + 1);
    setHours([...hours, { weekday: d, opens: `${String(hh).padStart(2, '0')}:00`, closes: `${String(Math.min(23, hh + 4)).padStart(2, '0')}:00`, svc: edit }]);
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
        <Group>
          {WEEK.map((d, di) => { const rows = dayRows(d); return (
            <View key={d} style={[{ padding: 14, gap: 10 }, di < WEEK.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.line }]}>
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
        </Group>
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
          options={[7, 14, 30, 60]} value={+b.max_days_ahead} onPick={(v) => setB({ ...b, max_days_ahead: v })} />
        <AmountPick label="Μέχρι πότε ακυρώνουν;" sub="Πόση ώρα πριν από το ραντεβού μπορούν να το ακυρώσουν." max={60 * 1440}
          options={[60, 120, 240, 1440]} value={+b.cancel_before_min} onPick={(v) => setB({ ...b, cancel_before_min: v })} />
        {b.uses_credits && <AmountPick label="Διάρκεια πακέτου" sub="Πόσες μέρες ισχύει ένα πακέτο από την ενεργοποίηση." units={DAY_UNITS} max={730}
          options={[30, 60, 90]} value={+b.package_days} onPick={(v) => setB({ ...b, package_days: v })} />}
      </Card>
      <Group>
        <SwitchRow label="Έγκριση νέων πελατών" sub="Ο νέος πελάτης κλείνει μόνο αφού τον εγκρίνεις" value={!!b.requires_approval} onChange={(v) => setB({ ...b, requires_approval: v })} />
        <SwitchRow label="Πακέτα κρατήσεων (καρνέ)" sub="Κάθε κράτηση χρεώνεται από το πακέτο του πελάτη" value={!!b.uses_credits} onChange={(v) => setB({ ...b, uses_credits: v })} />
        <SwitchRow label="Δημοσίευση στην αναζήτηση" sub="Οι πελάτες βρίσκουν το κατάστημα και κλείνουν θέση" value={!!b.is_published} onChange={(v) => setB({ ...b, is_published: v })} last />
      </Group>
    </View>
  );
}

/* ---------- Εμφάνιση ---------- */
function Look({ st }: { st: St }) {
  const router = useRouter();
  const { b } = st;
  const look = styleOf(b);
  return (
    <Card style={{ gap: 10 }}>
      <View style={[s.row, { gap: 12 }]}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: look.color }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{LAYOUTS.find((l) => l.key === look.layout)?.name} · {look.theme.name}</Text>
          <T mute style={{ fontSize: 13 }}>Χρώμα, θέμα και διάταξη της σελίδας σου.</T>
        </View>
      </View>
      {b.id ? <Btn kind="ghost" size="sm" title="Άλλαξε την εμφάνιση" onPress={() => router.push('/owner/style')} />
        : <T mute style={{ fontSize: 12 }}>Θα μπορείς να την αλλάξεις μετά την πρώτη αποθήκευση.</T>}
    </Card>
  );
}

const SUB: Record<SectionKey, string | undefined> = {
  details: 'Όνομα, είδος, διεύθυνση και φωτογραφίες.',
  services: undefined,
  hours: 'Για μεσημεριανό κενό πάτα «+ Διάλειμμα».',
  rules: 'Πώς και πότε κλείνουν θέση οι πελάτες.',
  look: undefined,
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
          : section !== 'look' && <Btn title={st.busy ? 'Αποθήκευση…' : 'Αποθήκευση'} disabled={st.busy} onPress={save} />}
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
export function SettingsPhone() {
  const st = useStoreSettings();
  const router = useRouter();
  if (!st.ready) return <View style={s.screen} />;
  const k = svcKind(st.b.category);
  const save = async () => { if (await st.persist()) { say('Αποθηκεύτηκε'); router.back(); } };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Section title="Στοιχεία" />
      <Details st={st} />
      <Section title={k.title} sub={servicesSub(st)} />
      <Services st={st} />
      <Section title="Ωράριο" sub={SUB.hours} />
      <HoursSec st={st} />
      <Section title="Κανόνες κρατήσεων" />
      <Rules st={st} />
      <Section title="Εμφάνιση" />
      <Look st={st} />
      <Btn title={st.busy ? 'Αποθήκευση…' : 'Αποθήκευση'} disabled={st.busy} onPress={save} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}
