import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Txt';
import { rpc } from './supabase';
import { say } from './alert';
import { Btn, C, Icon, Input, alpha, fmtDay, iso, s, shadow } from './ui';
import { useWide } from './wide';

/* Βαθμολογίες, και προς τις δύο μεριές:
   - ο πελάτης βαθμολογεί το κατάστημα μετά από μια επίσκεψη → φαίνεται παντού (κάρτες, αναζήτηση, σελίδα καταστήματος)
   - η επιχείρηση βαθμολογεί τον πελάτη μετά από μια επίσκεψη → τη βλέπουν ΜΟΝΟ επιχειρήσεις όπου έχει κλείσει ο πελάτης,
     ποτέ ο ίδιος ο πελάτης ή άλλοι πελάτες (στη βάση: πίνακας client_ratings με RLS, βλ. supabase/migrations/007). */

/* Η βάση στέλνει τον μέσο όρο ως κείμενο (numeric), π.χ. "4.7". */
export const fmtAvg = (n: number | string | null | undefined) => (n == null || n === '' ? '–' : Number(n).toFixed(1).replace('.', ','));
const STAR = '★';

/* Πέντε αστέρια (μόνο προβολή). */
export function Stars({ value: v, size = 14, gap = 1 }: { value: number | string; size?: number; gap?: number }) {
  const value = Number(v) || 0;
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, lineHeight: size * 1.15, color: value >= i - 0.25 ? C.star : alpha(C.mute, 0.3) }}>{STAR}</Text>
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
          <Text style={{ fontSize: size, lineHeight: size * 1.15, color: value >= i ? C.star : alpha(C.mute, 0.3) }}>{STAR}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* «★ 4,8 (126)» για κάρτες και λίστες. Χωρίς κριτικές: «Νέο». */
export function Rating({ avg, count, size = 13, color, light }: { avg?: number | string | null; count?: number | null; size?: number; color?: string; light?: boolean }) {
  const c = color ?? C.text;
  if (!count) return <Text style={{ color: light ? c : C.mute, fontSize: size, fontWeight: '700' }}>Νέο</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ color: C.star, fontSize: size, lineHeight: size * 1.2 }}>{STAR}</Text>
      <Text style={{ color: c, fontSize: size, fontWeight: '800' }}>{fmtAvg(avg)}</Text>
      <Text style={{ color: light ? c : C.mute, fontSize: size, fontWeight: '600', opacity: light ? 0.8 : 1 }}>({count})</Text>
    </View>
  );
}

const WORD = ['', 'Κακή', 'Μέτρια', 'Καλή', 'Πολύ καλή', 'Τέλεια'];

/* Το παράθυρο της βαθμολογίας: αστέρια, λίγα έτοιμα λόγια και προαιρετικό σχόλιο.
   who = 'business' όταν ο πελάτης βαθμολογεί κατάστημα, 'client' όταν η επιχείρηση βαθμολογεί πελάτη. */
