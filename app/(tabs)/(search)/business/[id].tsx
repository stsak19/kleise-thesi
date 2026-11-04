import { say } from '../../../../lib/alert';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { rpc, sb } from '../../../../lib/supabase';
import { Btn, C, DayStrip, Empty, Group, Icon, Row, Section, alpha, fmtLong, iso, onColor, price, s } from '../../../../lib/ui';
import { BizHeader } from '../../../../lib/BizHeader';
import { styleOf } from '../../../../lib/presets';

type Service = { id: string; name: string; duration_min: number; price_cents: number | null; capacity: number };
type Slot = { sv: Service; time: string; capacity: number; taken: number; free: number };

const endOf = (t: string, min: number) => {
  const [h, m] = t.split(':').map(Number); const e = h * 60 + m + min;
  return `${String(Math.floor(e / 60) % 24).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
};
const avail = async (sv: Service, date: string): Promise<Slot[]> =>
  ((await rpc<any[]>('day_availability', { p_service: sv.id, p_date: date })) ?? [])
    .map((x) => ({ sv, time: x.slot_time.slice(0, 5), capacity: x.capacity, taken: x.taken, free: x.free }));

/* Σελίδα καταστήματος. Η δομή αλλάζει ανάλογα με τη διάταξη (lib/presets.ts):
   classes = πρόγραμμα μαθημάτων της μέρας · appointment = επόμενο διαθέσιμο ραντεβού · menu = κατάλογος υπηρεσιών. */
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
  const [next, setNext] = useState<{ date: string; time: string } | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data: b } = await sb.from('businesses').select('*').eq('id', id).single();
      setBiz(b);
      const { data: sv } = await sb.from('services').select('*').eq('business_id', id).eq('active', true).order('name');
      setServices(sv ?? []); if (sv?.length) setService(sv[0]);
    })();
  }, [id]);

  const st = biz ? styleOf(biz) : null;
  const layout = st?.layout;

  const days = useMemo(() => {
    const n = biz?.max_days_ahead ?? 14, base = new Date();
    return Array.from({ length: n + 1 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return iso(d); });
  }, [biz]);

  const load = useCallback(async () => {
    if (!layout) return;
    const list = layout === 'classes' ? services : service ? [service] : [];
    if (!list.length) return setSlots([]);
    const [all, my, dn] = await Promise.all([
      Promise.all(list.map((sv) => avail(sv, date))),
      rpc('my_bookings'),
      sb.from('day_overrides').select('note,closed').eq('business_id', id).eq('date', date).maybeSingle(),
    ]);
    setSlots(all.flat().sort((a, z) => a.time.localeCompare(z.time) || a.sv.name.localeCompare(z.sv.name)));
    setMine(my);
    setNote(dn.data?.closed ? 'Κλειστά αυτή τη μέρα' : dn.data?.note ?? null);
  }, [layout, services, service, date, id]);
  useEffect(() => { load().catch(() => say('Δεν φορτώθηκε το πρόγραμμα')); }, [load]);

  // Ραντεβού: ψάχνει την πρώτη ελεύθερη ώρα από σήμερα και μετά.
  useEffect(() => {
    if (layout !== 'appointment' || !service) return;
    let stop = false; setNext(undefined);
    (async () => {
      for (const d of days.slice(0, 31)) {
        const free = (await avail(service, d).catch(() => [])).find((x) => x.free > 0);
        if (stop) return;
        if (free) return setNext({ date: d, time: free.time });
      }
      if (!stop) setNext(null);
    })();
    return () => { stop = true; };
  }, [layout, service, days, mine]);

  const myAt = (sv: Service, d: string, t: string) => mine.bookings.find((b: any) => b.service_id === sv.id && b.date === d && b.time === t && b.status === 'booked');
  const waitAt = (sv: Service, t: string) => mine.waitlist.find((w: any) => w.service_id === sv.id && w.date === date && w.time === t);

  const act = async (key: string, fn: () => Promise<any>, okMsg: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r && r.ok === false) say(r.pending ? 'Σε αναμονή έγκρισης' : 'Δεν έγινε', r.error);
      else say(okMsg);
    } catch (e: any) { say('Κάτι πήγε στραβά', e.message); }
    setBusy(null); load();
  };

  /* Όπως στο γυμναστήριο: αν έχει ήδη δηλώσει ενδιαφέρον για άλλη ώρα
     της ίδιας μέρας, ρωτάμε αν η νέα κράτηση είναι η εναλλακτική. */
  const book = (sv: Service, t: string, d = date) => {
    const open = mine.waitlist.find((w: any) => w.service_id === sv.id && w.date === d && w.time !== t);
    const go = async (backup: string | null) => {
      setBusy(sv.id + t);
      try {
        const r = await rpc('create_booking', { p_service: sv.id, p_date: d, p_time: t, p_backup_for: backup });
        if (r && r.ok === false) say(r.pending ? 'Σε αναμονή έγκρισης' : 'Δεν έγινε', r.error);
        else router.push({ pathname: '/booked', params: { biz: biz.name, service: sv.name, date: d, time: t, color: st!.color } });
      } catch (e: any) { say('Κάτι πήγε στραβά', e.message); }
      setBusy(null); load();
    };
    if (!open) return go(null);
    say('Είναι εναλλακτική;', `Έχεις δηλώσει ενδιαφέρον για τις ${open.time}. Αν ελευθερωθεί θέση εκεί, να ακυρωθεί αυτόματα η κράτηση των ${t};`,
      [{ text: 'Ναι, εναλλακτική', onPress: () => go(open.id) }, { text: 'Όχι, θέλω και τις δύο', onPress: () => go(null) }]);
  };
  const wait = (sv: Service, t: string) => {
    const same = mine.bookings.find((b: any) => b.service_id === sv.id && b.date === date && b.status === 'booked');
    const go = (backup: string | null) => act(sv.id + t, () => rpc('join_waitlist', { p_service: sv.id, p_date: date, p_time: t, p_backup_booking: backup }), `Δήλωσες ενδιαφέρον για τις ${t} 🙋 Αν ελευθερωθεί θέση, σου κλείνεται αυτόματα.`);
    if (!same) return go(null);
    say('Δήλωση ενδιαφέροντος', `Αν ελευθερωθεί θέση στις ${t}, να ακυρωθεί η κράτηση των ${same.time};`,
      [{ text: `Ναι, ακύρωσε τις ${same.time}`, onPress: () => go(same.id) }, { text: 'Όχι, κράτα και τις δύο', onPress: () => go(null) }]);
  };

  if (!biz || !st) return <View style={s.screen} />;
  const brand = st.color, r = st.radius;
  const today = days[0];
  const state = (sl: Slot) => (myAt(sl.sv, date, sl.time) ? 'mine' : waitAt(sl.sv, sl.time) ? 'wait' : sl.free > 0 ? 'free' : 'full');

  /* Μία γραμμή για κάθε ώρα (όπως στο γυμναστήριο): ώρα · κατάσταση/πληρότητα · κουμπί. */
  const SlotRow = ({ sl, last }: { sl: Slot; last: boolean }) => {
    const stt = state(sl), dis = busy === sl.sv.id + sl.time;
    const used = sl.capacity - sl.free, pct = Math.min(1, used / Math.max(1, sl.capacity));
    const status = stt === 'mine' ? 'Η κράτησή σου ✓' : stt === 'wait' ? 'Σε λίστα ενδιαφέροντος' : stt === 'full' ? 'Γεμάτο'
      : sl.capacity > 1 ? `${sl.free} ${sl.free === 1 ? 'ελεύθερη θέση' : 'ελεύθερες θέσεις'}` : 'Ελεύθερο';
    const barColor = stt === 'mine' ? brand : stt === 'full' ? C.bad : pct >= 0.75 ? '#f59e0b' : C.ok;
    const btn = stt === 'mine'
      ? <Btn size="sm" kind="danger" title="Ακύρωση" disabled={dis} onPress={() => act(sl.sv.id + sl.time, () => rpc('cancel_booking', { p_booking: myAt(sl.sv, date, sl.time).id }), 'Η κράτηση ακυρώθηκε')} />
      : stt === 'wait'
      ? <Btn size="sm" kind="ghost" title="Απόσυρση" disabled={dis} onPress={() => act(sl.sv.id + sl.time, () => rpc('leave_waitlist', { p_service: sl.sv.id, p_date: date, p_time: sl.time + ':00' }), 'Η δήλωση αποσύρθηκε')} />
      : stt === 'free'
      ? <Btn size="sm" title="Κράτηση" color={brand} disabled={dis} onPress={() => book(sl.sv, sl.time)} />
      : <Btn size="sm" kind="tint" color={brand} title="🙋 Αναμονή" disabled={dis} onPress={() => wait(sl.sv, sl.time)} />;
    return (
      <View style={[s.row, { gap: 14, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: stt === 'mine' ? alpha(brand, 0.08) : 'transparent' },
        !last && { borderBottomWidth: 1, borderBottomColor: alpha(C.text, 0.08) }]}>
        <View style={{ width: 62 }}>
          <Text style={{ color: stt === 'full' ? C.mute : C.text, fontWeight: '900', fontSize: 19, letterSpacing: -0.4 }}>{sl.time}</Text>
          <Text style={{ color: C.mute, fontSize: 11 }}>έως {endOf(sl.time, sl.sv.duration_min)}</Text>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          {layout === 'classes' && <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{sl.sv.name}</Text>}
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: stt === 'mine' || stt === 'wait' ? brand : stt === 'full' ? C.bad : layout === 'classes' ? C.mute : C.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{status}</Text>
            {sl.capacity > 1 && <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700' }}>{used}/{sl.capacity}</Text>}
          </View>
          {sl.capacity > 1 && (
            <View style={{ height: 6, borderRadius: 3, backgroundColor: alpha(C.text, 0.08), overflow: 'hidden' }}>
              <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: barColor }} />
            </View>
          )}
        </View>
        {btn}
      </View>
    );
  };

  const Slots = ({ empty }: { empty: string }) => slots.length === 0
    ? <Empty emoji="🗓️" title={layout === 'classes' ? 'Δεν υπάρχουν μαθήματα' : 'Δεν υπάρχουν ώρες'} text={empty} />
    : <View style={{ borderRadius: r + 4, overflow: 'hidden' }}><Group>{slots.map((sl, i) => <SlotRow key={sl.sv.id + sl.time} sl={sl} last={i === slots.length - 1} />)}</Group></View>;

  const DayPick = () => <>
    <DayStrip days={days} value={date} onChange={setDate} color={brand} />
    {!!note && (
      <View style={[s.row, { backgroundColor: alpha(brand, 0.08), borderRadius: r, padding: 12, gap: 10 }]}>
        <Text style={{ fontSize: 16 }}>📌</Text><Text style={{ flex: 1, color: C.text }}>{note}</Text>
      </View>
    )}
  </>;

  const Radio = ({ on }: { on: boolean }) => (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? brand : alpha(C.text, 0.2), alignItems: 'center', justifyContent: 'center' }}>
      {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brand }} />}
    </View>
  );

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={[s.pad, { paddingTop: 0 }]}>
        <BizHeader biz={biz} header={st.header} color={brand} radius={r} />

        {!!(biz.address || biz.phone) && (
          <View style={{ borderRadius: r + 4, overflow: 'hidden' }}><Group>
            {!!biz.address && <Row icon="pin" color={brand} title={biz.address} sub={biz.city} last={!biz.phone} />}
            {!!biz.phone && <Row icon="phone" color={brand} title={biz.phone} sub="Τηλέφωνο" last />}
          </Group></View>
        )}

        {services.length === 0 && <Empty emoji="🛠️" title="Δεν υπάρχουν ακόμα υπηρεσίες" text="Το κατάστημα δεν έχει ανοίξει κρατήσεις." />}

        {/* ---------- Πρόγραμμα μαθημάτων (γυμναστήριο, pilates) ---------- */}
        {layout === 'classes' && services.length > 0 && <>
          <Section title="Πρόγραμμα" sub={date === today ? 'Σήμερα' : fmtLong(date)} />
          <DayPick />
          <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
            {services.map((sv) => (
              <View key={sv.id} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: alpha(brand, 0.1) }}>
                <Text style={{ color: brand, fontSize: 12, fontWeight: '700' }}>{sv.name} · {sv.duration_min}′{sv.price_cents != null ? ` · ${price(sv.price_cents)}` : ''}</Text>
              </View>
            ))}
          </View>
          <Slots empty="Δεν γίνονται μαθήματα αυτή τη μέρα. Διάλεξε άλλη μέρα." />
        </>}

        {/* ---------- Ραντεβού (γιατρός, οδοντίατρος, φυσικοθεραπεία) ---------- */}
        {layout === 'appointment' && services.length > 0 && <>
          <Section title="Τύπος ραντεβού" />
          <View style={{ borderRadius: r + 4, overflow: 'hidden' }}><Group>
            {services.map((sv, i) => (
              <Pressable key={sv.id} onPress={() => setService(sv)}
                style={[s.row, { gap: 12, padding: 14, backgroundColor: service?.id === sv.id ? alpha(brand, 0.07) : 'transparent' },
                  i < services.length - 1 && { borderBottomWidth: 1, borderBottomColor: alpha(C.text, 0.08) }]}>
                <Radio on={service?.id === sv.id} />
                <Text style={{ flex: 1, color: C.text, fontWeight: '700', fontSize: 15 }}>{sv.name}</Text>
                <Text style={{ color: C.mute, fontSize: 13 }}>{sv.duration_min}′{sv.price_cents != null ? ` · ${price(sv.price_cents)}` : ''}</Text>
              </Pressable>
            ))}
          </Group></View>

          {service && (
            <View style={{ backgroundColor: alpha(brand, 0.08), borderRadius: r + 4, padding: 16, gap: 12, borderWidth: 1, borderColor: alpha(brand, 0.25) }}>
              <View style={[s.row, { gap: 10 }]}>
                <Icon name="clock" size={18} color={brand} />
                <Text style={{ color: brand, fontWeight: '800', fontSize: 13, letterSpacing: 0.3 }}>ΕΠΟΜΕΝΟ ΔΙΑΘΕΣΙΜΟ</Text>
              </View>
              {next === undefined ? <Text style={{ color: C.mute }}>Αναζήτηση…</Text>
                : next === null ? <Text style={{ color: C.mute }}>Δεν υπάρχει ελεύθερο ραντεβού τις επόμενες μέρες.</Text>
                : <View style={[s.row, { gap: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontWeight: '900', fontSize: 22, letterSpacing: -0.5 }}>{next.date === today ? 'Σήμερα' : fmtLong(next.date)} · {next.time}</Text>
                      <Text style={{ color: C.mute, fontSize: 13 }}>{service.name} · {service.duration_min} λεπτά</Text>
                    </View>
                    <Btn title="Κλείσε το" color={brand} disabled={busy === service.id + next.time} onPress={() => book(service, next.time, next.date)} />
                  </View>}
            </View>
          )}

          <Section title="Ή διάλεξε μέρα και ώρα" sub={date === today ? 'Σήμερα' : fmtLong(date)} />
          <DayPick />
          <Slots empty="Δεν υπάρχουν ραντεβού αυτή τη μέρα. Διάλεξε άλλη μέρα." />
        </>}

        {/* ---------- Κατάλογος υπηρεσιών (κομμωτήριο, νύχια, spa…) ---------- */}
        {layout === 'menu' && services.length > 0 && <>
          <Section title="Υπηρεσίες" />
          <View style={{ gap: 10 }}>
            {services.map((sv) => {
              const on = service?.id === sv.id;
              return (
                <Pressable key={sv.id} onPress={() => setService(sv)}
                  style={({ pressed }) => [s.row, { gap: 14, padding: 16, borderRadius: r + 4, backgroundColor: on ? alpha(brand, 0.08) : C.card,
                    borderWidth: on ? 2 : 1, borderColor: on ? brand : alpha(C.text, 0.1), transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{sv.name}</Text>
                    <View style={[s.row, { gap: 5 }]}>
                      <Icon name="clock" size={13} color={C.mute} />
                      <Text style={{ color: C.mute, fontSize: 13 }}>{sv.duration_min} λεπτά{sv.capacity > 1 ? ` · έως ${sv.capacity} άτομα` : ''}</Text>
                    </View>
                  </View>
                  {sv.price_cents != null && <Text style={{ color: on ? brand : C.text, fontWeight: '900', fontSize: 20 }}>{price(sv.price_cents)}</Text>}
                  {on && <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: brand, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={14} color={onColor(brand)} /></View>}
                </Pressable>
              );
            })}
          </View>
          <Section title="Μέρα & ώρα" sub={service ? `${service.name} · ${date === today ? 'Σήμερα' : fmtLong(date)}` : undefined} />
          <DayPick />
          <Slots empty="Διάλεξε άλλη μέρα για να δεις διαθεσιμότητα." />
        </>}
      </ScrollView>
    </View>
  );
}
