import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Txt';
import { rpc } from './supabase';
import { say } from './alert';
import { useAuth } from './auth';
import { Btn, C, Icon, Input, alpha, fmtDay, iso, s, shadow } from './ui';
import { useWide } from './wide';

/* Βαθμολογίες καταστημάτων (supabase/migrations/016_reviews.sql).
   Ο πελάτης βαθμολογεί μετά την επίσκεψη (1–5 αστέρια + σχόλιο). Ο μέσος όρος φαίνεται στις κάρτες της αναζήτησης
   και στη σελίδα του καταστήματος, μαζί με τις κριτικές. Αν το 016 δεν έχει τρέξει ακόμα, όλα μένουν κρυφά.
   Τα αστέρια είναι στο χρώμα του κειμένου (minimal μαύρο · λευκό), όχι κίτρινα. */

const STAR = '★';
/* Η βάση στέλνει τον μέσο όρο ως numeric, π.χ. "4.7" → «4,7». */
export const fmtAvg = (n: number | string | null | undefined) => (n == null || n === '' ? '–' : Number(n).toFixed(1).replace('.', ','));
const plural = (n: number) => `${n} ${n === 1 ? 'κριτική' : 'κριτικές'}`;

/* Πέντε αστέρια (μόνο προβολή). */
export function Stars({ value, size = 14, gap = 1 }: { value: number | string | null | undefined; size?: number; gap?: number }) {
  const v = Number(value) || 0;
  return (
    <View style={{ flexDirection: 'row', gap }} accessibilityLabel={`${fmtAvg(v)} στα 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, lineHeight: size * 1.15, color: v >= i - 0.25 ? C.text : alpha(C.mute, 0.3) }}>{STAR}</Text>
      ))}
    </View>
  );
}

/* Πέντε αστέρια που πατιούνται. */
export function StarInput({ value, onChange, size = 30, gap = 6 }: { value: number; onChange: (n: number) => void; size?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${i} ${i === 1 ? 'αστέρι' : 'αστέρια'}`}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.85 : 1 }] })}>
          <Text style={{ fontSize: size, lineHeight: size * 1.15, color: value >= i ? C.text : alpha(C.mute, 0.3) }}>{STAR}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* «★ 4,8 (12)» για κάρτες και τίτλους. Χωρίς κριτικές δεν δείχνει τίποτα. */
export function Rating({ avg, count, size = 13, color }: { avg?: number | string | null; count?: number | null; size?: number; color?: string }) {
  if (!count) return null;
  return (
    <Text style={{ color: color ?? C.text, fontSize: size, fontWeight: '800' }}>
      {STAR} {fmtAvg(avg)} <Text style={{ color: C.mute, fontWeight: '600' }}>({count})</Text>
    </Text>
  );
}

const WORD = ['', 'Κακή', 'Μέτρια', 'Καλή', 'Πολύ καλή', 'Τέλεια'];
const TIPS = ['Εξυπηρέτηση', 'Ποιότητα', 'Στην ώρα', 'Καθαριότητα', 'Τιμή'];

/* Το παράθυρο της βαθμολογίας: αστέρια, λίγα έτοιμα λόγια και προαιρετικό σχόλιο.
   Κινητό: ανεβαίνει από κάτω. Υπολογιστής: κάρτα στη μέση. */
