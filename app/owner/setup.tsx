import { say, promptText } from '../../lib/alert';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { sb } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Btn, C, CATEGORIES, Card, DAYS, H, Input, T, s } from '../../lib/ui';

type Svc = { id?: string; name: string; duration_min: string; price: string; capacity: string };
type Hours = { weekday: number; opens: string; closes: string }[];

const DEFAULT_HOURS: Hours = [1, 2, 3, 4, 5].map((d) => ({ weekday: d, opens: '09:00', closes: '21:00' }));

export default function Setup() {
  const router = useRouter();
  const { session } = useAuth();
  const [b, setB] = useState<any>({ name: '', category: 'gym', city: '', address: '', phone: '', description: '',
    max_days_ahead: 14, cancel_before_min: 120, requires_approval: false, uses_credits: false, package_days: 30, is_published: false });
  const [svcs, setSvcs] = useState<Svc[]>([{ name: '', duration_min: '60', price: '', capacity: '1' }]);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);

  useEffect(() => { (async () => {
    const { data } = await sb.from('businesses').select('*').eq('owner_id', session!.user.id).maybeSingle();
    if (!data) return;
    setB(data);
    const { data: sv } = await sb.from('services').select('*').eq('business_id', data.id).eq('active', true);
    if (sv?.length) setSvcs(sv.map((x) => ({ id: x.id, name: x.name, duration_min: String(x.duration_min), price: x.price_cents != null ? String(x.price_cents / 100) : '', capacity: String(x.capacity) })));
    const { data: h } = await sb.from('opening_hours').select('*').eq('business_id', data.id).order('weekday');
    if (h?.length) setHours(h.map((x) => ({ weekday: x.weekday, opens: x.opens.slice(0, 5), closes: x.closes.slice(0, 5) })));
  })(); }, [session]);

  const save = async () => {
    if (!b.name.trim() || !b.city.trim()) return say('Γράψε όνομα και πόλη');
    const row = { ...b, owner_id: session!.user.id, max_days_ahead: +b.max_days_ahead || 14, cancel_before_min: +b.cancel_before_min || 0, package_days: +b.package_days || 30 };
    delete row.created_at;
    const { data, error } = await sb.from('businesses').upsert(row).select().single();
    if (error) return say('Δεν αποθηκεύτηκε', error.message);
    for (const x of svcs.filter((x) => x.name.trim())) {
      const r = { business_id: data.id, name: x.name.trim(), duration_min: +x.duration_min || 30, capacity: +x.capacity || 1,
        price_cents: x.price ? Math.round(parseFloat(x.price.replace(',', '.')) * 100) : null };
      x.id ? await sb.from('services').update(r).eq('id', x.id) : await sb.from('services').insert(r);
    }
    await sb.from('opening_hours').delete().eq('business_id', data.id);
    await sb.from('opening_hours').insert(hours.map((h) => ({ ...h, business_id: data.id })));
    say('Αποθηκεύτηκε'); router.back();
  };

  const toggleDay = (d: number) => setHours(hours.some((h) => h.weekday === d) ? hours.filter((h) => h.weekday !== d)
    : [...hours, { weekday: d, opens: '09:00', closes: '17:00' }].sort((a, z) => a.weekday - z.weekday));
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

      <H>Υπηρεσίες</H>
      <T mute>Θέσεις 1 = ατομικό ραντεβού (νύχια, κούρεμα). Περισσότερες = ομαδικό (γυμναστήριο, pilates).</T>
      {svcs.map((x, i) => {
        const up = (k: keyof Svc, v: string) => setSvcs(svcs.map((y, j) => (j === i ? { ...y, [k]: v } : y)));
        return (
          <Card key={i}>
            <Input placeholder="Όνομα υπηρεσίας" value={x.name} onChangeText={(v) => up('name', v)} />
            <View style={s.row}>
              <Input style={{ flex: 1 }} placeholder="Λεπτά" keyboardType="number-pad" value={x.duration_min} onChangeText={(v) => up('duration_min', v)} />
              <Input style={{ flex: 1 }} placeholder="Τιμή €" keyboardType="decimal-pad" value={x.price} onChangeText={(v) => up('price', v)} />
              <Input style={{ flex: 1 }} placeholder="Θέσεις" keyboardType="number-pad" value={x.capacity} onChangeText={(v) => up('capacity', v)} />
            </View>
            {x.id && <Btn kind="danger" title="Αφαίρεση" onPress={async () => { await sb.from('services').update({ active: false }).eq('id', x.id!); setSvcs(svcs.filter((_, j) => j !== i)); }} />}
          </Card>);
      })}
      <Btn kind="ghost" title="+ Υπηρεσία" onPress={() => setSvcs([...svcs, { name: '', duration_min: '60', price: '', capacity: '1' }])} />

      <H>Ωράριο</H>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {DAYS.map((d, i) => { const on = hours.some((h) => h.weekday === i); return (
          <Pressable key={d} onPress={() => toggleDay(i)} style={[s.chip, on && { backgroundColor: C.accent, borderColor: C.accent }]}>
            <Text style={{ color: on ? C.onAccent : C.text }}>{d}</Text></Pressable>); })}
      </View>
      {hours.map((h, i) => (
        <View key={h.weekday} style={s.row}>
          <Text style={{ color: C.text, width: 40 }}>{DAYS[h.weekday]}</Text>
          <Input style={{ flex: 1 }} value={h.opens} onChangeText={(v) => setHours(hours.map((y, j) => (j === i ? { ...y, opens: v } : y)))} />
          <Input style={{ flex: 1 }} value={h.closes} onChangeText={(v) => setHours(hours.map((y, j) => (j === i ? { ...y, closes: v } : y)))} />
        </View>))}

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
