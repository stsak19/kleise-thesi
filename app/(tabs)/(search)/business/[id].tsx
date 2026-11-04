import { say, promptText } from '../../../../lib/alert';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { rpc, sb } from '../../../../lib/supabase';
import { Btn, C, DayStrip, Empty, Group, Icon, Pill, Row, Section, T, alpha, catEmoji, catLabel, fmtLong, iso, onColor, price, s, shadow } from '../../../../lib/ui';

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
  const [pick, setPick] = useState<string | null>(null); // επιλεγμένη ώρα
  useEffect(() => setPick(null), [service, date]);

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
  const fg = onColor(brand);
  const today = days[0];

  // Κατάσταση κάθε ώρας για το πλέγμα και για την μπάρα ενέργειας.
  const state = (sl: Slot) => (myAt(sl.time) ? 'mine' : waitAt(sl.time) ? 'wait' : sl.free > 0 ? 'free' : 'full');
  const picked = slots.find((x) => x.time === pick);
  const pState = picked ? state(picked) : null;
  const pB = picked ? myAt(picked.time) : null;

  const action = !picked ? null
    : pState === 'mine' ? <Btn kind="danger" title="Ακύρωση κράτησης" disabled={busy === picked.time}
        onPress={() => act(picked.time, () => rpc('cancel_booking', { p_booking: pB.id }), 'Η κράτηση ακυρώθηκε')} />
    : pState === 'wait' ? <Btn kind="ghost" title="Απόσυρση από τη λίστα" disabled={busy === picked.time}
        onPress={() => act(picked.time, () => rpc('leave_waitlist', { p_service: service!.id, p_date: date, p_time: picked.time + ':00' }), 'Η δήλωση αποσύρθηκε')} />
    : pState === 'free' ? <Btn title={`Κράτηση · ${picked.time}`} color={brand} disabled={busy === picked.time} onPress={() => book(picked.time)} />
    : <Btn kind="tint" color={brand} title="🙋 Δήλωση ενδιαφέροντος" disabled={busy === picked.time} onPress={() => wait(picked.time)} />;

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: picked ? 170 : 40 }}>
        {/* Εξώφυλλο */}
        <View style={{ height: 180, backgroundColor: brand, marginHorizontal: 12, borderRadius: 26, overflow: 'hidden' }}>
          {biz.cover_url
            ? <Image source={{ uri: biz.cover_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <>
                <View style={{ position: 'absolute', right: -40, top: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                <View style={{ position: 'absolute', left: -30, bottom: -70, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <Text style={{ position: 'absolute', right: 34, top: 40, fontSize: 72 }}>{catEmoji(biz.category)}</Text>
              </>}
        </View>

        <View style={[s.pad, { paddingTop: 0, paddingBottom: 0, gap: 12 }]}>
          {/* Λογότυπο, όνομα, κατηγορία */}
          <View style={{ marginTop: -44, width: 84, height: 84, borderRadius: 26, backgroundColor: C.card, padding: 4, marginLeft: 6, ...shadow(2) }}>
            {biz.logo_url
              ? <Image source={{ uri: biz.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
              : <View style={{ flex: 1, borderRadius: 22, backgroundColor: alpha(brand, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: brand, fontWeight: '900', fontSize: 34 }}>{biz.name.slice(0, 1)}</Text>
                </View>}
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ color: C.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 }}>{biz.name}</Text>
            <View style={s.row}>
              <Pill text={catLabel(biz.category)} color={brand} />
              {!!biz.city && <Pill text={biz.city} />}
            </View>
            {!!biz.description && <T mute style={{ fontSize: 15, lineHeight: 22, marginTop: 2 }}>{biz.description}</T>}
          </View>

          {!!(biz.address || biz.phone) && (
            <Group>
              {!!biz.address && <Row icon="pin" color={brand} title={biz.address} sub={biz.city} last={!biz.phone} />}
              {!!biz.phone && <Row icon="phone" color={brand} title={biz.phone} sub="Τηλέφωνο" last />}
            </Group>
          )}

          {/* 1. Υπηρεσία */}
          <Section title="Υπηρεσία" />
          <Group>
            {services.map((sv, i) => {
              const on = service?.id === sv.id;
              return (
                <Pressable key={sv.id} onPress={() => setService(sv)}
                  style={({ pressed }) => [s.row, { gap: 14, padding: 14, backgroundColor: on ? alpha(brand, 0.07) : pressed ? C.soft : 'transparent' },
                    i < services.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.line }]}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? brand : C.line, alignItems: 'center', justifyContent: 'center' }}>
                    {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brand }} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{sv.name}</Text>
                    <View style={[s.row, { gap: 5 }]}>
                      <Icon name="clock" size={13} color={C.mute} />
                      <Text style={{ color: C.mute, fontSize: 13 }}>{sv.duration_min} λεπτά{sv.capacity > 1 ? ` · ομαδικό έως ${sv.capacity}` : ''}</Text>
                    </View>
                  </View>
                  {sv.price_cents != null && <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{price(sv.price_cents)}</Text>}
                </Pressable>
              );
            })}
          </Group>

          {/* 2. Μέρα */}
          <Section title="Μέρα" />
          <DayStrip days={days} value={date} onChange={setDate} color={brand} />
          {!!note && (
            <View style={[s.row, { backgroundColor: alpha(brand, 0.08), borderRadius: 14, padding: 12, gap: 10 }]}>
              <Text style={{ fontSize: 16 }}>📌</Text><T style={{ flex: 1 }}>{note}</T>
            </View>
          )}

          {/* 3. Ώρα */}
          <Section title="Ώρα" sub={date === today ? 'Σήμερα' : fmtLong(date)} />
          {slots.length === 0
            ? <Empty emoji="🗓️" title="Δεν υπάρχουν ώρες" text="Διάλεξε άλλη μέρα για να δεις διαθεσιμότητα." />
            : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {slots.map((sl) => {
                  const st = state(sl), on = pick === sl.time;
                  const bg = st === 'mine' ? brand : st === 'full' ? C.soft : on ? alpha(brand, 0.1) : C.card;
                  const bc = st === 'mine' ? brand : on ? brand : st === 'full' ? C.soft : st === 'wait' ? brand : C.line;
                  const tc = st === 'mine' ? fg : st === 'full' ? C.mute : C.text;
                  const sub = st === 'mine' ? 'Δική σου ✓' : st === 'wait' ? 'Σε αναμονή' : st === 'full' ? 'Γεμάτο'
                    : sl.capacity > 1 ? `${sl.free} ${sl.free === 1 ? 'θέση' : 'θέσεις'}` : 'Ελεύθερο';
                  return (
                    <Pressable key={sl.time} onPress={() => setPick(on ? null : sl.time)}
                      style={({ pressed }) => [{ width: '31.5%', flexGrow: 0, paddingVertical: 12, borderRadius: 16, alignItems: 'center', gap: 2,
                        backgroundColor: bg, borderColor: bc, borderWidth: on ? 2 : 1, borderStyle: st === 'wait' ? 'dashed' : 'solid',
                        transform: [{ scale: pressed ? 0.96 : 1 }] }, st === 'free' && !on && shadow(1)]}>
                      <Text style={{ color: tc, fontWeight: '800', fontSize: 18, letterSpacing: -0.3, textDecorationLine: st === 'full' ? 'line-through' : 'none' }}>{sl.time}</Text>
                      <Text style={{ color: st === 'mine' ? fg : st === 'free' ? C.ok : st === 'wait' ? brand : C.mute, fontSize: 11, fontWeight: '700' }}>{sub}</Text>
                    </Pressable>
                  );
                })}
              </View>}
        </View>
      </ScrollView>

      {/* Μπάρα ενέργειας για την επιλεγμένη ώρα */}
      {picked && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: C.card, borderRadius: 24, padding: 16, gap: 12,
          borderWidth: 1, borderColor: C.line, ...shadow(3) }}>
          <View style={[s.row, { gap: 12 }]}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: alpha(brand, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: brand, fontWeight: '900', fontSize: 15 }}>{picked.time}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{service?.name}</Text>
              <Text style={{ color: C.mute, fontSize: 13 }}>
                {fmtLong(date)} · {pState === 'mine' ? 'έχεις κράτηση' : pState === 'wait' ? 'είσαι σε λίστα ενδιαφέροντος' : pState === 'full' ? 'γεμάτο — μπες σε λίστα ενδιαφέροντος' : `${service?.duration_min} λεπτά`}
              </Text>
            </View>
            {pState === 'free' && service?.price_cents != null && <Text style={{ color: C.text, fontWeight: '900', fontSize: 18 }}>{price(service.price_cents)}</Text>}
            <Pressable onPress={() => setPick(null)} hitSlop={10}><Icon name="close" size={18} color={C.mute} /></Pressable>
          </View>
          {action}
        </View>
      )}
    </View>
  );
}