export function RateSheet({ open, who, title, sub, start = 0, startText = '', onClose, onSave }:
  { open: boolean; who: 'business' | 'client'; title: string; sub?: string; start?: number; startText?: string; onClose: () => void; onSave: (stars: number, text: string) => Promise<void> | void }) {
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
  }, [open, start]);
  if (!open) return null;
  const tips = who === 'business'
    ? ['Εξυπηρέτηση', 'Ποιότητα', 'Στην ώρα', 'Καθαριότητα', 'Τιμή']
    : ['Στην ώρα', 'Ευγενικός/ή', 'Ακύρωσε νωρίς', 'Άργησε', 'Δεν ήρθε'];
  const save = async () => { setBusy(true); try { await onSave(n, text.trim()); } finally { setBusy(false); } };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} accessibilityLabel="Κλείσιμο" />
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
          {tips.map((t) => {
            const on = text.includes(t);
            return (
              <Pressable key={t} onPress={() => setText(on ? text.replace(t, '').replace(/^[ ,·]+|[ ,·]+$/g, '').replace(/ · · /g, ' · ') : text ? `${text} · ${t}` : t)}
                style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? C.text : C.soft }}>
                <Text style={{ color: on ? C.bg : C.text, fontSize: 13, fontWeight: '700' }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
        <Input multiline placeholder={who === 'business' ? 'Πες λίγα λόγια (προαιρετικό)' : 'Σημείωση για τον πελάτη (προαιρετικό)'} value={text} onChangeText={setText} maxLength={600} />
        <View style={[s.row, { gap: 8, alignItems: 'flex-start' }]}>
          <Icon name={who === 'client' ? 'lock' : 'eye'} size={14} color={C.mute} />
          <Text style={{ color: C.mute, fontSize: 12.5, flex: 1, lineHeight: 17 }}>
            {who === 'client'
              ? 'Τη βλέπουν μόνο επιχειρήσεις όπου κλείνει ραντεβού. Ο πελάτης και οι άλλοι πελάτες δεν τη βλέπουν ποτέ.'
              : 'Η βαθμολογία και το σχόλιό σου φαίνονται σε όλους, με το μικρό σου όνομα.'}
          </Text>
        </View>
        <Btn title={busy ? '…' : 'Αποθήκευση'} disabled={!n || busy} onPress={save} />
      </Animated.View>
    </Modal>
  );
}

/* Μπορεί ο πελάτης να βαθμολογήσει αυτή την κράτηση; Έγινε (ή πέρασε), μέσα στις τελευταίες 60 μέρες. */
export const canRate = (b: { status: string; date: string }) => {
  const today = iso(new Date()), d = new Date(); d.setDate(d.getDate() - 60);
  return (b.status === 'attended' || (b.status === 'booked' && b.date < today)) && b.date >= iso(d);
};

/* Ο πελάτης βαθμολογεί ένα κατάστημα: ανοίγει το παράθυρο για μια κράτηση και αποθηκεύει. */
export function useRateBusiness(onDone: () => void) {
  const [b, setB] = useState<any>(null);
  const [start, setStart] = useState(0);
  const rate = (booking: any, stars = 0) => { setStart(stars || booking.my_stars || 0); setB(booking); };
  const sheet = (
    <RateSheet open={!!b} who="business" start={start} startText={b?.my_comment ?? ''}
      title={b?.my_stars ? 'Η βαθμολογία σου' : 'Πώς ήταν;'} sub={b ? `${b.business} · ${b.service} · ${fmtDay(b.date)}` : ''}
      onClose={() => setB(null)}
      onSave={async (stars, text) => {
        const r = await rpc('rate_business', { p_booking: b.id, p_stars: stars, p_comment: text || null }).catch((e) => ({ ok: false, error: e.message }));
        if (r?.ok === false) return say('Δεν αποθηκεύτηκε', r.error);
        setB(null); say('Ευχαριστούμε! ⭐', 'Η βαθμολογία σου βοηθά και τους άλλους να διαλέξουν.'); onDone();
      }} />
  );
  return { rate, sheet };
}

/* «Πώς ήταν;»: κάρτα για τις πρόσφατες επισκέψεις που δεν έχουν βαθμολογηθεί. Πάτημα σε αστέρι → παράθυρο. */
export function RateCard({ items, onRate, max = 1, store = true }: { items: any[]; onRate: (b: any, stars: number) => void; max?: number; store?: boolean }) {
  const d = new Date(); d.setDate(d.getDate() - 14); const since = iso(d); // υπενθύμιση μόνο για τις επισκέψεις των τελευταίων 2 εβδομάδων
  const all = items.filter((b) => canRate(b) && !b.my_stars && b.date >= since), list = all.slice(0, max);
  if (!list.length) return null;
  return (
    <View style={[{ borderRadius: 20, backgroundColor: C.card, padding: 16, gap: 12, borderWidth: 1, borderColor: alpha(C.star, 0.35) }]}>
      <View style={[s.row, { gap: 8 }]}>
        <Text style={{ color: C.star, fontSize: 18 }}>{STAR}</Text>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, flex: 1 }}>{list.length === 1 ? 'Πώς ήταν η επίσκεψή σου;' : 'Πώς ήταν οι επισκέψεις σου;'}</Text>
        {all.length > list.length && <Text style={{ color: C.mute, fontSize: 12.5, fontWeight: '700' }}>+{all.length - list.length} ακόμα</Text>}
      </View>
      {list.map((b, i) => (
        <View key={b.id} style={[{ gap: 6 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 }]}>
          {store && <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{b.business}</Text>}
          <Text style={{ color: store ? C.mute : C.text, fontSize: store ? 13 : 14, fontWeight: store ? '400' : '600' }} numberOfLines={1}>{[b.service, b.staff?.split(' ')[0], fmtDay(b.date)].filter(Boolean).join(' · ')}</Text>
          <StarInput value={0} onChange={(n) => onRate(b, n)} size={28} gap={8} />
        </View>
      ))}
    </View>
  );
}

/* Οι κριτικές ενός καταστήματος: μέσος όρος, κατανομή και τα σχόλια. Ίδιο κομμάτι στη σελίδα του καταστήματος
   και στη «Σελίδα» της επιχείρησης. */