function RateSheet({ open, title, sub, start, startText, onClose, onSave }:
  { open: boolean; title: string; sub?: string; start: number; startText: string; onClose: () => void; onSave: (stars: number, text: string) => Promise<void> }) {
  const [n, setN] = useState(start);
  const [text, setText] = useState(startText);
  const [busy, setBusy] = useState(false);
  const bottom = useSafeAreaInsets().bottom;
  const wide = useWide();
  const y = useRef(new Animated.Value(500)).current;
  useEffect(() => {
    if (!open) return;
    setN(start); setText(startText); y.setValue(500);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
  }, [open, start, startText]);
  if (!open) return null;
  const tip = (t: string) => {
    const parts = text.split(' · ').map((x) => x.trim()).filter(Boolean);
    setText((parts.includes(t) ? parts.filter((x) => x !== t) : [...parts, t]).join(' · '));
  };
  const save = async () => { setBusy(true); try { await onSave(n, text.trim()); } finally { setBusy(false); } };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: alpha('#000000', 0.4) }} accessibilityLabel="Κλείσιμο" />
      <Animated.View style={[wide
          ? { position: 'absolute', alignSelf: 'center', top: '14%', width: 460, borderRadius: 28, paddingBottom: 22 }
          : { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: bottom + 18 },
        { backgroundColor: C.bg, paddingTop: 10, paddingHorizontal: 20, gap: 14, transform: [{ translateY: y }] }, shadow(3)]}>
        {!wide && <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center' }} />}
        <View style={[s.row, { gap: 10, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
            {!!sub && <Text style={{ color: C.mute, fontSize: 14 }}>{sub}</Text>}
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Κλείσιμο" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={14} color={C.mute} />
          </Pressable>
        </View>
        <View style={{ alignItems: 'center', gap: 4, paddingVertical: 6 }}>
          <StarInput value={n} onChange={setN} size={40} gap={10} />
          <Text style={{ color: n ? C.text : C.mute, fontWeight: '700', fontSize: 14, height: 20 }}>{n ? WORD[n] : 'Πάτα ένα αστέρι'}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIPS.map((t) => {
            const on = text.split(' · ').map((x) => x.trim()).includes(t);
            return (
              <Pressable key={t} onPress={() => tip(t)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? C.text : C.soft }}>
                <Text style={{ color: on ? C.bg : C.text, fontSize: 13, fontWeight: '700' }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
        <Input multiline placeholder="Πες λίγα λόγια (προαιρετικό)" value={text} onChangeText={setText} maxLength={600} />
        <View style={[s.row, { gap: 8, alignItems: 'flex-start' }]}>
          <Icon name="eye" size={14} color={C.mute} />
          <Text style={{ color: C.mute, fontSize: 12.5, flex: 1, lineHeight: 17 }}>Η βαθμολογία και το σχόλιό σου φαίνονται σε όλους, με το μικρό σου όνομα.</Text>
        </View>
        <Btn title={busy ? '…' : 'Αποθήκευση'} disabled={!n || busy} onPress={save} />
      </Animated.View>
    </Modal>
  );
}

/* Μπορεί ο πελάτης να βαθμολογήσει αυτή την κράτηση; Έγινε (ή πέρασε η ώρα της), μέσα στις τελευταίες 60 μέρες.
   Ίδιος κανόνας με την rate_business() στη βάση. */
export const canRate = (b: { status: string; date: string; time?: string }) => {
  const now = new Date(), today = iso(now), d = new Date(); d.setDate(d.getDate() - 60);
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const passed = b.date < today || (b.date === today && !!b.time && String(b.time).slice(0, 5) <= hm);
  return (b.status === 'attended' || (b.status === 'booked' && passed)) && b.date >= iso(d);
};

type Mine = Record<string, { stars: number; comment: string | null }>;
type RateTarget = { id: string; business?: string | null; service?: string | null; date: string };

/* Οι βαθμολογίες μου ανά κράτηση και το παράθυρο για να βάλω / αλλάξω μία.
   Χρήση: const R = useMyReviews(); … {R.sheet} … R.rate(booking) */
export function useMyReviews(onSaved?: () => void) {
  const signedIn = !!useAuth().session;
  const [mine, setMine] = useState<Mine>({});
  const [ready, setReady] = useState(false); // false = δεν φορτώθηκε ή δεν έχει τρέξει το 016 → δεν δείχνουμε κουμπιά
  const [b, setB] = useState<RateTarget | null>(null);
  const [start, setStart] = useState(0);
  const load = useCallback(() => {
    if (!signedIn) { setMine({}); setReady(false); return; }
    rpc<Mine>('my_reviews').then((m) => { setMine(m ?? {}); setReady(true); }).catch(() => setReady(false));
  }, [signedIn]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rate = (booking: RateTarget, stars = 0) => { setStart(stars || mine[booking.id]?.stars || 0); setB(booking); };
  const had = b ? mine[b.id] : undefined;
  const sheet = (
    <RateSheet open={!!b} start={start} startText={had?.comment ?? ''}
      title={had ? 'Η βαθμολογία σου' : 'Πώς ήταν;'} sub={b ? [b.business, b.service, fmtDay(b.date)].filter(Boolean).join(' · ') : ''}
      onClose={() => setB(null)}
      onSave={async (stars, text) => {
        if (!b) return;
        const r = await rpc('rate_business', { p_booking: b.id, p_stars: stars, p_comment: text || null }).catch((e) => ({ ok: false, error: e.message }));
        if (r?.ok === false) return say('Δεν αποθηκεύτηκε', r.error);
        setMine((m) => ({ ...m, [b.id]: { stars, comment: text || null } }));
        setB(null);
        if (!had) say('Ευχαριστούμε!', 'Η βαθμολογία σου βοηθά και τους άλλους να διαλέξουν.');
        onSaved?.();
      }} />
  );
  return { ready, mine, rate, sheet, reload: load };
}
export type MyReviews = ReturnType<typeof useMyReviews>;

/* Στο ιστορικό: «★★★★☆» αν τη βαθμολόγησα (πάτημα = αλλαγή), αλλιώς κουμπί «Βαθμολόγησε». */
export function RateButton({ R, b }: { R: MyReviews; b: RateTarget & { status: string; time?: string } }) {
  if (!R.ready || !canRate(b)) return null;
  const m = R.mine[b.id];
  return (
    <Pressable onPress={() => R.rate(b)} accessibilityRole="button" accessibilityLabel={m ? `Η βαθμολογία σου: ${m.stars} στα 5. Αλλαγή` : 'Βαθμολόγησε'}
      style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 6, opacity: pressed ? 0.7 : 1 })}>
      {m ? <Stars value={m.stars} size={15} /> : (
        <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{STAR} Βαθμολόγησε</Text>
        </View>
      )}
    </Pressable>
  );
}

/* «Πώς ήταν;»: κάρτα για την πιο πρόσφατη επίσκεψη (τελευταίες 2 εβδομάδες) που δεν έχει βαθμολογηθεί.
   Πάτημα σε αστέρι → ανοίγει το παράθυρο με τόσα αστέρια. */
export function RateCard({ R, items, store = true }: { R: MyReviews; items: (RateTarget & { status: string; time?: string })[]; store?: boolean }) {
  if (!R.ready) return null;
  const d = new Date(); d.setDate(d.getDate() - 14); const since = iso(d);
  const all = items.filter((b) => canRate(b) && !R.mine[b.id] && b.date >= since)
    .sort((a, z) => `${z.date} ${z.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`)); // η πιο πρόσφατη πρώτη
  const b = all[0];
  if (!b) return null;
  return (
    <View style={{ borderRadius: 20, backgroundColor: C.card, padding: 16, gap: 8 }}>
      <View style={[s.row, { gap: 8 }]}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, flex: 1 }}>Πώς ήταν η επίσκεψή σου;</Text>
        {all.length > 1 && <Text style={{ color: C.mute, fontSize: 12.5, fontWeight: '700' }}>+{all.length - 1} ακόμα</Text>}
      </View>
      <Text style={{ color: C.mute, fontSize: 13.5 }} numberOfLines={1}>{[store ? b.business : null, b.service, fmtDay(b.date)].filter(Boolean).join(' · ')}</Text>
      <StarInput value={0} onChange={(n) => R.rate(b, n)} size={30} gap={10} />
    </View>
  );
}

