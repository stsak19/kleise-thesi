import { say } from '../../../../lib/alert';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rpc, sb } from '../../../../lib/supabase';
import { Btn, C, DAYS, Icon, MONTHS, alpha, fmtLong, iso, onColor, price, s, shadow } from '../../../../lib/ui';
import { NIGHT } from '../../../../lib/theme';
import { styleOf } from '../../../../lib/presets';
import { Fact, screenFor } from '../../../../lib/bizscreen';
import { Photo, Scrim } from '../../../../lib/Photo';

type Service = { id: string; name: string; duration_min: number; price_cents: number | null; capacity: number };
type Slot = { sv: Service; time: string; capacity: number; taken: number; free: number };
type Hours = { weekday: number; opens: string; closes: string; service_id: string | null };

const endOf = (t: string, min: number) => {
  const [h, m] = t.split(':').map(Number); const e = h * 60 + m + min;
  return `${String(Math.floor(e / 60) % 24).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
};
const avail = async (sv: Service, date: string): Promise<Slot[]> =>
  ((await rpc<any[]>('day_availability', { p_service: sv.id, p_date: date })) ?? [])
    .map((x) => ({ sv, time: x.slot_time.slice(0, 5), capacity: x.capacity, taken: x.taken, free: x.free }));
const lum = (hex: string) => { const h = hex.replace('#', ''); return h.length < 6 ? 0 : 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16); };
const WEEK = [1, 2, 3, 4, 5, 6, 0];
// Κεφαλαία στα ελληνικά χωρίς τόνους (ΓΥΜΝΑΣΤΗΡΙΟ, όχι ΓΥΜΝΑΣΤΉΡΙΟ).
const upper = (x: string) => x.normalize('NFD').replace(/\u0301/g, '').normalize('NFC').toUpperCase();
// 07:00 → 7, 18:30 → 18:30 (για τα γρήγορα στοιχεία, που έχουν λίγο χώρο).
const hm = (t: string) => { const [h, m] = t.slice(0, 5).split(':'); return m === '00' ? String(Number(h)) : `${Number(h)}:${m}`; };
const DAY_FULL = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

/* Σελίδα καταστήματος. Κάθε είδος επιχείρησης έχει τη δική του οθόνη (lib/bizscreen.ts):
   φωτογραφία από άκρη σε άκρη, προφίλ, ιατρείο ή σκούρα σελίδα με τιμοκατάλογο.
   Η ροή κράτησης έρχεται από τη διάταξη (lib/presets.ts):
   classes = πρόγραμμα μαθημάτων της μέρας · appointment = επόμενο διαθέσιμο ραντεβού · menu = κατάλογος υπηρεσιών. */
export default function Business() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const top = useSafeAreaInsets().top;
  const [biz, setBiz] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [hours, setHours] = useState<Hours[]>([]);
  const [date, setDate] = useState(iso(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mine, setMine] = useState<any>({ bookings: [], waitlist: [] });
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [next, setNext] = useState<{ date: string; time: string } | null | undefined>(undefined);
  const [pick, setPick] = useState<string | null>(null);   // επιλεγμένη ώρα στο πλέγμα
  const [only, setOnly] = useState<string | null>(null);   // φίλτρο τμήματος στο πρόγραμμα
  const [gridW, setGridW] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: sv }, { data: h }] = await Promise.all([
        sb.from('businesses').select('*').eq('id', id).single(),
        sb.from('services').select('*').eq('business_id', id).eq('active', true).order('name'),
        sb.from('opening_hours').select('*').eq('business_id', id),
      ]);
      setBiz(b); setHours((h ?? []).filter((x: Hours) => !x.service_id));
      setServices(sv ?? []); if (sv?.length) setService(sv[0]);
    })();
  }, [id]);

  const st = biz ? styleOf(biz) : null;
  const layout = st?.layout;
  const scr = screenFor(biz?.category);

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
  useEffect(() => setPick(null), [date, service]);

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
    setBusy(null); setPick(null); load();
  };

  /* Αν έχει ήδη δηλώσει ενδιαφέρον για άλλη ώρα της ίδιας μέρας,
     ρωτάμε αν η νέα κράτηση είναι η εναλλακτική. */
  const book = (sv: Service, t: string, d = date) => {
    const open = mine.waitlist.find((w: any) => w.service_id === sv.id && w.date === d && w.time !== t);
    const go = async (backup: string | null) => {
      setBusy(sv.id + t);
      try {
        const r = await rpc('create_booking', { p_service: sv.id, p_date: d, p_time: t, p_backup_for: backup });
        if (r && r.ok === false) say(r.pending ? 'Σε αναμονή έγκρισης' : 'Δεν έγινε', r.error);
        else router.push({ pathname: '/booked', params: { biz: biz.name, service: sv.name, date: d, time: t, color: accent } });
      } catch (e: any) { say('Κάτι πήγε στραβά', e.message); }
      setBusy(null); setPick(null); load();
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
  const cancel = (sl: Slot) => act(sl.sv.id + sl.time, () => rpc('cancel_booking', { p_booking: myAt(sl.sv, date, sl.time).id }), 'Η κράτηση ακυρώθηκε');
  const unwait = (sl: Slot) => act(sl.sv.id + sl.time, () => rpc('leave_waitlist', { p_service: sl.sv.id, p_date: date, p_time: sl.time + ':00' }), 'Η δήλωση αποσύρθηκε');

  const night = scr.hero === 'night';
  const brand = st?.color ?? C.accent;
  // Στη σκούρα σελίδα ένα σκούρο χρώμα καταστήματος δεν θα φαινόταν: τότε τονίζουμε με λευκό.
  const accent = night && lum(brand) < 110 ? NIGHT.text : brand;
  const P = night ? NIGHT : { bg: C.bg, card: C.card, line: alpha(C.text, 0.08), text: C.text, mute: C.mute };

  if (!biz || !st) return <View style={[s.screen, night && { backgroundColor: NIGHT.bg }]}><Stack.Screen options={{ headerShown: false }} /></View>;
  const r = st.radius;
  const today = days[0];
  const state = (sl: Slot) => (myAt(sl.sv, date, sl.time) ? 'mine' : waitAt(sl.sv, sl.time) ? 'wait' : sl.free > 0 ? 'free' : 'full');
  const dayLabel = (d: string) => (d === today ? 'Σήμερα' : fmtLong(d));
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /* ---------- γρήγορα στοιχεία ---------- */
  const todayHours = hours.filter((h) => h.weekday === new Date().getDay()).sort((a, z) => a.opens.localeCompare(z.opens));
  const prices = services.map((x) => x.price_cents).filter((x): x is number => x != null);
  const durs = services.map((x) => x.duration_min);
  const factOf = (f: Fact): { v: string; l: string } | null => {
    if (f === 'open') return !hours.length ? null : todayHours.length
      ? { v: `${hm(todayHours[0].opens)}–${hm(todayHours[todayHours.length - 1].closes)}`, l: 'σήμερα' } : { v: 'Κλειστά', l: 'σήμερα' };
    if (f === 'from') return prices.length ? { v: price(Math.min(...prices)), l: prices.length > 1 ? 'από' : 'τιμή' } : null;
    if (f === 'count') return services.length ? { v: String(services.length), l: scr.unit } : null;
    if (f === 'group') { const m = Math.max(0, ...services.map((x) => x.capacity)); return m > 1 ? { v: `έως ${m}`, l: 'άτομα/τμήμα' } : null; }
    if (f === 'duration') { if (!durs.length) return null; const a = Math.min(...durs), z = Math.max(...durs); return { v: a === z ? `${a}′` : `${a}–${z}′`, l: 'διάρκεια' }; }
    return null;
  };
  const facts = scr.facts.map(factOf).filter(Boolean).slice(0, 3) as { v: string; l: string }[];

  const call = () => biz.phone && Linking.openURL(`tel:${String(biz.phone).replace(/\s/g, '')}`);
  const directions = () => {
    const q = encodeURIComponent([biz.address, biz.city].filter(Boolean).join(', '));
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  /* ---------- κορυφή: μία για κάθε είδος ---------- */
  const BackBtn = ({ light }: { light: boolean }) => (
    <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Πίσω"
      style={({ pressed }) => ({ position: 'absolute', top: top + 10, left: 14, zIndex: 5, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: light ? alpha('#000000', 0.35) : alpha(P.text, 0.06), opacity: pressed ? 0.7 : 1 })}>
      <Icon name="back" size={20} color={light ? '#ffffff' : P.text} />
    </Pressable>
  );
  const Logo = ({ size, round }: { size: number; round?: boolean }) => (
    <View style={{ width: size, height: size, borderRadius: round ? size / 2 : r + 2, backgroundColor: '#ffffff', padding: round ? 4 : 3, ...shadow(2) }}>
      <Photo uri={biz.logo_url} color={brand} letter={(biz.name || 'Κ').slice(0, 1)} style={{ borderRadius: round ? size / 2 : r }} />
    </View>
  );
  const where = [biz.city, biz.address].filter(Boolean).join(' · ');

  const Hero = () => {
    if (scr.hero === 'profile') return (
      <View>
        <View style={{ height: top + 150, backgroundColor: brand, overflow: 'hidden' }}>
          <Photo uri={biz.cover_url} color={brand} />
          <Scrim strength={0.55} />
        </View>
        <BackBtn light />
        <View style={{ alignItems: 'center', marginTop: -62, gap: 6, paddingHorizontal: 20 }}>
          <View style={{ width: 124, height: 124, borderRadius: 62, backgroundColor: P.bg, padding: 5 }}>
            <Photo uri={biz.logo_url} color={brand} letter={(biz.name || 'Κ').slice(0, 1)} style={{ borderRadius: 60 }} />
          </View>
          <Text style={{ color: brand, fontWeight: '800', fontSize: 13, letterSpacing: 0.6, marginTop: 4 }}>{upper(scr.kicker)}</Text>
          <Text style={{ color: P.text, fontWeight: '900', fontSize: 26, letterSpacing: -0.6, textAlign: 'center' }}>{biz.name}</Text>
          {!!where && <Text style={{ color: P.mute, fontSize: 14 }}>{where}</Text>}
        </View>
      </View>
    );
    if (scr.hero === 'clinic') return (
      <View style={{ paddingTop: top + 62, paddingHorizontal: 20, gap: 16 }}>
        <BackBtn light={false} />
        <View style={[s.row, { gap: 16, alignItems: 'center' }]}>
          <Logo size={76} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: brand, fontWeight: '800', fontSize: 13, letterSpacing: 0.4 }}>{scr.kicker}</Text>
            <Text style={{ color: P.text, fontWeight: '900', fontSize: 24, letterSpacing: -0.5 }} numberOfLines={2}>{biz.name}</Text>
            {!!where && <Text style={{ color: P.mute, fontSize: 14 }} numberOfLines={1}>{where}</Text>}
          </View>
        </View>
        {!!biz.cover_url && (
          <View style={{ height: 140, borderRadius: r + 4, overflow: 'hidden', backgroundColor: alpha(brand, 0.1) }}><Photo uri={biz.cover_url} color={brand} /></View>
        )}
      </View>
    );
    // photo & night: μεγάλη φωτογραφία από άκρη σε άκρη, με το όνομα πάνω της
    const h = night ? 300 : 340;
    return (
      <View style={{ height: top + h, backgroundColor: night ? NIGHT.card : brand }}>
        <Photo uri={biz.cover_url} color={night ? NIGHT.card : brand} />
        <Scrim strength={night ? 0.95 : 0.7} />
        <BackBtn light />
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20, gap: 10 }}>
          <View style={[s.row, { gap: 12 }]}>
            <Logo size={night ? 52 : 58} round={night} />
            <Text style={{ color: night ? accent : '#ffffff', fontWeight: '800', fontSize: 13, letterSpacing: 1, opacity: night ? 1 : 0.9 }}>{upper(scr.kicker)}</Text>
          </View>
          <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: night ? 34 : 32, letterSpacing: night ? 0.5 : -0.8, lineHeight: night ? 38 : 36 }}
            numberOfLines={2}>{night ? upper(String(biz.name)) : biz.name}</Text>
          {!!where && (
            <View style={[s.row, { gap: 6 }]}>
              <Icon name="pin" size={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', opacity: 0.9, fontSize: 14 }} numberOfLines={1}>{where}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  /* ---------- μικρά κομμάτια ---------- */
  const H2 = ({ title, sub }: { title: string; sub?: string }) => (
    <View style={{ marginTop: 18, gap: 2 }}>
      <Text style={{ color: P.text, fontSize: night ? 15 : 20, fontWeight: '900', letterSpacing: night ? 1.4 : -0.4 }}>{night ? upper(title) : title}</Text>
      {!!sub && <Text style={{ color: P.mute, fontSize: 14 }}>{sub}</Text>}
    </View>
  );
  const Box = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[{ backgroundColor: P.card, borderRadius: r + 4, overflow: 'hidden' }, !night && shadow(1), style]}>{children}</View>
  );
  const Nothing = ({ text }: { text: string }) => (
    <Box style={{ padding: 22, alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 26 }}>🗓️</Text>
      <Text style={{ color: P.mute, textAlign: 'center', fontSize: 14 }}>{text}</Text>
    </Box>
  );

  const Days = () => (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 4 }}>
        {days.map((d) => {
          const dd = new Date(d + 'T00:00'), on = d === date;
          return (
            <Pressable key={d} onPress={() => setDate(d)}
              style={({ pressed }) => [{ width: 56, paddingVertical: 10, borderRadius: r + 4, alignItems: 'center', gap: 2, borderWidth: 1 },
                on ? { backgroundColor: accent, borderColor: accent } : { backgroundColor: P.card, borderColor: P.line },
                { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <Text style={{ color: on ? onColor(accent) : P.mute, fontSize: 12, fontWeight: '600' }}>{d === today ? 'Σήμ.' : DAYS[dd.getDay()]}</Text>
              <Text style={{ color: on ? onColor(accent) : P.text, fontWeight: '800', fontSize: 19 }}>{dd.getDate()}</Text>
              <Text style={{ color: on ? onColor(accent) : P.mute, fontSize: 11 }}>{MONTHS[dd.getMonth()]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!!note && (
        <View style={[s.row, { backgroundColor: alpha(accent, 0.1), borderRadius: r, padding: 12, gap: 10 }]}>
          <Text style={{ fontSize: 16 }}>📌</Text><Text style={{ flex: 1, color: P.text }}>{note}</Text>
        </View>
      )}
    </>
  );

  /* Πρόγραμμα μαθημάτων: μία γραμμή για κάθε τμήμα, με πληρότητα. */
  const ClassRow = ({ sl, last }: { sl: Slot; last: boolean }) => {
    const stt = state(sl), dis = busy === sl.sv.id + sl.time;
    const used = sl.capacity - sl.free, pct = Math.min(1, used / Math.max(1, sl.capacity));
    const status = stt === 'mine' ? 'Η κράτησή σου ✓' : stt === 'wait' ? 'Σε λίστα ενδιαφέροντος' : stt === 'full' ? 'Γεμάτο'
      : sl.capacity > 1 ? `${sl.free} ${sl.free === 1 ? 'ελεύθερη' : 'ελεύθερες'}` : 'Ελεύθερο';
    const barColor = stt === 'mine' ? accent : stt === 'full' ? C.bad : pct >= 0.75 ? '#f59e0b' : C.ok;
    const btn = stt === 'mine' ? <Btn size="sm" kind="danger" title="Ακύρωση" disabled={dis} onPress={() => cancel(sl)} />
      : stt === 'wait' ? <Btn size="sm" kind="ghost" title="Απόσυρση" disabled={dis} onPress={() => unwait(sl)} />
      : stt === 'free' ? <Btn size="sm" title="Κράτηση" color={accent} disabled={dis} onPress={() => book(sl.sv, sl.time)} />
      : <Btn size="sm" kind="tint" color={accent} title="🙋 Αναμονή" disabled={dis} onPress={() => wait(sl.sv, sl.time)} />;
    return (
      <View style={[s.row, { gap: 12, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: stt === 'mine' ? alpha(accent, 0.08) : 'transparent' },
        !last && { borderBottomWidth: 1, borderBottomColor: P.line }]}>
        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: stt === 'full' ? P.line : accent }} />
        <View style={{ width: 60 }}>
          <Text style={{ color: stt === 'full' ? P.mute : P.text, fontWeight: '900', fontSize: 18, letterSpacing: -0.4 }}>{sl.time}</Text>
          <Text style={{ color: P.mute, fontSize: 11 }}>έως {endOf(sl.time, sl.sv.duration_min)}</Text>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: P.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{sl.sv.name}</Text>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: stt === 'mine' || stt === 'wait' ? accent : stt === 'full' ? C.bad : P.mute, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{status}</Text>
            {sl.capacity > 1 && <Text style={{ color: P.mute, fontSize: 12, fontWeight: '700' }}>{used}/{sl.capacity}</Text>}
          </View>
          {sl.capacity > 1 && (
            <View style={{ height: 6, borderRadius: 3, backgroundColor: P.line, overflow: 'hidden' }}>
              <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: barColor }} />
            </View>
          )}
        </View>
        {btn}
      </View>
    );
  };

  /* Ραντεβού και κατάλογος: οι ώρες ως πλέγμα, χωρισμένες σε πρωί / μεσημέρι / απόγευμα.
     Πατάς μια ώρα και η ενέργεια εμφανίζεται στη μπάρα κάτω. */
  const cols = 4, gap = 8, chipW = gridW ? Math.floor((gridW - gap * (cols - 1)) / cols) : 0;
  const parts = [
    { name: 'Πρωί', test: (t: string) => t < '12:00' },
    { name: 'Μεσημέρι', test: (t: string) => t >= '12:00' && t < '17:00' },
    { name: 'Απόγευμα', test: (t: string) => t >= '17:00' },
  ];
  const TimeGrid = () => (
    <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)} style={{ gap: 14 }}>
      {!!chipW && parts.map((p) => {
        const list = slots.filter((x) => p.test(x.time));
        if (!list.length) return null;
        return (
          <View key={p.name} style={{ gap: 8 }}>
            <Text style={{ color: P.mute, fontSize: 13, fontWeight: '700' }}>{p.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {list.map((sl) => {
                const stt = state(sl), key = sl.sv.id + sl.time, on = pick === key;
                const bg = stt === 'mine' ? accent : on ? alpha(accent, 0.12) : stt === 'wait' ? alpha(accent, 0.1) : stt === 'full' ? 'transparent' : P.card;
                const fg = stt === 'mine' ? onColor(accent) : stt === 'full' ? P.mute : on || stt === 'wait' ? accent : P.text;
                return (
                  <Pressable key={key} onPress={() => setPick(on ? null : key)}
                    style={({ pressed }) => ({ width: chipW, paddingVertical: 12, borderRadius: r, alignItems: 'center', backgroundColor: bg,
                      borderWidth: on ? 2 : 1, borderColor: on ? accent : stt === 'mine' ? accent : P.line, opacity: pressed ? 0.75 : 1,
                      borderStyle: stt === 'full' ? 'dashed' : 'solid' })}>
                    <Text style={{ color: fg, fontWeight: '800', fontSize: 16, textDecorationLine: stt === 'full' ? 'line-through' : 'none' }}>{sl.time}</Text>
                    {stt === 'mine' && <Text style={{ color: fg, fontSize: 10, fontWeight: '700' }}>δική σου</Text>}
                    {stt === 'wait' && <Text style={{ color: fg, fontSize: 10, fontWeight: '700' }}>αναμονή</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
  const picked = slots.find((x) => x.sv.id + x.time === pick) ?? null;

  /* ---------- υπηρεσίες ---------- */
  const PriceList = () => (   // σκούρα σελίδα: τιμοκατάλογος με τελείες
    <Box>
      {services.map((sv, i) => {
        const on = service?.id === sv.id;
        return (
          <Pressable key={sv.id} onPress={() => setService(sv)}
            style={[{ padding: 16, gap: 4, backgroundColor: on ? alpha(accent, 0.1) : 'transparent' }, i < services.length - 1 && { borderBottomWidth: 1, borderBottomColor: P.line }]}>
            <View style={[s.row, { gap: 10 }]}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? accent : P.mute, alignItems: 'center', justifyContent: 'center' }}>
                {on && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />}
              </View>
              <Text style={{ color: P.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{sv.name}</Text>
              <View style={{ flex: 1, borderBottomWidth: 2, borderStyle: 'dotted', borderColor: P.line, marginTop: 10 }} />
              <Text style={{ color: on ? accent : P.text, fontWeight: '900', fontSize: 17 }}>{sv.price_cents != null ? price(sv.price_cents) : '—'}</Text>
            </View>
            <Text style={{ color: P.mute, fontSize: 13, marginLeft: 28 }}>{sv.duration_min} λεπτά</Text>
          </Pressable>
        );
      })}
    </Box>
  );
  const Radios = () => (     // ραντεβού: ήρεμη λίστα επιλογής
    <Box>
      {services.map((sv, i) => {
        const on = service?.id === sv.id;
        return (
          <Pressable key={sv.id} onPress={() => setService(sv)}
            style={[s.row, { gap: 12, padding: 15, backgroundColor: on ? alpha(accent, 0.07) : 'transparent' }, i < services.length - 1 && { borderBottomWidth: 1, borderBottomColor: P.line }]}>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? accent : alpha(P.text, 0.2), alignItems: 'center', justifyContent: 'center' }}>
              {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} />}
            </View>
            <Text style={{ flex: 1, color: P.text, fontWeight: '700', fontSize: 15 }}>{sv.name}</Text>
            <Text style={{ color: P.mute, fontSize: 13 }}>{sv.duration_min}′{sv.price_cents != null ? ` · ${price(sv.price_cents)}` : ''}</Text>
          </Pressable>
        );
      })}
    </Box>
  );
  const Cards = () => (      // κατάλογος: κάρτες με τιμή
    <View style={{ gap: 10 }}>
      {services.map((sv) => {
        const on = service?.id === sv.id;
        return (
          <Pressable key={sv.id} onPress={() => setService(sv)}
            style={({ pressed }) => [s.row, { gap: 14, padding: 16, borderRadius: r + 4, backgroundColor: on ? alpha(accent, 0.08) : P.card,
              borderWidth: on ? 2 : 1, borderColor: on ? accent : P.line, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: P.text, fontWeight: '800', fontSize: 16 }}>{sv.name}</Text>
              <View style={[s.row, { gap: 5 }]}>
                <Icon name="clock" size={13} color={P.mute} />
                <Text style={{ color: P.mute, fontSize: 13 }}>{sv.duration_min} λεπτά{sv.capacity > 1 ? ` · έως ${sv.capacity} άτομα` : ''}</Text>
              </View>
            </View>
            {sv.price_cents != null && <Text style={{ color: on ? accent : P.text, fontWeight: '900', fontSize: 20 }}>{price(sv.price_cents)}</Text>}
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: on ? accent : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: P.line, alignItems: 'center', justifyContent: 'center' }}>
              {on && <Icon name="check" size={14} color={onColor(accent)} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const shown = layout === 'classes' && only ? slots.filter((x) => x.sv.id === only) : slots;

  return (
    <View style={[s.screen, { backgroundColor: P.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: picked ? 130 : 40 }}>
        {Hero()}

        <View style={{ paddingHorizontal: 20, gap: 12, paddingTop: 18 }}>
          {/* γρήγορα στοιχεία */}
          {facts.length > 0 && (
            <View style={[s.row, { gap: 8, alignItems: 'stretch' }]}>
              {facts.map((f) => (
                <View key={f.l} style={{ flex: 1, backgroundColor: night ? P.card : alpha(brand, 0.07), borderRadius: r + 2, paddingVertical: 12, paddingHorizontal: 10, gap: 2 }}>
                  <Text style={{ color: P.text, fontWeight: '900', fontSize: 16 }} numberOfLines={1}>{f.v}</Text>
                  <Text style={{ color: P.mute, fontSize: 12 }} numberOfLines={1}>{f.l}</Text>
                </View>
              ))}
            </View>
          )}

          {/* κλήση / οδηγίες */}
          {!!(biz.phone || biz.address) && (
            <View style={[s.row, { gap: 8 }]}>
              {!!biz.phone && <Btn kind="tint" color={accent} icon="phone" title="Κλήση" onPress={call} style={{ flex: 1, minHeight: 46 }} />}
              {!!biz.address && <Btn kind="tint" color={accent} icon="pin" title="Οδηγίες" onPress={directions} style={{ flex: 1, minHeight: 46 }} />}
            </View>
          )}

          {!!biz.description && scr.hero !== 'clinic' && <Text style={{ color: P.mute, fontSize: 15, lineHeight: 22 }}>{biz.description}</Text>}
          {!!biz.description && scr.hero === 'clinic' && (
            <Box style={{ padding: 16, gap: 4, borderLeftWidth: 4, borderLeftColor: brand }}>
              <Text style={{ color: P.text, fontWeight: '800' }}>Σχετικά</Text>
              <Text style={{ color: P.mute, fontSize: 15, lineHeight: 22 }}>{biz.description}</Text>
            </Box>
          )}

          {services.length === 0 && <Nothing text="Το κατάστημα δεν έχει ανοίξει ακόμα κρατήσεις." />}

          {/* ---------- Πρόγραμμα μαθημάτων ---------- */}
          {layout === 'classes' && services.length > 0 && <>
            <H2 title={scr.times} sub={dayLabel(date)} />
            {Days()}
            {services.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
                {[{ id: null as string | null, name: 'Όλα' }, ...services].map((x) => {
                  const on = only === x.id;
                  return (
                    <Pressable key={x.id ?? 'all'} onPress={() => setOnly(x.id)}
                      style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: on ? accent : alpha(accent, 0.1) }}>
                      <Text style={{ color: on ? onColor(accent) : accent, fontSize: 13, fontWeight: '800' }}>{x.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {shown.length === 0 ? <Nothing text="Δεν γίνονται μαθήματα αυτή τη μέρα. Διάλεξε άλλη μέρα." />
              : <Box>{shown.map((sl, i) => <ClassRow key={sl.sv.id + sl.time} sl={sl} last={i === shown.length - 1} />)}</Box>}
            <H2 title={scr.services} />
            <Box>
              {services.map((sv, i) => (
                <View key={sv.id} style={[s.row, { padding: 14, gap: 10 }, i < services.length - 1 && { borderBottomWidth: 1, borderBottomColor: P.line }]}>
                  <Text style={{ flex: 1, color: P.text, fontWeight: '700', fontSize: 15 }}>{sv.name}</Text>
                  <Text style={{ color: P.mute, fontSize: 13 }}>{sv.duration_min}′ · έως {sv.capacity} άτομα{sv.price_cents != null ? ` · ${price(sv.price_cents)}` : ''}</Text>
                </View>
              ))}
            </Box>
          </>}

          {/* ---------- Ραντεβού ---------- */}
          {layout === 'appointment' && services.length > 0 && <>
            <H2 title={scr.services} />
            {night ? PriceList() : Radios()}
            {service && (
              <View style={{ backgroundColor: accent, borderRadius: r + 4, padding: 18, gap: 12 }}>
                <View style={[s.row, { gap: 8 }]}>
                  <Icon name="clock" size={16} color={onColor(accent)} />
                  <Text style={{ color: onColor(accent), fontWeight: '800', fontSize: 12, letterSpacing: 0.6, opacity: 0.9 }}>ΠΙΟ ΚΟΝΤΙΝΟ ΕΛΕΥΘΕΡΟ</Text>
                </View>
                {next === undefined ? <Text style={{ color: onColor(accent), opacity: 0.85 }}>Αναζήτηση…</Text>
                  : next === null ? <Text style={{ color: onColor(accent), opacity: 0.85 }}>Δεν υπάρχει ελεύθερο ραντεβού τις επόμενες μέρες.</Text>
                  : <View style={[s.row, { gap: 12 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: onColor(accent), fontWeight: '900', fontSize: 22, letterSpacing: -0.5 }}>{dayLabel(next.date)} · {next.time}</Text>
                        <Text style={{ color: onColor(accent), opacity: 0.85, fontSize: 13 }}>{service.name} · {service.duration_min} λεπτά</Text>
                      </View>
                      <Pressable onPress={() => book(service, next.time, next.date)} disabled={busy === service.id + next.time}
                        style={({ pressed }) => ({ backgroundColor: '#ffffff', borderRadius: r, paddingVertical: 12, paddingHorizontal: 16, opacity: pressed ? 0.85 : 1 })}>
                        <Text style={{ color: lum(accent) > 186 ? C.text : accent, fontWeight: '800', fontSize: 15 }}>Κλείσε το</Text>
                      </Pressable>
                    </View>}
              </View>
            )}
            <H2 title={scr.times} sub={dayLabel(date)} />
            {Days()}
            {slots.length === 0 ? <Nothing text="Δεν υπάρχουν ελεύθερα ραντεβού αυτή τη μέρα. Διάλεξε άλλη μέρα." /> : TimeGrid()}
          </>}

          {/* ---------- Κατάλογος υπηρεσιών ---------- */}
          {layout === 'menu' && services.length > 0 && <>
            <H2 title={scr.services} />
            {night ? PriceList() : Cards()}
            <H2 title={scr.times} sub={service ? `${service.name} · ${dayLabel(date)}` : dayLabel(date)} />
            {Days()}
            {slots.length === 0 ? <Nothing text="Δεν υπάρχουν ελεύθερες ώρες αυτή τη μέρα. Διάλεξε άλλη μέρα." /> : TimeGrid()}
          </>}

          {/* ---------- Ωράριο ---------- */}
          {hours.length > 0 && <>
            <H2 title="Ωράριο" />
            <Box>
              {WEEK.map((wd, i) => {
                const list = hours.filter((h) => h.weekday === wd).sort((a, z) => a.opens.localeCompare(z.opens));
                const isToday = wd === new Date().getDay();
                return (
                  <View key={wd} style={[s.row, { paddingVertical: 11, paddingHorizontal: 14 }, i < 6 && { borderBottomWidth: 1, borderBottomColor: P.line }]}>
                    <Text style={{ flex: 1, color: isToday ? accent : P.text, fontWeight: isToday ? '800' : '600', fontSize: 15 }}>{DAY_FULL[wd]}</Text>
                    <Text style={{ color: list.length ? (isToday ? accent : P.text) : P.mute, fontWeight: isToday ? '800' : '500', fontSize: 14 }}>
                      {list.length ? list.map((h) => `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}`).join(', ') : 'Κλειστά'}
                    </Text>
                  </View>
                );
              })}
            </Box>
          </>}

          {/* ---------- Κανόνες ---------- */}
          <Text style={{ color: P.mute, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
            {[biz.cancel_before_min ? `Δωρεάν ακύρωση έως ${biz.cancel_before_min >= 1440 ? `${Math.round(biz.cancel_before_min / 1440)} ${biz.cancel_before_min >= 2880 ? 'μέρες' : 'μέρα'}` : biz.cancel_before_min >= 60 ? `${Math.round(biz.cancel_before_min / 60)} ${biz.cancel_before_min >= 120 ? 'ώρες' : 'ώρα'}` : `${biz.cancel_before_min} λεπτά`} πριν.` : '',
              biz.requires_approval ? 'Οι νέοι πελάτες εγκρίνονται από το κατάστημα.' : '',
              `Κρατήσεις έως ${biz.max_days_ahead ?? 14} μέρες μπροστά.`].filter(Boolean).join(' ')}
          </Text>
        </View>
      </ScrollView>

      {/* μπάρα ενέργειας για την επιλεγμένη ώρα */}
      {picked && (() => {
        const stt = state(picked), dis = busy === picked.sv.id + picked.time;
        return (
          <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: night ? NIGHT.card : C.bg, borderRadius: r + 6, padding: 14,
            flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: P.line, ...shadow(3) }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: P.text, fontWeight: '900', fontSize: 17 }}>{dayLabel(date)} · {picked.time}</Text>
              <Text style={{ color: P.mute, fontSize: 13 }} numberOfLines={2}>
                {picked.sv.name} · έως {endOf(picked.time, picked.sv.duration_min)}{stt === 'full' ? ' · γεμάτο' : ''}
              </Text>
            </View>
            {stt === 'mine' ? <Btn kind="danger" title="Ακύρωση" disabled={dis} onPress={() => cancel(picked)} />
              : stt === 'wait' ? <Btn kind="ghost" title="Απόσυρση" disabled={dis} onPress={() => unwait(picked)} />
              : stt === 'full' ? <Btn kind="tint" color={accent} title="🙋 Αναμονή" disabled={dis} onPress={() => wait(picked.sv, picked.time)} />
              : <Btn color={accent} title={scr.cta} disabled={dis} onPress={() => book(picked.sv, picked.time)} />}
          </View>
        );
      })()}
    </View>
  );
}
