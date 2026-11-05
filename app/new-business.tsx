import { useEffect, useRef, useState } from 'react';
import { switchMode } from '../lib/mode';
import { goHome } from '../lib/SwitchMode';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../lib/Txt';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { say } from '../lib/alert';
import { pickAndUpload } from '../lib/upload';
import { PagePreview, upper } from '../lib/owner/PagePreview';
import { screenFor } from '../lib/bizscreen';
import { THEMES, styleOf } from '../lib/presets';
import { Btn, C, DAYS, Icon, Input, alpha, catEmoji, catLabel, price, s, shadow } from '../lib/ui';
import { EMPTY_BIZ, Hours, Svc, WEEK, newKey, badHours, loadBusiness, presetData, saveBusiness } from '../lib/owner/save';
import { Choice, HoursEditor, ServiceForm, ServiceList, Swatches, ToggleCard, TypeGrid } from '../lib/owner/steps';

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
const COLORS = Array.from(new Set(THEMES.map((t) => t.color)));
const hrs = (m: number) => (m < 60 ? `${m} λεπτά` : m % 1440 === 0 ? `${m / 1440} ${m === 1440 ? 'μέρα' : 'μέρες'}` : `${m / 60} ${m === 60 ? 'ώρα' : 'ώρες'}`);

