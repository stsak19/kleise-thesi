import { say, promptText } from '../../../../lib/alert';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { pickAndUpload } from '../../../../lib/upload';
import { useRouter } from 'expo-router';
import { sb } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { Btn, C, CATEGORIES, Card, DAYS, H, Input, T, s } from '../../../../lib/ui';

type Svc = { key: string; id?: string; name: string; duration_min: string; price: string; capacity: string };
/* svc: null = γενικό ωράριο, αλλιώς το key της υπηρεσίας. Πολλά διαστήματα την ίδια μέρα = διάλειμμα. */
type Slot = { weekday: number; opens: string; closes: string; svc: string | null };
type Hours = Slot[];
const newKey = () => Math.random().toString(36).slice(2);
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const BRAND_COLORS = ['#ff7a59', '#e5484d', '#ec4899', '#a855f7', '#6366f1', '#2563eb', '#0ea5e9', '#14b8a6', '#1fa971', '#eab308', '#8b5e3c', '#16161a'];
const HEX = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_HOURS: Hours = [1, 2, 3, 4, 5].map((d) => ({ weekday: d, opens: '09:00', closes: '21:00', svc: null }));

export default function Setup() {
  const router = useRouter();
  const { session } = useAuth();
  const [b, setB] = useState<any>({ name: '', category: 'gym', city: '', address: '', phone: '', description: '',
    max_days_ahead: 14, cancel_before_min: 120, requires_approval: false, uses_credits: false, package_days: 30, is_published: false });
  const [svcs, setSvcs] = useState<Svc[]>([{ key: newKey(), name: '', duration_min: '60', price: '', capacity: '1' }]);
  const [edit, setEdit] = useState<string | null>(null); // ποιο ωράριο επεξεργάζεσαι
  const [up, setUp] = useState<string | null>(null);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);

  useEffect(() => { (async () => {
    const { data } = await sb.from('businesses').select('*').eq('owner_id', session!.user.id).maybeSingle();
    if (!data) return;
    setB(data);
    const { data: sv } = await sb.from('services').select('*').eq('business_id', data.id).eq('active', true);
    if (sv?.length) setSvcs(sv.map((x) => ({ key: x.id, id: x.id, name: x.name, duration_min: String(x.duration_min), price: x.price_cents != null ? String(x.price_cents / 100) : '', capacity: String(x.capacity) })));
    const { data: h } = await sb.from('opening_hours').select('*').eq('business_id', data.id).order('weekday');
    if (h?.length) setHours(h.map((x) => ({ weekday: x.weekday, opens: x.opens.slice(0, 5), closes: x.closes.slice(0, 5), svc: x.service_id ?? null })));
  })(); }, [session]);

  const save = async () => {
    if (!b.name.trim() || !b.city.trim()) return say('Γράψε όνομα και πόλη');
    const row = { ...b, owner_id: session!.user.id, max_days_ahead: +b.max_days_ahead || 14, cancel_before_min: +b.cancel_before_min || 0, package_days: +b.package_days || 30 };
    delete row.created_at;
    if (row.brand_color && !HEX.test(row.brand_color)) return say('Το χρώμα πρέπει να είναι της μορφής #RRGGBB');
    const bad = hours.find((h) => !TIME.test(h.opens) || !TIME.test(h.closes) || h.closes <= h.opens);
    if (bad) return say('Λάθος ωράριο', `${DAYS[bad.weekday]}: ${bad.opens}–${bad.closes}. Γράψε ώρες σαν 09:00 και το κλείσιμο μετά το άνοιγμα.`);
    let { data, error } = await sb.from('businesses').upsert(row).select().single();
    // Αν η βάση δεν έχει ακόμα τις νέες στήλες (δες supabase/migrations), αποθήκευσε χωρίς αυτές.
    const missing: string[] = [];
    for (const col of ['brand_color', 'cover_url']) {
      if (error && error.message.includes(col)) {
        delete row[col]; missing.push(col);
        ({ data, error } = await sb.from('businesses').upsert(row).select().single());
      }
    }
    if (error || !data) return say('Δεν αποθηκεύτηκε', error?.message);
    if (missing.length) say('Κάποια στοιχεία δεν αποθηκεύτηκαν', 'Χρειάζεται ενημέρωση της βάσης (supabase/migrations).');
    const ids: Record<string, string> = {};
    for (const x of svcs.filter((x) => x.name.trim())) {
      const r = { business_id: data.id, name: x.name.trim(), duration_min: +x.duration_min || 30, capacity: +x.capacity || 1,
        price_cents: x.price ? Math.round(parseFloat(x.price.replace(',', '.')) * 100) : null };
      if (x.id) { await sb.from('services').update(r).eq('id', x.id); ids[x.key] = x.id; }
      else { const { data: n } = await sb.from('services').insert(r).select('id').single(); if (n) ids[x.key] = n.id; }
    }
    await sb.from('opening_hours').delete().eq('business_id', data.id);
    const rows = hours.filter((h) => h.svc === null || ids[h.svc])
      .map((h) => ({ business_id: data.id, weekday: h.weekday, opens: h.opens, closes: h.closes, ...(h.svc ? { service_id: ids[h.svc] } : {}) }));
    const hr = await sb.from('opening_hours').insert(rows);
    if (hr.error && hr.error.message.includes('service_id')) {
      await sb.from('opening_hours').insert(rows.filter((r: any) => !r.service_id));
      say('Το ωράριο ανά υπηρεσία δεν αποθηκεύτηκε', 'Χρειάζεται ενημέρωση της βάσης (supabase/migrations/002).');
    }
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
  const photo = async (kind: 'logo' | 'cover') => {
    setUp(kind);
    try { const url = await pickAndUpload(session!.user.id, kind); if (url) setB({ ...b, [kind === 'logo' ? 'logo_url' : 'cover_url']: url }); }
    catch (e: any) { say('Δεν ανέβηκε η φωτογραφία', e.message); }
    setUp(null);
  };
  const sw = (k: string, label: string) => (
    <View style={s.row}><Switch value={!!b[k]} onValueChange={(v) => setB({ ...b, [k]: v })} /><T>{label}</T></View>);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <H>Επιχείρηση</H>
      <Input placeholder="Όνομα" value={b.name} onChangeText={(v) => setB({ ...b, name: v })} />
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.key} onPress={() => setB({ ...b, category: c.key })} style={[s.chip, b.category === c.key && { backgroundColor: C.accent, borderColor: C.accent }]}>
            <Text style={{ color: b.category === c.key ? C.onAccent : C.text }}>{c.emoji} {c.label}</Text>
          </Pressable>))}
      </View>
      <Input placeholder="Πόλη" value={b.city} onChangeText={(v) => setB({ ...b, city: v })} />
      <Input placeholder="Διεύθυνση" value={b.address ?? ''} onChangeText={(v) => setB({ ...b, address: v })} />
      <Input placeholder="Τηλέφωνο" keyboardType="phone-pad" value={b.phone ?? ''} onChangeText={(v) => setB({ ...b, phone: v })} />
      <Input placeholder="Περιγραφή" multiline value={b.description ?? ''} onChangeText={(v) => setB({ ...b, description: v })} />

      <H>Φωτογραφίες</H>
      <T mute>Λογότυπο και φωτογραφία εξωφύλλου που βλέπουν οι πελάτες στη σελίδα σου.</T>
      <Pressable onPress={() => photo('cover')} style={{ height: 150, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {b.cover_url ? <Image source={{ uri: b.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{up === 'cover' ? 'Ανέβασμα…' : b.cover_url ? '📷 Αλλαγή εξωφύλλου' : '📷 Προσθήκη εξωφύλλου'}</Text>
        </View>
      </Pressable>
      <View style={s.row}>
        <Pressable onPress={() => photo('logo')} style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {b.logo_url ? <Image source={{ uri: b.logo_url }} style={{ width: 84, height: 84 }} /> : <Text style={{ fontSize: 28 }}>🏪</Text>}
        </Pressable>
        <Btn kind="ghost" title={up === 'logo' ? 'Ανέβασμα…' : b.logo_url ? 'Αλλαγή λογότυπου' : 'Προσθήκη λογότυπου'} onPress={() => photo('logo')} style={{ flex: 1 }} />
      </View>

      <H>Χρώμα καταστήματος</H>
      <T mute>Έτσι θα βλέπουν οι πελάτες τη σελίδα σου: τίτλος, κουμπιά, επιλεγμένη μέρα.</T>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {BRAND_COLORS.map((c) => { const on = (b.brand_color || '#ff7a59') === c; return (
          <Pressable key={c} onPress={() => setB({ ...b, brand_color: c })}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c, borderWidth: on ? 3 : 0, borderColor: C.text, alignItems: 'center', justifyContent: 'center' }}>
            {on && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}
          </Pressable>); })}
      </View>
      <Input placeholder="ή γράψε κωδικό, π.χ. #2563eb" autoCapitalize="none" value={b.brand_color ?? ''} onChangeText={(v) => setB({ ...b, brand_color: v.trim() })} />
      <View style={{ backgroundColor: HEX.test(b.brand_color ?? '') ? b.brand_color : '#ff7a59', borderRadius: 16, padding: 14 }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{b.name || 'Το κατάστημά σου'}</Text>
        <Text style={{ color: '#fff', opacity: 0.9 }}>Προεπισκόπηση</Text>
      </View>

      <H>Υπηρεσίες</H>
      <T mute>Θέσεις 1 = ατομικό ραντεβού (νύχια, κούρεμα). Περισσότερες = ομαδικό (γυμναστήριο, pilates).</T>
      {svcs.map((x, i) => {
        const up = (k: keyof Svc, v: string) => setSvcs(svcs.map((y, j) => (j === i ? { ...y, [k]: v } : y)));
        return (
          <Card key={x.key}>
            <Input placeholder="Όνομα υπηρεσίας" value={x.name} onChangeText={(v) => up('name', v)} />
            <View style={s.row}>
              <Input style={{ flex: 1, minWidth: 0, width: 10 }} placeholder="Λεπτά" keyboardType="number-pad" value={x.duration_min} onChangeText={(v) => up('duration_min', v)} />
              <Input style={{ flex: 1, minWidth: 0, width: 10 }} placeholder="Τιμή €" keyboardType="decimal-pad" value={x.price} onChangeText={(v) => up('price', v)} />
              <Input style={{ flex: 1, minWidth: 0, width: 10 }} placeholder="Θέσεις" keyboardType="number-pad" value={x.capacity} onChangeText={(v) => up('capacity', v)} />
            </View>
            {x.id && <Btn kind="danger" title="Αφαίρεση" onPress={async () => { await sb.from('services').update({ active: false }).eq('id', x.id!); setSvcs(svcs.filter((_, j) => j !== i)); setHours(hours.filter((h) => h.svc !== x.key)); }} />}
          </Card>);
      })}
      <Btn kind="ghost" title="+ Υπηρεσία" onPress={() => setSvcs([...svcs, { key: newKey(), name: '', duration_min: '60', price: '', capacity: '1' }])} />

      <H>Ωράριο</H>
      <T mute>Για διάλειμμα (π.χ. μεσημεριανό) πάτα «+ Διάλειμμα» και βάλε δεύτερο διάστημα την ίδια μέρα.</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ key: null as string | null, name: 'Γενικό' }, ...svcs.filter((x) => x.name.trim())].map((x) => { const on = edit === x.key; return (
          <Pressable key={x.key ?? 'all'} onPress={() => setEdit(x.key)} style={[s.chip, on && { backgroundColor: C.accent, borderColor: C.accent }]}>
            <Text style={{ color: on ? C.onAccent : C.text, fontWeight: '600' }}>{x.key === null ? '🏪 ' : ''}{x.name}</Text>
          </Pressable>); })}
      </ScrollView>
      {edit !== null && (
        <View style={s.row}><Switch value={own} onValueChange={setOwn} />
          <T>{own ? 'Δικό της ωράριο' : 'Ίδιο με το γενικό ωράριο'}</T></View>
      )}
      {own && WEEK.map((d) => { const rows = dayRows(d); return (
        <Card key={d} style={{ gap: 8 }}>
          <View style={s.row}>
            <Text style={{ color: C.text, fontWeight: '800', width: 44 }}>{DAYS[d]}</Text>
            <Switch value={rows.length > 0} onValueChange={() => toggleDay(d)} />
            <Text style={{ color: C.mute, flex: 1 }}>{rows.length ? (rows.length > 1 ? 'Ανοιχτά, με διάλειμμα' : 'Ανοιχτά') : 'Κλειστά'}</Text>
          </View>
          {rows.sort((a, z) => a.h.opens.localeCompare(z.h.opens)).map(({ h, i }) => (
            <View key={i} style={s.row}>
              <Input style={{ flex: 1, minWidth: 0, width: 10, textAlign: 'center' }} value={h.opens} placeholder="09:00" onChangeText={(v) => setRow(i, { opens: v })} />
              <Text style={{ color: C.mute }}>έως</Text>
              <Input style={{ flex: 1, minWidth: 0, width: 10, textAlign: 'center' }} value={h.closes} placeholder="17:00" onChangeText={(v) => setRow(i, { closes: v })} />
              {rows.length > 1 && <Pressable onPress={() => setHours(hours.filter((_, j) => j !== i))}><Text style={{ color: C.bad, fontSize: 18, padding: 6 }}>✕</Text></Pressable>}
            </View>
          ))}
          {rows.length > 0 && <Pressable onPress={() => addBreak(d)}><Text style={{ color: C.accent, fontWeight: '700' }}>+ Διάλειμμα</Text></Pressable>}
        </Card>); })}

      <H>Κανόνες κρατήσεων</H>
      <T mute>Μέρες μπροστά που ανοίγουν κρατήσεις</T>
      <Input keyboardType="number-pad" value={String(b.max_days_ahead)} onChangeText={(v) => setB({ ...b, max_days_ahead: v })} />
      <T mute>Ακύρωση από τον πελάτη έως (λεπτά πριν)</T>
      <Input keyboardType="number-pad" value={String(b.cancel_before_min)} onChangeText={(v) => setB({ ...b, cancel_before_min: v })} />
      {sw('requires_approval', 'Οι νέοι πελάτες θέλουν έγκριση')}
      {sw('uses_credits', 'Πακέτα κρατήσεων (καρνέ)')}
      {b.uses_credits && <><T mute>Διάρκεια πακέτου (μέρες)</T>
        <Input keyboardType="number-pad" value={String(b.package_days)} onChangeText={(v) => setB({ ...b, package_days: v })} /></>}
      {sw('is_published', 'Δημοσίευση στην αναζήτηση')}
      <Btn title="Αποθήκευση" onPress={save} />
    </ScrollView>
  );
}
