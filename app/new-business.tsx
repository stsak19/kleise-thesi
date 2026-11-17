import { useEffect, useRef, useState } from 'react';
import { switchMode } from '../lib/mode';
import { goHome } from '../lib/SwitchMode';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Text } from '../lib/Txt';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { say } from '../lib/alert';
import { PhotosEditor } from '../lib/owner/Photos';
import { DeskPreview, PreviewPill, PreviewSheet } from '../lib/owner/LivePreview';
import { WIDE } from '../lib/wide';
import { PagePreview, upper } from '../lib/owner/PagePreview';
import { screenFor } from '../lib/bizscreen';
import { THEMES, styleOf } from '../lib/presets';
import { Btn, C, DAYS, TextBtn, Icon, Input, alpha, catEmoji, catLabel, price, s, shadow } from '../lib/ui';
import { EMPTY_BIZ, Hours, Svc, WEEK, newKey, badHours, loadBusiness, presetData, saveBusiness } from '../lib/owner/save';
import { AmountPick, DAY_UNITS, amountLabel } from '../lib/TimePick';
import { HoursEditor, Swatches, ToggleCard, TypeGrid } from '../lib/owner/steps';
import { ServiceBoard, ServiceFields, schedOf, withSched } from '../lib/owner/services';
import { blankFor, groupOf, svcKind } from '../lib/owner/svcKind';

/* Οδηγός «Νέα επιχείρηση»: ο ιδιοκτήτης φτιάχνει τη σελίδα του μία επιλογή τη φορά.
   Είδος → όνομα → πού είστε → φωτογραφίες & χρώμα → υπηρεσίες → ωράριο → κανόνες → τελικός έλεγχος.
   Με το είδος μπαίνουν έτοιμες προτάσεις (lib/presets.ts), ώστε τα επόμενα βήματα να είναι κυρίως «Συνέχεια». */

type Step = 'type' | 'name' | 'place' | 'look' | 'services' | 'hours' | 'rules' | 'review';
const STEPS: Step[] = ['type', 'name', 'place', 'look', 'services', 'hours', 'rules', 'review'];

const NAME_HINT: Record<string, string> = {
  gym: 'FitZone Gym', personal_training: 'Coach Νίκος', pilates_yoga: 'Studio Ισορροπία', nails: 'Nails by Νίκη',
  hair: 'Κομμωτήριο Ελένη', barber: 'Barber Κώστας', beauty: 'Αισθητική Μαρίνα', massage_spa: 'Ήρεμο Spa',
  physio: 'Φυσικοθεραπεία Κίνηση', medical: 'Ιατρείο Δρ. Παππά', dental: 'Οδοντιατρείο Χαμόγελο', tattoo: 'Black Ink Tattoo', other: 'Το κατάστημά μου',
};
/* Τα ονόματα των βημάτων κάτω από τη γραμμή προόδου (υπολογιστής). */
const RAIL: Record<Step, (svc: string) => string> = {
  type: () => 'Είδος', name: () => 'Όνομα', place: () => 'Πού', look: () => 'Εικόνα',
  services: (x) => x, hours: () => 'Ωράριο', rules: () => 'Κανόνες', review: () => 'Έλεγχος',
};
const COLORS = Array.from(new Set(THEMES.map((t) => t.color)));
const hrs = (m: number) => amountLabel(m);