export function Reviews({ businessId, title = 'Κριτικές', reload = 0, owner }: { businessId: string; title?: string; reload?: number; owner?: boolean }) {
  const [d, setD] = useState<any>(null);
  const [all, setAll] = useState(false);
  useEffect(() => { rpc('business_reviews', { p_business: businessId }).then(setD).catch(() => setD(null)); }, [businessId, reload]);
  if (!d) return null;
  const items: any[] = d.items ?? [];
  const shown = all ? items : items.filter((x) => x.comment).slice(0, 3);
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginTop: 14 }}>{title}</Text>
      {!d.count ? (
        <View style={{ borderRadius: 18, backgroundColor: C.card, padding: 16, gap: 4 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>Καμία κριτική ακόμα</Text>
          <Text style={{ color: C.mute, fontSize: 13.5 }}>{owner ? 'Οι πελάτες σου μπορούν να σε βαθμολογήσουν μετά από κάθε επίσκεψη.' : 'Οι πελάτες βαθμολογούν μετά την επίσκεψή τους.'}</Text>
        </View>
      ) : <>
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', borderRadius: 18, backgroundColor: C.card, padding: 16 }}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 40, letterSpacing: -1 }}>{fmtAvg(d.avg)}</Text>
            <Stars value={d.avg} size={14} />
            <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{d.count} {d.count === 1 ? 'κριτική' : 'κριτικές'}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {[5, 4, 3, 2, 1].map((k) => {
              const n = d.dist?.[k - 1] ?? 0;
              return (
                <View key={k} style={[s.row, { gap: 8 }]}>
                  <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700', width: 10 }}>{k}</Text>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.soft, overflow: 'hidden' }}>
                    <View style={{ width: `${d.count ? (n / d.count) * 100 : 0}%`, height: 6, borderRadius: 3, backgroundColor: C.star }} />
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
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 14.5 }}>{r.name}{r.mine ? ' (εσύ)' : ''}</Text>
                <Text style={{ color: C.mute, fontSize: 12.5 }}>{[r.service, fmtDay(r.date)].filter(Boolean).join(' · ')}</Text>
              </View>
              <Stars value={r.stars} size={13} />
            </View>
            {!!r.comment && <Text style={{ color: C.text, fontSize: 14.5, lineHeight: 21 }}>{r.comment}</Text>}
          </View>
        ))}
        {items.length > shown.length && (
          <Pressable onPress={() => setAll(true)} style={({ pressed }) => ({ alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 13.5 }}>Όλες οι κριτικές ({d.count})</Text>
          </Pressable>
        )}
      </>}
    </View>
  );
}

/* ---------- πλευρά επιχείρησης ---------- */

/* Η επιχείρηση βαθμολογεί τον πελάτη για μία επίσκεψη (από το πρόγραμμα της μέρας ή από την καρτέλα του). */
export function useRateClient(businessId: string | undefined, onDone: () => void) {
  const [b, setB] = useState<any>(null);
  const [start, setStart] = useState(0);
  const rate = (booking: any, stars = 0) => { setStart(stars || booking.my_stars || 0); setB(booking); };
  const sheet = (
    <RateSheet open={!!b} who="client" start={start} startText={b?.my_note ?? ''}
      title={`Πώς ήταν ${b?.client ? 'ο/η ' + String(b.client).split(' ')[0] : 'ο πελάτης'};`} sub={b ? [b.service, b.date ? fmtDay(b.date) : null, b.time].filter(Boolean).join(' · ') : ''}
      onClose={() => setB(null)}
      onSave={async (stars, text) => {
        const r = await rpc('rate_client', { p_booking: b.id, p_stars: stars, p_note: text || null }).catch((e) => ({ ok: false, error: e.message }));
        if (r?.ok === false) return say('Δεν αποθηκεύτηκε', r.error);
        setB(null); onDone();
      }} />
  );
  return { rate, sheet, businessId };
}

/* Η βαθμολογία ενός πελάτη, όπως τη βλέπει μια επιχείρηση: μέσος όρος από ΟΛΕΣ τις επιχειρήσεις όπου έχει πάει. */
export function ClientBadge({ avg, count, size = 12 }: { avg?: number | string | null; count?: number | null; size?: number }) {
  if (!count) return null;
  const low = Number(avg ?? 5) < 3.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999, backgroundColor: low ? alpha(C.bad, 0.12) : alpha(C.star, 0.16) }}>
      <Text style={{ color: low ? C.bad : C.star, fontSize: size, lineHeight: size * 1.2 }}>{STAR}</Text>
      <Text style={{ color: low ? C.bad : C.text, fontSize: size, fontWeight: '800' }}>{fmtAvg(avg)}</Text>
    </View>
  );
}
