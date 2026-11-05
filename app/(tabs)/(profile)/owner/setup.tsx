import { say, promptText } from '../../../../lib/alert';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { pickAndUpload } from '../../../../lib/upload';
import { useRouter } from 'expo-router';
import { sb } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { LAYOUTS, styleOf } from '../../../../lib/presets';
import { DAYNAME, EMPTY_BIZ, HEX, Hours, Slot, Svc, WEEK, badHours, loadBusiness, newKey, presetData, saveBusiness } from '../../../../lib/owner/save';
import { Btn, C, CATEGORIES, catLabel, Card, Chip, DAYS, Group, Icon, Input, Section, SwitchRow, T, TextBtn, Toggle, alpha, catEmoji, onColor, s, shadow } from '../../../../lib/ui';

const DEFAULT_HOURS: Hours = [1, 2, 3, 4, 5].map((d) => ({ weekday: d, opens: '09:00', closes: '21:00', svc: null }));

export default function Setup() {
  const router = useRouter();
  const { session } = useAuth();
  const [b, setB] = useState<any>(EMPTY_BIZ);
  const [svcs, setSvcs] = useState<Svc[]>([{ key: newKey(), name: '', duration_min: '60', price: '', capacity: '1' }]);
  const [edit, setEdit] = useState<string | null>(null); // ποιο ωράριο επεξεργάζεσαι
  const [up, setUp] = useState<string | null>(null);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [removed, setRemoved] = useState<string[]>([]); // υπηρεσίες που φεύγουν με την αποθήκευση

  useEffect(() => { loadBusiness(session!.user.id).then((r) => {
    if (!r) return;
    setB(r.b);
    if (r.svcs.length) setSvcs(r.svcs);
    if (r.hours.length) setHours(r.hours);
  }); }, [session]);

  const save = async () => {
    if (!b.name.trim() || !b.city.trim()) return say('Γράψε όνομα και πόλη');
    if (b.brand_color && !HEX.test(b.brand_color)) return say('Το χρώμα πρέπει να είναι της μορφής #RRGGBB');
    const bad = badHours(hours);
    if (bad) return say('Λάθος ωράριο', bad);
    const r = await saveBusiness(session!.user.id, b, svcs, hours, removed);
    if (!r.ok) return say('Δεν αποθηκεύτηκε', r.error);
    r.warnings.forEach((w) => say('Προσοχή', w));
    say('Αποθηκεύτηκε'); router.back();
  };

  // Ωράριο που επεξεργάζεσαι τώρα (γενικό ή μιας υπηρεσίας)
  const mine = (h: Slot) => h.svc === edit;
  const own = edit === null || hours.some(mine);
  const dayRows = (d: number) => hours.map((h, i) => ({ h, i })).filter(({ h }) => mine(h) && h.weekday === d);
  const setRow = (i: number, p: Partial<Slot>) => setHours(hours.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const toggleDay = (d: number) => dayRows(d).length
    ? setHours(hours.filter((h) => !(mine(h) && h.weekday === d)))
    : setHours([...hours, { weekday: d, opens: '09:00', closes: '17:00', svc: edit }]);
  const addBreak = (d: number) => {
    const last = dayRows(d).map(({ h }) => h).sort((a, z) => a.closes.localeCompare(z.closes)).pop();
    const from = last ? last.closes : '09:00';
    const hh = Math.min(23, parseInt(from, 10) + 1);
    setHours([...hours, { weekday: d, opens: `${String(hh).padStart(2, '0')}:00`, closes: `${String(Math.min(23, hh + 4)).padStart(2, '0')}:00`, svc: edit }]);
  };
  const setOwn = (on: boolean) => setHours(on
    ? [...hours, ...hours.filter((h) => h.svc === null).map((h) => ({ ...h, svc: edit }))]
    : hours.filter((h) => !mine(h)));
  /* Πρότυπο είδους: υπηρεσίες, ωράριο και κανόνες που ταιριάζουν (lib/presets.ts). */
  const applyPreset = (cat: string, ask: boolean) => {
    const p = presetData(cat);
    const go = () => {
      setB((x: any) => ({ ...x, category: cat, layout: null, theme: null, brand_color: null, ...p.rules }));
      // οι υπάρχουσες υπηρεσίες απενεργοποιούνται στην αποθήκευση, οι προτεινόμενες μπαίνουν ως νέες
      setRemoved((r) => [...r, ...svcs.filter((x) => x.id).map((x) => x.id!)]);
      setSvcs(p.svcs);
      setHours(p.hours);
      setEdit(null);
    };
    if (!ask) return go();
    say(`Πρότυπο «${catLabel(cat)}»`, 'Οι υπηρεσίες, το ωράριο, οι κανόνες και η εμφάνιση θα αντικατασταθούν με τις προτεινόμενες. Αλλάζουν οριστικά όταν πατήσεις «Αποθήκευση».',
      [{ text: 'Άκυρο', style: 'cancel' }, { text: 'Εφαρμογή', onPress: go }]);
  };
  const pickCategory = (cat: string) => {
    if (cat === b.category) return;
    const empty = !b.id && svcs.every((x) => !x.name.trim());
    if (empty) return applyPreset(cat, false);
    setB({ ...b, category: cat });
    say(`Είδος: ${catLabel(cat)}`, 'Θέλεις να μπουν και οι προτεινόμενες ρυθμίσεις (υπηρεσίες, ωράριο, κανόνες, εμφάνιση);',
      [{ text: 'Όχι', style: 'cancel' }, { text: 'Ναι, βάλ’ τες', onPress: () => applyPreset(cat, false) }]);
  };

  const photo = async (kind: 'logo' | 'cover') => {
    setUp(kind);
    try { const url = await pickAndUpload(session!.user.id, kind); if (url) setB({ ...b, [kind === 'logo' ? 'logo_url' : 'cover_url']: url }); }
    catch (e: any) { say('Δεν ανέβηκε η φωτογραφία', e.message); }
    setUp(null);
  };
  const brand = styleOf(b).color;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Section title="Επιχείρηση" />
      <Card style={{ gap: 14 }}>
        <Input label="Όνομα" placeholder="π.χ. Κομμωτήριο Ελένη" value={b.name} onChangeText={(v) => setB({ ...b, name: v })} />
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Κατηγορία</Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {CATEGORIES.map((c) => <Chip key={c.key} emoji={c.emoji} label={c.label} on={b.category === c.key} onPress={() => pickCategory(c.key)} />)}
          </View>
          <TextBtn title={`✨ Βάλε τις προτεινόμενες ρυθμίσεις για «${catLabel(b.category)}»`} onPress={() => applyPreset(b.category, true)} />
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><Input label="Πόλη" placeholder="Αθήνα" value={b.city} onChangeText={(v) => setB({ ...b, city: v })} /></View>
          <View style={{ flex: 1 }}><Input label="Τηλέφωνο" placeholder="210…" keyboardType="phone-pad" value={b.phone ?? ''} onChangeText={(v) => setB({ ...b, phone: v })} /></View>
        </View>
        <Input label="Διεύθυνση" icon="pin" placeholder="Οδός και αριθμός" value={b.address ?? ''} onChangeText={(v) => setB({ ...b, address: v })} />
        <Input label="Περιγραφή" placeholder="Τι κάνετε, τι να περιμένει ο πελάτης…" multiline value={b.description ?? ''} onChangeText={(v) => setB({ ...b, description: v })} />
      </Card>

      <Section title="Φωτογραφίες & χρώμα" sub="Έτσι θα βλέπουν οι πελάτες τη σελίδα σου." />
      <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <Pressable onPress={() => photo('cover')} style={{ height: 150, backgroundColor: brand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {b.cover_url ? <Image source={{ uri: b.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
            : <Text style={{ position: 'absolute', right: 24, top: 26, fontSize: 56 }}>{catEmoji(b.category)}</Text>}
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
        <View style={{ padding: 16, paddingTop: 4, gap: 6, borderTopWidth: 1, borderTopColor: C.line }}>
          <T mute style={{ fontSize: 13, marginTop: 10 }}>Χρώμα, θέμα και διάταξη σελίδας: {LAYOUTS.find((l) => l.key === styleOf(b).layout)!.name} · {styleOf(b).theme.name}</T>
          {b.id ? <TextBtn title="🎨 Άλλαξε την εμφάνιση" color={brand} onPress={() => router.push('/owner/style')} />
            : <T mute style={{ fontSize: 12 }}>Θα μπορείς να την αλλάξεις μετά την πρώτη αποθήκευση.</T>}
        </View>
      </Card>

      <Section title="Υπηρεσίες" sub="Θέσεις 1 = ατομικό ραντεβού (νύχια, κούρεμα). Περισσότερες = ομαδικό (γυμναστήριο, pilates)." />
      {svcs.map((x, i) => {
        const up = (k: keyof Svc, v: string) => setSvcs(svcs.map((y, j) => (j === i ? { ...y, [k]: v } : y)));
        return (
          <Card key={x.key} style={{ gap: 12 }}>
            <View style={[s.row, { gap: 10 }]}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: alpha(brand, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: brand, fontWeight: '900' }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}><Input placeholder="Όνομα υπηρεσίας" value={x.name} onChangeText={(v) => up('name', v)} /></View>
            </View>
            <View style={[s.row, { gap: 8 }]}>
              <View style={{ flex: 1 }}><Input label="Λεπτά" style={{ width: 10 }} keyboardType="number-pad" value={x.duration_min} onChangeText={(v) => up('duration_min', v)} /></View>
              <View style={{ flex: 1 }}><Input label="Τιμή €" style={{ width: 10 }} keyboardType="decimal-pad" value={x.price} onChangeText={(v) => up('price', v)} /></View>
              <View style={{ flex: 1 }}><Input label="Θέσεις" style={{ width: 10 }} keyboardType="number-pad" value={x.capacity} onChangeText={(v) => up('capacity', v)} /></View>
            </View>
            {x.id && <Btn kind="danger" size="sm" title="Αφαίρεση υπηρεσίας" onPress={async () => { await sb.from('services').update({ active: false }).eq('id', x.id!); setSvcs(svcs.filter((_, j) => j !== i)); setHours(hours.filter((h) => h.svc !== x.key)); }} />}
          </Card>);
      })}
      <Btn kind="tint" icon="plus" title="Νέα υπηρεσία" onPress={() => setSvcs([...svcs, { key: newKey(), name: '', duration_min: '60', price: '', capacity: '1' }])} />

      <Section title="Ωράριο" sub="Για διάλειμμα (π.χ. μεσημεριανό) πάτα «+ Διάλειμμα» και βάλε δεύτερο διάστημα την ίδια μέρα." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {[{ key: null as string | null, name: 'Γενικό' }, ...svcs.filter((x) => x.name.trim())].map((x) =>
          <Chip key={x.key ?? 'all'} emoji={x.key === null ? '🏪' : undefined} label={x.name} on={edit === x.key} onPress={() => setEdit(x.key)} />)}
      </ScrollView>
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
                <View key={i} style={[s.row, { gap: 8 }]}>
                  <View style={{ flex: 1 }}><Input style={{ width: 10, textAlign: 'center' }} value={h.opens} placeholder="09:00" onChangeText={(v) => setRow(i, { opens: v })} /></View>
                  <Text style={{ color: C.mute }}>–</Text>
                  <View style={{ flex: 1 }}><Input style={{ width: 10, textAlign: 'center' }} value={h.closes} placeholder="17:00" onChangeText={(v) => setRow(i, { closes: v })} /></View>
                  {rows.length > 1 && <Pressable onPress={() => setHours(hours.filter((_, j) => j !== i))} hitSlop={6}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: alpha(C.bad, 0.1), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="close" size={14} color={C.bad} /></Pressable>}
                </View>
              ))}
              {rows.length > 0 && <TextBtn title="+ Διάλειμμα" onPress={() => addBreak(d)} />}
            </View>); })}
        </Group>
      )}

      <Section title="Κανόνες κρατήσεων" />
      <Card style={{ gap: 14 }}>
        <View style={[s.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><Input label="Κρατήσεις (μέρες μπροστά)" keyboardType="number-pad" value={String(b.max_days_ahead)} onChangeText={(v) => setB({ ...b, max_days_ahead: v })} /></View>
          <View style={{ flex: 1 }}><Input label="Ακύρωση (λεπτά πριν)" keyboardType="number-pad" value={String(b.cancel_before_min)} onChangeText={(v) => setB({ ...b, cancel_before_min: v })} /></View>
        </View>
        {b.uses_credits && <Input label="Διάρκεια πακέτου (μέρες)" keyboardType="number-pad" value={String(b.package_days)} onChangeText={(v) => setB({ ...b, package_days: v })} />}
      </Card>
      <Group>
        <SwitchRow label="Έγκριση νέων πελατών" sub="Ο νέος πελάτης κλείνει μόνο αφού τον εγκρίνεις" value={!!b.requires_approval} onChange={(v) => setB({ ...b, requires_approval: v })} />
        <SwitchRow label="Πακέτα κρατήσεων (καρνέ)" sub="Κάθε κράτηση χρεώνεται από το πακέτο του πελάτη" value={!!b.uses_credits} onChange={(v) => setB({ ...b, uses_credits: v })} />
        <SwitchRow label="Δημοσίευση στην αναζήτηση" sub="Οι πελάτες βρίσκουν το κατάστημα και κλείνουν θέση" value={!!b.is_published} onChange={(v) => setB({ ...b, is_published: v })} last />
      </Group>
      <Btn title="Αποθήκευση" onPress={save} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}
