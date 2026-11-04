import { say, promptText } from '../../../../lib/alert';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { rpc, sb } from '../../../../lib/supabase';
import { Btn, C, Card, DAYS, H, T, catLabel, fmtDay, iso, s } from '../../../../lib/ui';

type Service = { id: string; name: string; duration_min: number; price_cents: number | null; capacity: number };
type Slot = { slot_time: string; time: string; capacity: number; taken: number; free: number };

export default function Business() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [biz, setBiz] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState(iso(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mine, setMine] = useState<any>({ bookings: [], waitlist: [] });
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: b } = await sb.from('businesses').select('*').eq('id', id).single();
      setBiz(b);
      const { data: sv } = await sb.from('services').select('*').eq('business_id', id).eq('active', true).order('name');
      setServices(sv ?? []); if (sv?.length) setService(sv[0]);
    })();
  }, [id]);

  const days = useMemo(() => {
    const n = biz?.max_days_ahead ?? 14, base = new Date();
    return Array.from({ length: n + 1 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return iso(d); });
  }, [biz]);

  const load = useCallback(async () => {
    if (!service) return;
    const [av, my, dn] = await Promise.all([
      rpc<Slot[]>('day_availability', { p_service: service.id, p_date: date }),
      rpc('my_bookings'),
      sb.from('day_overrides').select('note,closed').eq('business_id', id).eq('date', date).maybeSingle(),
    ]);
    setSlots((av ?? []).map((x) => ({ ...x, time: x.slot_time.slice(0, 5) })));
    setMine(my);
    setNote(dn.data?.closed ? 'Κλειστά αυτή τη μέρα' : dn.data?.note ?? null);
  }, [service, date, id]);
  useEffect(() => { load().catch(() => say('Δεν φορτώθηκε το πρόγραμμα')); }, [load]);

  const myAt = (t: string) => mine.bookings.find((b: any) => b.service_id === service?.id && b.date === date && b.time === t && b.status === 'booked');
  const waitAt = (t: string) => mine.waitlist.find((w: any) => w.service_id === service?.id && w.date === date && w.time === t);

  const act = async (t: string, fn: () => Promise<any>, okMsg: string) => {
    setBusy(t);
    try {
      const r = await fn();
      if (r && r.ok === false) say(r.pending ? 'Σε αναμονή έγκρισης' : 'Δεν έγινε', r.error);
      else say(okMsg);
    } catch (e: any) { say('Κάτι πήγε στραβά', e.message); }
    setBusy(null); load();
  };

  /* Όπως στο γυμναστήριο: αν έχει ήδη δηλώσει ενδιαφέρον για άλλη ώρα
     της ίδιας μέρας, ρωτάμε αν η νέα κράτηση είναι η εναλλακτική. */
  const book = (t: string) => {
    const open = mine.waitlist.find((w: any) => w.service_id === service!.id && w.date === date && w.time !== t);
    const go = async (backup: string | null) => {
      setBusy(t);
      try {
        const r = await rpc('create_booking', { p_service: service!.id, p_date: date, p_time: t, p_backup_for: backup });
        if (r && r.ok === false) say(r.pending ? 'Σε αναμονή έγκρισης' : 'Δεν έγινε', r.error);
        else router.push({ pathname: '/booked', params: { biz: biz.name, service: service!.name, date, time: t, color: brand } });
      } catch (e: any) { say('Κάτι πήγε στραβά', e.message); }
      setBusy(null); load();
    };
    if (!open) return go(null);
    say('Είναι εναλλακτική;', `Έχεις δηλώσει ενδιαφέρον για τις ${open.time}. Αν ελευθερωθεί θέση εκεί, να ακυρωθεί αυτόματα η κράτηση των ${t};`,
      [{ text: 'Ναι, εναλλακτική', onPress: () => go(open.id) }, { text: 'Όχι, θέλω και τις δύο', onPress: () => go(null) }]);
  };
  const wait = (t: string) => {
    const same = mine.bookings.find((b: any) => b.service_id === service!.id && b.date === date && b.status === 'booked');
    const go = (backup: string | null) => act(t, () => rpc('join_waitlist', { p_service: service!.id, p_date: date, p_time: t, p_backup_booking: backup }), `Δήλωσες ενδιαφέρον για τις ${t} 🙋 Αν ελευθερωθεί θέση, σου κλείνεται αυτόματα.`);
    if (!same) return go(null);
    say('Δήλωση ενδιαφέροντος', `Αν ελευθερωθεί θέση στις ${t}, να ακυρωθεί η κράτηση των ${same.time};`,
      [{ text: `Ναι, ακύρωσε τις ${same.time}`, onPress: () => go(same.id) }, { text: 'Όχι, κράτα και τις δύο', onPress: () => go(null) }]);
  };

  if (!biz) return <View style={s.screen} />;
  const brand: string = biz.brand_color || C.accent;
  const brandBtn = { backgroundColor: brand, borderColor: brand };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Stack.Screen options={{ title: biz.name }} />
      <View style={{ backgroundColor: brand, borderRadius: 20, padding: 18, gap: 4 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>{biz.name}</Text>
        <Text style={{ color: '#fff', opacity: 0.9 }}>{catLabel(biz.category)} · {biz.city}</Text>
      </View>
      {!!(biz.address || biz.phone) && <T mute>{biz.address ? `📍 ${biz.address}` : ''}{biz.address && biz.phone ? ' · ' : ''}{biz.phone ? `☎ ${biz.phone}` : ''}</T>}
      {!!biz.description && <T>{biz.description}</T>}

      <Text style={{ color: C.mute, marginTop: 8 }}>Υπηρεσία</Text>
      <View style={{ gap: 8 }}>
        {services.map((sv) => (
          <Pressable key={sv.id} onPress={() => setService(sv)}>
            <Card style={service?.id === sv.id ? { borderColor: brand, borderWidth: 2 } : undefined}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{sv.name}</Text>
              <T mute>{sv.duration_min}′{sv.price_cents != null ? ` · ${(sv.price_cents / 100).toFixed(2)}€` : ''}{sv.capacity > 1 ? ` · έως ${sv.capacity} άτομα` : ''}</T>
            </Card>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
        {days.map((d) => { const dd = new Date(d + 'T00:00'); const on = d === date; return (
          <Pressable key={d} onPress={() => setDate(d)} style={[s.chip, { alignItems: 'center' }, on && brandBtn]}>
            <Text style={{ color: on ? C.onAccent : C.mute, fontSize: 12 }}>{DAYS[dd.getDay()]}</Text>
            <Text style={{ color: on ? C.onAccent : C.text, fontWeight: '700' }}>{dd.getDate()}</Text>
          </Pressable>); })}
      </ScrollView>
      {!!note && <Card><T>📌 {note}</T></Card>}

      {slots.length === 0 && <T mute>Δεν υπάρχουν διαθέσιμες ώρες.</T>}
      {slots.map((sl) => {
        const b = myAt(sl.time), w = waitAt(sl.time);
        return (
          <Card key={sl.time} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{sl.time}</Text>
              <T mute>{b ? 'Έχεις κράτηση ✅' : w ? 'Σε λίστα ενδιαφέροντος 🙋' : sl.free > 0 ? (sl.capacity > 1 ? `${sl.free}/${sl.capacity} ελεύθερες` : 'Ελεύθερο') : 'Γεμάτο'}</T>
            </View>
            {b ? <Btn kind="danger" title="Ακύρωση" disabled={busy === sl.time} onPress={() => act(sl.time, () => rpc('cancel_booking', { p_booking: b.id }), 'Η κράτηση ακυρώθηκε')} />
              : w ? <Btn kind="ghost" title="Απόσυρση" disabled={busy === sl.time} onPress={() => act(sl.time, () => rpc('leave_waitlist', { p_service: service!.id, p_date: date, p_time: sl.time + ':00' }), 'Η δήλωση αποσύρθηκε')} />
              : sl.free > 0 ? <Btn title="Κράτηση" style={brandBtn} disabled={busy === sl.time} onPress={() => book(sl.time)} />
              : <Btn kind="ghost" title="Δήλωση ενδιαφέροντος" disabled={busy === sl.time} onPress={() => wait(sl.time)} />}
          </Card>
        );
      })}
    </ScrollView>
  );
}