export default function NewBusiness() {
  const router = useRouter();
  const { session } = useAuth();
  const uid = session!.user.id;
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const side = width >= 1180; // χωράει και η προεπισκόπηση δεξιά

  const [i, setI] = useState(0);
  const [far, setFar] = useState(0); // το πιο μακρινό βήμα που έφτασε (στον υπολογιστή πατιούνται τα βήματα ως εκεί)
  const [b, setB] = useState<any>({ ...EMPTY_BIZ, category: null, is_published: true });
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [hours, setHours] = useState<Hours>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null); // id καταστήματος όταν αποθηκευτεί
  const [peek, setPeek] = useState(false); // κινητό: όλη η σελίδα σε φύλλο
  const [kb, setKb] = useState(false); // ανοιχτό πληκτρολόγιο: κρύβεται το κουμπί προεπισκόπησης
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKb(true));
    const z = Keyboard.addListener('keyboardDidHide', () => setKb(false));
    return () => { a.remove(); z.remove(); };
  }, []);
  const [svcEdit, setSvcEdit] = useState<{ key: string; fresh: boolean; before?: Svc } | null>(null); // μία υπηρεσία ανοιχτή

  // Αν ο χρήστης έχει ήδη κατάστημα, ο οδηγός ξεκινά με τα στοιχεία του (και δεν φτιάχνει δεύτερο).
  useEffect(() => { loadBusiness(uid).then((r) => {
    if (!r) return;
    setB(r.b); setSvcs(r.svcs); setHours(r.hours); setFar(STEPS.length - 1); // υπάρχον κατάστημα: όλα συμπληρωμένα
  }); }, [uid]);

  // Ήπια μετάβαση ανάμεσα στα βήματα
  const anim = useRef(new Animated.Value(1)).current;
  const dir = useRef(1);
  const scroll = useRef<any>(null);
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [i, done, svcEdit?.key]);

  const step = STEPS[i];
  const cat: string = b.category ?? 'other';
  const scr = screenFor(cat);
  const look = styleOf(b);
  const named = svcs.filter((x) => x.name.trim());
  const go = (n: number) => { dir.current = n > i ? 1 : -1; setI(n); setFar((f) => Math.max(f, n)); };
  const back = () => {
    if (svcEdit) return closeSvc(true);
    return i === 0 ? router.back() : go(i - 1);
  };

  /* Υπηρεσίες: κάθε μία ανοίγει μόνη της. */
  const editing = svcEdit ? svcs.find((x) => x.key === svcEdit.key) : undefined;
  const openSvc = (key: string) => { dir.current = 1; setSvcEdit({ key, fresh: false, before: svcs.find((x) => x.key === key) }); };
  const addSvc = (grp?: string) => {
    const k = svcKind(cat);
    const n: Svc = blankFor(k, newKey(), grp);
    if (k.mode === 'class' && grp && grp !== k.groups[0]) n.capacity = '1';
    setSvcs([...svcs, n]); dir.current = 1; setSvcEdit({ key: n.key, fresh: true });
    if (k.mode === 'class' && n.capacity !== '1') setHours((h) => withSched(h, n.key, [{ time: '19:00', days: [1, 3, 5] }], +n.duration_min));
  };
  const patchSvc = (p: Partial<Svc>) => {
    if (!svcEdit) return;
    setSvcs((list) => list.map((x) => (x.key === svcEdit.key ? { ...x, ...p } : x)));
    // Μάθημα: αν αλλάξει η διάρκεια, το πρόγραμμά του κρατά τις ίδιες ώρες έναρξης.
    if (p.duration_min) setHours((h) => (h.some((y) => y.svc === svcEdit.key) ? withSched(h, svcEdit.key, schedOf(h, svcEdit.key), +p.duration_min!) : h));
  };
  const dropSvc = (key: string) => {
    const x = svcs.find((y) => y.key === key);
    if (x?.id) setRemoved((r) => [...r, x.id!]);
    setSvcs((list) => list.filter((y) => y.key !== key));
    setHours((h) => h.filter((y) => y.svc !== key));
  };
  /* cancel = «πίσω»: μια νέα υπηρεσία φεύγει, μια παλιά γυρίζει όπως ήταν. */
  const closeSvc = (cancel: boolean) => {
    if (!svcEdit) return;
    if (cancel && svcEdit.fresh) dropSvc(svcEdit.key);
    else if (cancel && svcEdit.before) setSvcs((list) => list.map((x) => (x.key === svcEdit.key ? svcEdit.before! : x)));
    else if (!cancel && editing && !editing.name.trim()) dropSvc(svcEdit.key);
    dir.current = -1; setSvcEdit(null);
  };

  /* Η προεπισκόπηση δείχνει μόνο ό,τι έχει ήδη συμπληρώσει: τα επόμενα βήματα (π.χ. οι έτοιμες υπηρεσίες του είδους) μένουν κρυφά ως να τα φτάσει. */
  const seen = (k: Step) => far > STEPS.indexOf(k) || i === STEPS.indexOf(k) || far === STEPS.length - 1;
  const pv = {
    biz: { ...b, ...(!seen('place') && { city: '', address: '', phone: '' }), ...(!seen('look') && { cover_url: null, logo_url: null }) },
    svcs: seen('services') ? svcs : [],
    hours: seen('hours') ? hours : [],
    rules: seen('rules'),
  };

  const pickType = (k: string) => {
    if (k === b.category) return;
    const p = presetData(k);
    setB((x: any) => ({ ...x, category: k, layout: null, theme: null, brand_color: null, ...p.rules }));
    setRemoved((r) => [...r, ...svcs.filter((x) => x.id).map((x) => x.id!)]);
    setSvcs(p.svcs); setHours(p.hours);
  };

  /* Τι λείπει για να πας στο επόμενο βήμα (κενό = όλα καλά). */
  const missing = (): string => {
    if (svcEdit) return editing?.name.trim() ? '' : 'Γράψε όνομα υπηρεσίας';
    if (step === 'type' && !b.category) return 'Διάλεξε ένα είδος';
    if (step === 'name' && !b.name.trim()) return 'Γράψε το όνομα';
    if (step === 'place' && !b.city.trim()) return 'Γράψε την πόλη';
    if (step === 'services' && !named.length) return 'Πρόσθεσε τουλάχιστον μία';
    return '';
  };
  const next = async () => {
    if (svcEdit) return closeSvc(false);
    if (step === 'hours') { const bad = badHours(hours); if (bad) return say('Λάθος ωράριο', bad); }
    if (step !== 'review') return go(i + 1);
    setBusy(true);
    const r = await saveBusiness(uid, b, svcs, hours, removed);
    setBusy(false);
    if (!r.ok) return say('Δεν αποθηκεύτηκε', r.error);
    r.warnings.forEach((w) => say('Προσοχή', w));
    setDone(r.id);
  };

  const fade = {
    opacity: anim,
    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [dir.current * 28, 0] }) }],
  };

  /* ---------- τέλος ---------- */
  if (done) return (
    <View style={[s.screen, { paddingTop: top + 18, paddingBottom: bottom + 24, paddingHorizontal: 20 }, wide && { width: '100%', maxWidth: 560, alignSelf: 'center', paddingVertical: 48 }]}>
      <Animated.View style={[{ flex: 1, justifyContent: 'center', gap: 22 }, fade]}>
        <View style={{ alignSelf: 'center', width: 88, height: 88, borderRadius: 44, backgroundColor: alpha(C.ok, 0.12), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={40} color={C.ok} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={[s.title, { textAlign: 'center' }]}>Η σελίδα σου{'\n'}είναι έτοιμη! 🎉</Text>
          <Text style={{ color: C.mute, fontSize: 16, lineHeight: 23, textAlign: 'center' }}>
            {b.is_published ? 'Οι πελάτες σου μπορούν ήδη να βρουν το κατάστημα και να κλείσουν θέση.'
              : 'Όταν είσαι έτοιμος, άνοιξε τη «Δημοσίευση» από τις Ρυθμίσεις για να φαίνεσαι στην αναζήτηση.'}
          </Text>
        </View>
        <PagePreview biz={b} />
      </Animated.View>
      <View style={{ gap: 10 }}>
        <Btn title="Δες τη σελίδα σου" onPress={() => router.replace(`/store/${done}`)} />
        <Btn kind="ghost" title="Πήγαινε στο πρόγραμμά μου" onPress={() => switchMode('biz', () => goHome(router, 'biz'))} />
      </View>
    </View>
  );

  /* ---------- βήματα ---------- */
  const head: Record<Step, { title: string; sub: string }> = {
    type: { title: 'Τι επιχείρηση έχεις;', sub: 'Με βάση αυτό σου ετοιμάζουμε υπηρεσίες, ωράριο και εμφάνιση. Όλα αλλάζουν μετά.' },
    name: { title: 'Πώς λέγεται;', sub: 'Έτσι θα σε βρίσκουν οι πελάτες στην αναζήτηση.' },
    place: { title: 'Πού σε βρίσκουμε;', sub: 'Η πόλη χρειάζεται για την αναζήτηση. Τα υπόλοιπα βοηθούν τον πελάτη να έρθει.' },
    look: { title: 'Δώσε της πρόσωπο', sub: 'Ανέβασε εξώφυλλο και φωτογραφία προφίλ. Μπορείς να τα βάλεις και αργότερα.' },
    services: { title: `${scr.services}`, sub: `${svcKind(cat).badge}. Σου βάλαμε μερικές για αρχή. Πάτα μία για να την αλλάξεις ή να τη σβήσεις, ή πρόσθεσε καινούργια.` },
    hours: { title: 'Πότε είσαι ανοιχτά;', sub: 'Άνοιξε ή κλείσε κάθε μέρα. Για μεσημεριανό κενό πάτα «+ Διάλειμμα».' },
    rules: { title: 'Πώς κλείνουν θέση;', sub: 'Λίγοι κανόνες για τις κρατήσεις σου. Οι προτάσεις ταιριάζουν στο είδος σου.' },
    review: { title: 'Όλα έτοιμα;', sub: 'Ρίξε μια ματιά. Πάτα σε ό,τι θέλεις να αλλάξεις.' },
  };
  const optional = step === 'look' && !svcEdit;
  const title = editing ? (svcEdit!.fresh ? svcKind(cat).add : editing.name.trim() || svcKind(cat).one) : head[step].title;
  const sub = editing ? `${svcKind(cat).badge}. Όνομα, διάρκεια, τιμή${svcKind(cat).mode === 'class' ? ', θέσεις και πρόγραμμα' : ''}.` : head[step].sub;
  const why = missing();

  const body = () => {
    switch (step) {
      case 'type': return <TypeGrid value={b.category} onPick={pickType} />;
      case 'name': return (
        <View style={{ gap: 16 }}>
          <Input autoFocus icon="store" placeholder={`π.χ. ${NAME_HINT[cat] ?? NAME_HINT.other}`} value={b.name}
            onChangeText={(v) => setB({ ...b, name: v })} onSubmitEditing={() => !missing() && next()} returnKeyType="next" style={{ fontSize: 18 }} />
          <Input label="Λίγα λόγια (προαιρετικό)" placeholder="Τι κάνετε, τι να περιμένει ο πελάτης…" multiline
            value={b.description ?? ''} onChangeText={(v) => setB({ ...b, description: v })} />
        </View>
      );
      case 'place': return (
        <View style={{ gap: 14 }}>
          <Input label="Πόλη" icon="pin" placeholder="π.χ. Θεσσαλονίκη" value={b.city} onChangeText={(v) => setB({ ...b, city: v })} />
          <Input label="Διεύθυνση" placeholder="Οδός και αριθμός" value={b.address ?? ''} onChangeText={(v) => setB({ ...b, address: v })} />
          <Input label="Τηλέφωνο" icon="phone" placeholder="210…" keyboardType="phone-pad" value={b.phone ?? ''} onChangeText={(v) => setB({ ...b, phone: v })} />
          <ToggleCard title="Να φαίνεται το τηλέφωνο" sub="Οι πελάτες το βλέπουν στη σελίδα σου και μπορούν να σε καλέσουν. Αλλιώς το βλέπεις μόνο εσύ."
            value={b.show_phone !== false} onChange={(v) => setB({ ...b, show_phone: v })} />
        </View>
      );
      case 'look': return (
        <View style={{ gap: 22 }}>
          {!side && <PagePreview biz={b} />}
          <PhotosEditor uid={uid} b={b} setB={setB} wide={wide} />
          <View style={{ gap: 10 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>Χρώμα σελίδας</Text>
            <Swatches colors={COLORS} value={look.color} onPick={(c) => setB({ ...b, brand_color: c })} />
          </View>
        </View>
      );
      case 'services': return editing
        ? <View style={{ gap: 22 }}>
            <ServiceFields svc={editing} onChange={patchSvc} category={cat} groups={[...new Set(svcs.map((x) => groupOf(svcKind(cat), x)))]}
              sched={schedOf(hours, editing.key)} onSched={(x) => setHours(withSched(hours, editing.key, x, +editing.duration_min))} />
            {!svcEdit?.fresh && <TextBtn title="Διαγραφή" color={C.bad} onPress={() => { dropSvc(editing.key); dir.current = -1; setSvcEdit(null); }} />}
          </View>
        : <ServiceBoard svcs={svcs} category={cat} hours={hours} onOpen={openSvc} onAdd={addSvc} />;
      case 'hours': return <HoursEditor hours={hours} setHours={setHours} />;
      case 'rules': return (
        <View style={{ gap: 22 }}>
          <AmountPick label="Πόσο νωρίτερα κλείνουν;" sub="Μέχρι πόσες μέρες μπροστά βλέπουν ελεύθερες ώρες." units={DAY_UNITS} max={365}
            options={[7, 14, 30, 60]} value={+b.max_days_ahead} onPick={(v) => setB({ ...b, max_days_ahead: v })} />
          <AmountPick label="Μέχρι πότε ακυρώνουν;" sub="Πόση ώρα πριν από το ραντεβού μπορούν να το ακυρώσουν." max={60 * 1440}
            options={[60, 120, 240, 720, 1440, 2880]} value={+b.cancel_before_min} onPick={(v) => setB({ ...b, cancel_before_min: v })} />
          <View style={{ gap: 10 }}>
            <ToggleCard title="Έγκριση νέων πελατών" sub="Ο νέος πελάτης κλείνει μόνο αφού τον εγκρίνεις." value={!!b.requires_approval} onChange={(v) => setB({ ...b, requires_approval: v })} />
            <ToggleCard title="Πακέτα κρατήσεων (καρνέ)" sub="Κάθε κράτηση χρεώνεται από το πακέτο του πελάτη." value={!!b.uses_credits} onChange={(v) => setB({ ...b, uses_credits: v })} />
          </View>
        </View>
      );
      case 'review': {
        const openDays = WEEK.filter((d) => hours.some((h) => h.svc === null && h.weekday === d));
        const rows: { label: string; value: string; to: Step }[] = [
          { label: 'Είδος', value: `${catEmoji(cat)} ${catLabel(cat)}`, to: 'type' },
          { label: 'Πού', value: [b.address, b.city].filter(Boolean).join(', ') || '—', to: 'place' },
          { label: 'Τηλέφωνο', value: b.phone?.trim() ? `${b.phone.trim()} · ${b.show_phone !== false ? 'φαίνεται στους πελάτες' : 'κρυφό'}` : 'Δεν έχεις βάλει', to: 'place' },
          { label: scr.services, value: named.map((x) => `${x.name.trim()}${x.price ? ` ${price(Math.round(parseFloat(x.price.replace(',', '.')) * 100))}` : ''}`).join(' · '), to: 'services' },
          { label: 'Ανοιχτά', value: openDays.length ? openDays.map((d) => DAYS[d]).join(' ') : 'Καμία μέρα', to: 'hours' },
          { label: 'Κρατήσεις', value: `έως ${b.max_days_ahead} μέρες μπροστά · ακύρωση ${hrs(+b.cancel_before_min)} πριν`, to: 'rules' },
        ];
        return (
          <View style={{ gap: 14 }}>
            {!side && (
              <Pressable onPress={() => go(STEPS.indexOf('look'))}>
                <PagePreview biz={b} />
              </Pressable>
            )}
            <View style={[s.card, shadow(1), { padding: 0, gap: 0, overflow: 'hidden' }]}>
              {rows.map((r, k) => (
                <Pressable key={r.label} onPress={() => go(STEPS.indexOf(r.to))}
                  style={({ pressed }) => [s.row, { gap: 12, padding: 14, backgroundColor: pressed ? alpha(C.tint, 0.06) : 'transparent' },
                    k < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.bg }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700' }}>{r.label}</Text>
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }} numberOfLines={2}>{r.value}</Text>
                  </View>
                  <Icon name="chevron" size={14} color={C.mute} />
                </Pressable>
              ))}
            </View>
            <ToggleCard title="Δημοσίευση στην αναζήτηση" sub="Οι πελάτες βρίσκουν το κατάστημα και κλείνουν θέση από σήμερα."
              value={!!b.is_published} onChange={(v) => setB({ ...b, is_published: v })} />
          </View>
        );
      }
    }
  };

  // Μαύρο όταν μπορείς να προχωρήσεις, γκρι όσο λείπει κάτι από τη φόρμα.
  const ready = !why && !busy;
  const mainTitle = busy ? 'Μια στιγμή…' : svcEdit ? why || (svcEdit.fresh ? 'Προσθήκη' : 'Έτοιμο') : step === 'review' ? 'Δημιουργία σελίδας' : why || 'Συνέχεια';
  const heading = (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.tint, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 }}>
        ΒΗΜΑ {i + 1} ΑΠΟ {STEPS.length}{i > 0 && b.category && !wide ? `  ·  ${catEmoji(cat)} ${upper(scr.kicker)}` : ''}
      </Text>
      <Text style={[s.title, { fontSize: 30 }]}>{title}</Text>
      <Text style={{ color: C.mute, fontSize: wide ? 15.5 : 16, lineHeight: 23 }}>{sub}</Text>
    </View>
  );
  const skip = optional && !b.cover_url && !b.logo_url && (
    <Pressable onPress={() => go(i + 1)} hitSlop={8} style={({ pressed }) => ({ alignSelf: 'center', opacity: pressed ? 0.6 : 1, paddingHorizontal: wide ? 14 : 0 })}>
      <Text style={{ color: C.mute, fontWeight: '700', fontSize: 15 }}>Θα τις βάλω αργότερα</Text>
    </Pressable>
  );

  /* ---------- υπολογιστής: η φόρμα αριστερά, η σελίδα σου σε μεγάλη προεπισκόπηση δεξιά ---------- */
  if (wide) {
    const formW = side ? Math.min(760, Math.max(560, Math.round(width * 0.48))) : undefined;
    return (
      <View style={[s.screen, { flex: 1, flexDirection: 'row' }]}>
        <View style={[{ minWidth: 0 }, formW ? { width: formW } : { flex: 1, maxWidth: 760, width: '100%', alignSelf: 'center' as const }]}>
          {/* Πάνω: λογότυπο, κλείσιμο και πρόοδος (πατάς ένα βήμα που έχεις ήδη περάσει για να γυρίσεις εκεί) */}
          <View style={{ paddingHorizontal: 56, paddingTop: 18, gap: 18 }}>
            <View style={[s.row, { gap: 10 }]}>
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.bg, fontWeight: '800', fontSize: 15 }}>S</Text>
              </View>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 20, letterSpacing: -0.5, flex: 1 }}>SpotOn</Text>
              <Pressable onPress={() => router.back()} accessibilityLabel="Κλείσιμο" hitSlop={6}
                style={({ pressed, hovered }: any) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: hovered ? C.accent : C.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
                <Icon name="close" size={14} color={C.text} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {STEPS.map((k, n) => {
                const can = n <= far && n !== i && !svcEdit && !busy;
                return (
                  <Pressable key={k} disabled={!can} onPress={() => go(n)} accessibilityLabel={`Βήμα ${n + 1}: ${RAIL[k](scr.services)}`}
                    style={{ flex: 1, paddingVertical: 6, gap: 6 }}>
                    {({ hovered }: any) => (
                      <>
                        <View style={{ height: 5, borderRadius: 3, backgroundColor: n <= i ? C.text : hovered && can ? alpha(C.text, 0.25) : alpha(C.text, 0.1) }} />
                        <Text style={{ color: n === i ? C.text : n <= far ? C.mute : alpha(C.mute, 0.6), fontSize: 11, fontWeight: n === i ? '800' : '600' }} numberOfLines={1}>
                          {RAIL[k](scr.services)}</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 56, paddingTop: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Animated.View style={[{ gap: 24 }, fade]}>
              {heading}
              {body()}
            </Animated.View>
          </ScrollView>

          <View style={[s.row, { height: 84, gap: 10, paddingHorizontal: 56, borderTopWidth: 1, borderTopColor: C.line }]}>
            {(i > 0 || svcEdit) ? (
              <Pressable onPress={back} hitSlop={6} style={({ pressed, hovered }: any) => [s.row, { gap: 6, paddingVertical: 12, paddingHorizontal: 16, marginLeft: -16, borderRadius: 24,
                backgroundColor: hovered ? C.soft : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
                <Icon name="back" size={16} color={C.mute} />
                <Text style={{ color: C.mute, fontWeight: '700', fontSize: 15 }}>{svcEdit ? 'Ακύρωση' : 'Πίσω'}</Text>
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }} />
            {skip}
            <Btn title={mainTitle} onPress={next} disabled={!!why || busy} color={ready ? C.text : undefined} style={{ minWidth: 200, paddingHorizontal: 30 }} />
          </View>
        </View>

        {/* Η σελίδα σου, όπως τη βλέπουν οι πελάτες στον υπολογιστή */}
        {side && (
          <View style={{ flex: 1, minWidth: 0, backgroundColor: C.soft }}>
            <ScrollView contentContainerStyle={{ padding: 44, paddingTop: 40, flexGrow: 1 }}>
              <DeskPreview biz={pv.biz} svcs={pv.svcs} hours={pv.hours} rules={pv.rules} />
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  const pill = i > 0 && !svcEdit && !kb;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
      {/* Πάνω: πίσω + πρόοδος */}
      <View style={{ paddingTop: top + 12, paddingHorizontal: 20, gap: 14 }}>
        <View style={[s.row, { gap: 14 }]}>
          <Pressable onPress={back} accessibilityLabel={i === 0 && !svcEdit ? 'Κλείσιμο' : 'Πίσω'} hitSlop={6}
            style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}>
            <Icon name={i === 0 && !svcEdit ? 'close' : 'back'} size={i === 0 && !svcEdit ? 16 : 20} color={C.text} />
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
            {STEPS.map((_, k) => (
              <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: k <= i ? C.accent : alpha(C.text, 0.08) }} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: pill ? 84 : 24 }} keyboardShouldPersistTaps="handled">
        <Animated.View style={[{ gap: 22 }, fade]}>
          {heading}
          {body()}
        </Animated.View>
      </ScrollView>

      {/* Κάτω: συνέχεια */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottom + 16, gap: 10, backgroundColor: C.bg,
        borderTopWidth: 1, borderTopColor: alpha(C.text, 0.06) }}>
        {/* Προεπισκόπηση: από το 2ο βήμα και μετά, όχι όσο είναι ανοιχτή μια υπηρεσία ή το πληκτρολόγιο */}
        {pill && <PreviewPill onPress={() => { Keyboard.dismiss(); setPeek(true); }} />}
        <Btn title={mainTitle} onPress={next} disabled={!!why || busy} color={ready ? C.text : undefined} />
        {skip}
      </View>

      {peek && <PreviewSheet biz={pv.biz} svcs={pv.svcs} hours={pv.hours} rules={pv.rules} onClose={() => setPeek(false)} />}
    </KeyboardAvoidingView>
  );
}