export default function NewBusiness() {
  const router = useRouter();
  const { session } = useAuth();
  const uid = session!.user.id;
  const { top, bottom } = useSafeAreaInsets();

  const [i, setI] = useState(0);
  const [b, setB] = useState<any>({ ...EMPTY_BIZ, category: null, is_published: true });
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [hours, setHours] = useState<Hours>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [up, setUp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null); // id καταστήματος όταν αποθηκευτεί
  const [svcEdit, setSvcEdit] = useState<{ key: string; fresh: boolean; before?: Svc } | null>(null); // μία υπηρεσία ανοιχτή

  // Αν ο χρήστης έχει ήδη κατάστημα, ο οδηγός ξεκινά με τα στοιχεία του (και δεν φτιάχνει δεύτερο).
  useEffect(() => { loadBusiness(uid).then((r) => {
    if (!r) return;
    setB(r.b); setSvcs(r.svcs); setHours(r.hours);
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
  const go = (n: number) => { dir.current = n > i ? 1 : -1; setI(n); };
  const back = () => {
    if (svcEdit) return closeSvc(true);
    return i === 0 ? router.back() : go(i - 1);
  };

  /* Υπηρεσίες: κάθε μία ανοίγει μόνη της. */
  const editing = svcEdit ? svcs.find((x) => x.key === svcEdit.key) : undefined;
  const openSvc = (key: string) => { dir.current = 1; setSvcEdit({ key, fresh: false, before: svcs.find((x) => x.key === key) }); };
  const addSvc = () => {
    const n: Svc = { key: newKey(), name: '', duration_min: '30', price: '', capacity: '1' };
    setSvcs([...svcs, n]); dir.current = 1; setSvcEdit({ key: n.key, fresh: true });
  };
  const patchSvc = (p: Partial<Svc>) => svcEdit && setSvcs((list) => list.map((x) => (x.key === svcEdit.key ? { ...x, ...p } : x)));
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

  const pickType = (k: string) => {
    if (k === b.category) return;
    const p = presetData(k);
    setB((x: any) => ({ ...x, category: k, layout: null, theme: null, brand_color: null, ...p.rules }));
    setRemoved((r) => [...r, ...svcs.filter((x) => x.id).map((x) => x.id!)]);
    setSvcs(p.svcs); setHours(p.hours);
  };
  const photo = async (kind: 'logo' | 'cover') => {
    setUp(kind);
    try { const url = await pickAndUpload(uid, kind); if (url) setB((x: any) => ({ ...x, [kind === 'logo' ? 'logo_url' : 'cover_url']: url })); }
    catch (e: any) { say('Δεν ανέβηκε η φωτογραφία', e.message); }
    setUp(null);
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
    <View style={[s.screen, { paddingTop: top + 18, paddingBottom: bottom + 24, paddingHorizontal: 20 }]}>
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
    look: { title: 'Δώσε της πρόσωπο', sub: 'Ένα εξώφυλλο, το λογότυπό σου και ένα χρώμα. Μπορείς να τα βάλεις και αργότερα.' },
    services: { title: `${scr.services}`, sub: 'Σου βάλαμε μερικές για αρχή. Πάτα μία για να την αλλάξεις ή να τη σβήσεις, ή πρόσθεσε καινούργια.' },
    hours: { title: 'Πότε είσαι ανοιχτά;', sub: 'Άνοιξε ή κλείσε κάθε μέρα. Για μεσημεριανό κενό πάτα «+ Διάλειμμα».' },
    rules: { title: 'Πώς κλείνουν θέση;', sub: 'Λίγοι κανόνες για τις κρατήσεις σου. Οι προτάσεις ταιριάζουν στο είδος σου.' },
    review: { title: 'Όλα έτοιμα;', sub: 'Ρίξε μια ματιά. Πάτα σε ό,τι θέλεις να αλλάξεις.' },
  };
  const optional = step === 'look' && !svcEdit;
  const title = editing ? (svcEdit!.fresh ? 'Νέα υπηρεσία' : editing.name.trim() || 'Υπηρεσία') : head[step].title;
  const sub = editing ? 'Μία υπηρεσία τη φορά: όνομα, διάρκεια, τιμή και πόσοι έρχονται μαζί.' : head[step].sub;
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
        </View>
      );
      case 'look': return (
        <View style={{ gap: 18 }}>
          <PagePreview biz={b} />
          <View style={[s.row, { gap: 10 }]}>
            <Btn kind="tint" size="sm" style={{ flex: 1 }} title={up === 'cover' ? 'Ανέβασμα…' : b.cover_url ? 'Άλλαξε εξώφυλλο' : '📷 Εξώφυλλο'} onPress={() => photo('cover')} />
            <Btn kind="tint" size="sm" style={{ flex: 1 }} title={up === 'logo' ? 'Ανέβασμα…' : b.logo_url ? 'Άλλαξε λογότυπο' : '🏷️ Λογότυπο'} onPress={() => photo('logo')} />
          </View>
          <View style={{ gap: 10 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>Χρώμα σελίδας</Text>
            <Swatches colors={COLORS} value={look.color} onPick={(c) => setB({ ...b, brand_color: c })} />
          </View>
        </View>
      );
      case 'services': return editing
        ? <ServiceForm svc={editing} onChange={patchSvc} onDelete={svcEdit?.fresh ? undefined : () => { dropSvc(editing.key); dir.current = -1; setSvcEdit(null); }} />
        : <ServiceList svcs={svcs} onOpen={openSvc} onAdd={addSvc} category={cat} />;
      case 'hours': return <HoursEditor hours={hours} setHours={setHours} />;
      case 'rules': return (
        <View style={{ gap: 22 }}>
          <Choice label="Πόσο νωρίτερα κλείνουν;" sub="Μέχρι πόσες μέρες μπροστά βλέπουν ελεύθερες ώρες."
            options={[7, 14, 30, 60].map((v) => ({ v, label: `${v} μέρες` }))} value={+b.max_days_ahead} onPick={(v) => setB({ ...b, max_days_ahead: v })} />
          <Choice label="Μέχρι πότε ακυρώνουν;" sub="Πόση ώρα πριν από το ραντεβού μπορούν να το ακυρώσουν."
            options={[60, 120, 240, 720, 1440, 2880].map((v) => ({ v, label: hrs(v) }))} value={+b.cancel_before_min} onPick={(v) => setB({ ...b, cancel_before_min: v })} />
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
          { label: scr.services, value: named.map((x) => `${x.name.trim()}${x.price ? ` ${price(Math.round(parseFloat(x.price.replace(',', '.')) * 100))}` : ''}`).join(' · '), to: 'services' },
          { label: 'Ανοιχτά', value: openDays.length ? openDays.map((d) => DAYS[d]).join(' ') : 'Καμία μέρα', to: 'hours' },
          { label: 'Κρατήσεις', value: `έως ${b.max_days_ahead} μέρες μπροστά · ακύρωση ${hrs(+b.cancel_before_min)} πριν`, to: 'rules' },
        ];
        return (
          <View style={{ gap: 14 }}>
            <Pressable onPress={() => go(STEPS.indexOf('look'))}>
              <PagePreview biz={b} />
            </Pressable>
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

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Animated.View style={[{ gap: 22 }, fade]}>
          <View style={{ gap: 6 }}>
            <Text style={{ color: C.tint, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 }}>
              ΒΗΜΑ {i + 1} ΑΠΟ {STEPS.length}{i > 0 && b.category ? `  ·  ${catEmoji(cat)} ${upper(scr.kicker)}` : ''}
            </Text>
            <Text style={[s.title, { fontSize: 30 }]}>{title}</Text>
            <Text style={{ color: C.mute, fontSize: 16, lineHeight: 23 }}>{sub}</Text>
          </View>
          {body()}
        </Animated.View>
      </ScrollView>

      {/* Κάτω: συνέχεια */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottom + 16, gap: 10, backgroundColor: C.bg,
        borderTopWidth: 1, borderTopColor: alpha(C.text, 0.06) }}>
        <Btn title={busy ? 'Μια στιγμή…' : svcEdit ? why || (svcEdit.fresh ? 'Προσθήκη' : 'Έτοιμο') : step === 'review' ? 'Δημιουργία σελίδας' : why || 'Συνέχεια'} onPress={next} disabled={!!why || busy} />
        {optional && !b.cover_url && !b.logo_url && (
          <Pressable onPress={() => go(i + 1)} hitSlop={8} style={({ pressed }) => ({ alignSelf: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: C.mute, fontWeight: '700', fontSize: 15 }}>Θα τις βάλω αργότερα</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