/* Οι κριτικές ενός καταστήματος: μέσος όρος, κατανομή και τα σχόλια.
   Χωρίς κριτικές: μικρή κάρτα «Καμία κριτική ακόμα». Χωρίς το 016 στη βάση (η RPC δεν υπάρχει): τίποτα. */
export function Reviews({ businessId, reload = 0, head }: { businessId?: string; reload?: number; head: (t: string) => React.ReactNode }) {
  const [d, setD] = useState<any>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    if (!businessId) return;
    rpc('business_reviews', { p_business: businessId }).then(setD).catch(() => setD(null));
  }, [businessId, reload]);
  if (!d) return null;
  if (!d.count) return (
    <View style={{ gap: 12 }}>
      {head('Κριτικές')}
      <View style={{ borderRadius: 18, backgroundColor: C.card, padding: 16, gap: 4 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>Καμία κριτική ακόμα</Text>
        <Text style={{ color: C.mute, fontSize: 13.5, lineHeight: 19 }}>Οι πελάτες βαθμολογούν από τις Κρατήσεις τους, μετά την επίσκεψη.</Text>
      </View>
    </View>
  );
  const items: any[] = d.items ?? [];
  const shown = all ? items : items.filter((x) => x.comment).slice(0, 3);
  return (
    <View style={{ gap: 12 }}>
      {head('Κριτικές')}
      <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', borderRadius: 18, backgroundColor: C.card, padding: 16 }}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 40, letterSpacing: -1 }}>{fmtAvg(d.avg)}</Text>
          <Stars value={d.avg} size={14} />
          <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{plural(d.count)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {[5, 4, 3, 2, 1].map((k) => {
            const n = d.dist?.[k - 1] ?? 0;
            return (
              <View key={k} style={[s.row, { gap: 8 }]}>
                <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700', width: 10 }}>{k}</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.soft, overflow: 'hidden' }}>
                  <View style={{ width: `${(n / d.count) * 100}%`, height: 6, borderRadius: 3, backgroundColor: C.text }} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
      {shown.map((r, i) => (
        <View key={r.id ?? i} style={{ gap: 6, paddingVertical: 4 }}>
          <View style={[s.row, { gap: 10 }]}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>{String(r.name ?? 'Π').slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 14.5 }} numberOfLines={1}>{r.name}{r.mine ? ' (εσύ)' : ''}</Text>
              <Text style={{ color: C.mute, fontSize: 12.5 }} numberOfLines={1}>{[r.service, r.date ? fmtDay(r.date) : null].filter(Boolean).join(' · ')}</Text>
            </View>
            <Stars value={r.stars} size={13} />
          </View>
          {!!r.comment && <Text style={{ color: C.text, fontSize: 14.5, lineHeight: 21 }}>{r.comment}</Text>}
        </View>
      ))}
      {items.length > shown.length && (
        <Pressable onPress={() => setAll(true)} accessibilityRole="button"
          style={({ pressed }) => ({ alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 13.5 }}>Όλες οι κριτικές ({items.length})</Text>
        </Pressable>
      )}
    </View>
  );
}
