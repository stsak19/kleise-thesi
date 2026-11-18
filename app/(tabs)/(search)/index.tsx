import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Keyboard, LayoutAnimation, Pressable, ScrollView, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, TextInput } from '../../../lib/Txt';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rpc, sb } from '../../../lib/supabase';
import { C, CATEGORIES, Card, DAYS, Empty, Icon, Input, TAB_SPACE, alpha, catEmoji, catLabel, iso, s } from '../../../lib/ui';
import { grad, isLight } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';

import { styleOf } from '../../../lib/presets';
import { Photo } from '../../../lib/Photo';
import { CAT_ART } from '../../../lib/catArt';
import { SITE, useWide } from '../../../lib/wide';
import { useHomeQuery } from '../../../lib/client/desk';
import { FavRow } from '../../../lib/client/FavRow';
import { searchFilters } from '../../../lib/client/search';
import { Rating, fmtAvg } from '../../../lib/reviews';
type Biz = { theme?: string | null; layout?: string | null; id: string; name: string; category: string; city: string; address: string | null; brand_color?: string | null; logo_url?: string | null; cover_url?: string | null; rating_avg?: number | string | null; rating_count?: number | null };


/* Κάρτα καταστήματος: εξώφυλλο (ή σκούρο πλαίσιο με λάμψη στο χρώμα του), ετικέτα κατηγορίας
   πάνω του, και από κάτω λογότυπο, όνομα και διεύθυνση. */
function BizCard({ b, onPress }: { b: Biz; onPress: () => void }) {
  const brand = styleOf(b).color, light = isLight(C.bg);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ borderRadius: 20, backgroundColor: C.card, opacity: pressed ? 0.88 : 1,
      boxShadow: `0px 10px 22px ${alpha('#000000', light ? 0.14 : 0.5)}, 0px 2px 6px ${alpha('#000000', light ? 0.07 : 0.3)}` })}>
      <View style={{ height: 150, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', backgroundColor: '#0d0d0d' }}>
        <Photo uri={b.cover_url} color={brand} cat={b.category} />
      </View>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 2 }}>
        <View style={[s.row, { gap: 8 }]}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, letterSpacing: -0.2, flex: 1 }} numberOfLines={1}>{b.name}</Text>
          <Rating avg={b.rating_avg} count={b.rating_count} />
        </View>
        <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{catEmoji(b.category)} {catLabel(b.category)} · {b.city}</Text>
      </View>
    </Pressable>
  );
}


/* Μικρή κάρτα για το κινητό: χαμηλό εξώφυλλο (ή ενιαίο χρώμα θέματος), λογότυπο πάνω του,
   και από κάτω όνομα και κατηγορία. Χωρίς σκιά. */
function MiniCard({ b, onPress, width }: { b: Biz; onPress: () => void; width?: number | `${number}%` }) {
  const brand = styleOf(b).color;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ height: 96, borderRadius: 16, overflow: 'hidden', backgroundColor: C.banner }}>
        <Photo uri={b.cover_url} color={brand} cat={b.category} />
      </View>
      <View style={{ marginTop: -22, marginLeft: 10, width: 44, height: 44, borderRadius: 14, padding: 3, backgroundColor: b.logo_url ? 'transparent' : C.bg }}>
        <View style={{ flex: 1, borderRadius: 11, overflow: 'hidden' }}>
          <Photo uri={b.logo_url} color={brand} letter={b.name.slice(0, 1)} />
        </View>
      </View>
      <View style={{ paddingTop: 6, paddingHorizontal: 2, gap: 1 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, letterSpacing: -0.2 }} numberOfLines={1}>{b.name}</Text>
        <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{catLabel(b.category)}{b.rating_count ? <Text style={{ color: C.text, fontWeight: '700' }}>{`  ★ ${fmtAvg(b.rating_avg)}`}</Text> : null}</Text>
      </View>
    </Pressable>
  );
}

type Next = { date: string; time: string; service: string; business: string };
/* Η επόμενη κράτηση του χρήστη για ΣΗΜΕΡΑ (ή τίποτα). */
function useTodayBooking() {
  const [n, setN] = useState<Next | null>(null);
  const signedIn = !!useAuth().session;
  useFocusEffect(useCallback(() => {
    if (!signedIn) return;
    rpc('my_bookings').then((m: any) => {
      const d = new Date(), today = iso(d), now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      setN(((m?.bookings ?? []) as any[]).filter((b) => b.status === 'booked' && b.date === today && b.time >= now)
        .sort((x, z) => x.time.localeCompare(z.time))[0] ?? null);
    }).catch(() => {});
  }, [signedIn]));
  return n;
}

/* Ειδοποίηση από πάνω όταν ανοίγει η αρχική: μόνο κατάστημα και ώρα της σημερινής κράτησης.
   Κατεβαίνει, μένει λίγα δευτερόλεπτα και ανεβαίνει ξανά. Πατώντας την ανοίγουν οι κρατήσεις. */
function TodayToast({ b, onPress }: { b: Next; onPress: () => void }) {
  const top = useSafeAreaInsets().top;
  const y = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 8 }),
      Animated.delay(4500),
      Animated.timing(y, { toValue: -120, duration: 260, useNativeDriver: true }),
    ]);
    anim.start(); return () => anim.stop();
  }, [b.business, b.time]);
  return (
    <Animated.View style={{ position: 'absolute', left: 16, right: 16, top: top + 8, zIndex: 20, transform: [{ translateY: y }] }}>
      <Pressable onPress={onPress} style={({ pressed }) => [s.row, { gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, opacity: pressed ? 0.85 : 1,
        backgroundColor: C.ink, borderWidth: 1, borderColor: C.inkLine, boxShadow: `0px 8px 24px ${alpha('#000000', 0.15)}` }]}>
        <Icon name="calendar" size={16} color={C.inkText} />
        <Text style={{ flex: 1, color: C.inkText, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{b.business}</Text>
        <Text style={{ color: C.inkText, fontSize: 15, fontWeight: '800' }}>{b.time}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Home() {
  const router = useRouter();
  const [cat, setCat] = useState<string | null>(null);
  const [mobileQ, setMobileQ] = useState('');
  /* Στον υπολογιστή η αναζήτηση είναι στην πάνω μπάρα (lib/client/desk) και φτάνει εδώ μέσω useHomeQuery. */
  const wide = useWide();
  const [deskQ, setDeskQ] = useHomeQuery();
  const q = wide ? deskQ : mobileQ, setQ = wide ? setDeskQ : setMobileQ;
  const [list, setList] = useState<Biz[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    let query = sb.from('businesses').select('*').eq('is_published', true).order('name').limit(100);
    if (cat) query = query.eq('category', cat);
    for (const f of searchFilters(q)) query = query.or(f);
    const { data } = await query;
    setList((data as Biz[]) ?? []); setLoaded(true);
  }, [cat, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const top = useSafeAreaInsets().top;
  const cats = [{ key: null as string | null, label: 'Όλα', emoji: '✨' }, ...CATEGORIES];


  const filtering = !!cat || !!q.trim();
  const [focus, setFocus] = useState(false);
  const [all, setAll] = useState(false);

  /* Φίλτρα σε στιλ Wolt: τετράγωνα πλακίδια με μεγάλο εικονίδιο και τίτλο από κάτω. */
  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 10, paddingHorizontal: wide ? 0 : 16 }} keyboardShouldPersistTaps="handled">
      {cats.map((c) => {
        const on = cat === c.key || (c.key === null && !cat);
        const art = CAT_ART[c.key ?? 'all'] ?? CAT_ART.other;
        return (
          <Pressable key={c.key ?? 'all'} onPress={() => setCat(c.key === null || cat === c.key ? null : c.key)}
            style={({ pressed }) => ({ width: 76, alignItems: 'center', gap: 6, opacity: pressed ? 0.75 : 1 })}>
            <View style={{ width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              backgroundColor: isLight(C.bg) ? art.bg : art.bgDark, borderWidth: 2, borderColor: on ? C.text : 'transparent' }}>
              <Image source={art.img} style={{ width: 50, height: 50 }} resizeMode="contain" />
            </View>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: on ? '800' : '600' }} numberOfLines={1}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  /* Ενότητες με οριζόντια κύλιση, όπως στη Wolt. */
  const sections: { title: string; items: Biz[] }[] = [
    // Δεν έχουμε ακόμα τοποθεσία ή μετρήσεις, οπότε όχι «Κοντά σου»/«Δημοφιλή»: απλώς όλα, και μετά ανά είδος.
    { title: 'Όλα τα καταστήματα', items: list },
    ...CATEGORIES.map((c) => ({ title: `${c.emoji} ${c.label}`, items: list.filter((b) => b.category === c.key) })),
  ].filter((x) => x.items.length > 0);

  // Χωρίς φίλτρα και χωρίς κανένα κατάστημα: τα πρώτα βήματα της πλατφόρμας, κάλεσμα σε επιχειρήσεις.
  const empty = filtering
    ? <Empty emoji="🔎" title="Δεν βρέθηκαν καταστήματα" text="Δοκίμασε άλλο όνομα, είδος ή πόλη."
        action="Καθαρισμός φίλτρων" onAction={() => { setCat(null); setQ(''); }} />
    : <Empty emoji="🌱" title="Τα πρώτα καταστήματα έρχονται σύντομα" text="Το SpotOn μόλις ξεκίνησε. Έχεις επιχείρηση; Βάλ' την εδώ σε λίγα λεπτά και δέξου κρατήσεις online."
        action="Πρόσθεσε την επιχείρησή σου" onAction={() => router.push('/new-business')} />;

  if (wide) return <DeskHome {...{ chips, sections, list, loaded, filtering, empty, cat, onOpen: (b: Biz) => router.push(`/store/${b.id}`) }} />;

  /* Κινητό: χωρίς αναζήτηση = άδεια αρχική («Τι ψάχνεις;», μπάρα στη μέση, 8 κατηγορίες).
     Μόλις γράψεις, διαλέξεις κατηγορία ή πατήσεις «Όλα τα καταστήματα», η μπάρα ανεβαίνει πάνω και από κάτω βγαίνουν τα καταστήματα. */
  const results = filtering || all;
  const go = (f: () => void) => { LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity')); f(); };
  const reset = () => go(() => { setQ(''); setCat(null); setAll(false); Keyboard.dismiss(); });
  const bar = (
    <SearchBar q={q} setQ={(v) => { if (!!v.trim() !== !!q.trim()) go(() => setQ(v)); else setQ(v); }} focus={focus} setFocus={setFocus}
      onBack={results ? reset : undefined} />
  );
  /* Η μπάρα μένει στην ίδια θέση του δέντρου και στις δύο καταστάσεις, για να μη χάνεται το πληκτρολόγιο όταν αρχίζεις να γράφεις. */
  return (
    <View style={[s.screen, { paddingTop: top + 10 }]}>
      {!results && <View style={{ flex: 1 }} />}
      {!results && <Text style={{ color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginBottom: 22 }}>Τι ψάχνεις;</Text>}
      <View style={{ paddingHorizontal: results ? 16 : 20, paddingBottom: results ? 12 : 0, zIndex: 2 }}>{bar}</View>
      {!results ? (
        <View style={{ flex: 1.4, paddingHorizontal: 20, paddingTop: 22, paddingBottom: TAB_SPACE, gap: 22 }}>
          <FavRow pad={0} />
          <CatGrid onPick={(k) => go(() => setCat(k))} />
          {loaded && list.length > 0 && (
            <Pressable onPress={() => go(() => setAll(true))} hitSlop={8} style={({ pressed }) => ({ alignSelf: 'center', opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: C.mute, fontWeight: '700', fontSize: 14 }}>Δες όλα τα καταστήματα ›</Text>
            </Pressable>
          )}
          {loaded && list.length === 0 && empty}
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingBottom: TAB_SPACE, gap: 16 }} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
            {cats.map((c) => {
              const on = cat === c.key || (c.key === null && !cat);
              return (
                <Pressable key={c.key ?? 'all'} onPress={() => go(() => setCat(c.key === cat ? null : c.key))}
                  style={({ pressed }) => ({ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', opacity: pressed ? 0.75 : 1,
                    backgroundColor: on ? C.text : C.soft })}>
                  <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 14 }}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {!loaded ? null : list.length === 0 ? <View style={{ paddingHorizontal: 16 }}>{empty}</View> : (
            <View style={{ paddingHorizontal: 16, gap: 14 }}>
              <Text style={{ color: C.mute, fontWeight: '700', fontSize: 14 }}>
                {list.length} {list.length === 1 ? 'κατάστημα' : 'καταστήματα'}{q.trim() ? ` για «${q.trim()}»` : cat ? ` · ${catLabel(cat)}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 18 }}>
                {list.map((b) => <MiniCard key={b.id} b={b} width="47.5%" onPress={() => router.push(`/store/${b.id}`)} />)}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* Λέξεις που γράφονται και σβήνονται μέσα στην άδεια μπάρα αναζήτησης. */
const HINTS = ['κομμωτήριο', 'γυμναστήριο', 'κουρείο', 'νύχια', 'pilates', 'μασάζ', 'φυσικοθεραπεία', 'tattoo'];
function useTypewriter(on: boolean) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    if (!on) return;
    let w = 0, n = 0, dir = 1, t: ReturnType<typeof setTimeout>;
    const step = () => {
      const word = HINTS[w];
      n += dir; setTxt(word.slice(0, n));
      if (dir === 1 && n === word.length) { dir = -1; t = setTimeout(step, 1300); return; }
      if (dir === -1 && n === 0) { dir = 1; w = (w + 1) % HINTS.length; t = setTimeout(step, 300); return; }
      t = setTimeout(step, dir === 1 ? 90 : 45);
    };
    t = setTimeout(step, 400);
    return () => clearTimeout(t);
  }, [on]);
  return txt;
}

/* Κέρσορας που αναβοσβήνει δίπλα στις λέξεις της άδειας μπάρας. */
function Caret() {
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 0, duration: 1, delay: 500, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 1, delay: 500, useNativeDriver: true })]));
    a.start(); return () => a.stop();
  }, []);
  return <Animated.View style={{ width: 2, height: 20, marginLeft: 2, borderRadius: 1, backgroundColor: C.text, opacity: o }} />;
}

/* Μπάρα αναζήτησης με το ύφος της κάτω μπάρας (lib/FloatBar): γυάλινο χάπι, και δεξιά «φυσαλίδα» σαν την ενεργή καρτέλα.
   Με onBack εμφανίζεται αριστερά βελάκι επιστροφής στην άδεια αρχική. */
function SearchBar({ q, setQ, focus, setFocus, onBack }:
  { q: string; setQ: (v: string) => void; focus: boolean; setFocus: (v: boolean) => void; onBack?: () => void }) {
  const light = isLight(C.bg);
  const hint = useTypewriter(!q && !focus && !onBack);
  const bubble = { width: 42, height: 42, borderRadius: 21, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: light ? alpha('#d8d8de', 0.55) : alpha('#ffffff', 0.14), borderWidth: 1, borderColor: light ? alpha('#000000', 0.06) : alpha('#ffffff', 0.12) };
  return (
    <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
      style={{ height: 56, borderRadius: 28, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: onBack ? 6 : 20, paddingRight: 6,
        backgroundColor: light ? alpha('#ffffff', 0.72) : alpha('#30302e', 0.65), borderWidth: 1, borderColor: light ? alpha('#ffffff', 0.9) : alpha('#ffffff', 0.1),
        boxShadow: `0px 10px 30px ${alpha(C.shade, light ? 0.12 : 0.4)}, inset 0px 1px 0px ${alpha('#ffffff', light ? 0.9 : 0.08)}` }}>
      {!!onBack && (
        <Pressable onPress={onBack} accessibilityLabel="Πίσω" style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Icon name="back" size={18} color={C.text} />
        </Pressable>
      )}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <TextInput value={q} onChangeText={setQ} returnKeyType="search" placeholder={focus ? 'Γράψε τι ψάχνεις' : ''} placeholderTextColor={C.mute}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onSubmitEditing={() => Keyboard.dismiss()}
          style={[{ color: C.text, fontSize: 17, fontWeight: '700', height: 54 }, { outlineStyle: 'none' } as any]} />
        {!q && !focus && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
            {onBack ? <Text style={{ color: C.mute, fontSize: 17, fontWeight: '700' }}>Αναζήτηση</Text> : <>
              <Text style={{ color: C.mute, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>{hint}</Text>
              <Caret />
            </>}
          </View>
        )}
      </View>
      {q ? (
        <Pressable onPress={() => setQ('')} accessibilityLabel="Καθαρισμός" style={({ pressed }) => [bubble, { opacity: pressed ? 0.7 : 1 }]}>
          <Icon name="close" size={15} color={C.text} />
        </Pressable>
      ) : (
        <View style={bubble}><Icon name="search" size={18} color={C.text} /></View>
      )}
    </BlurView>
  );
}

/* Οι 8 κατηγορίες της άδειας αρχικής, σε πλέγμα 4×2 με τα 3D εικονίδια. */
const GRID_CATS = ['hair', 'gym', 'barber', 'nails', 'pilates_yoga', 'massage_spa', 'physio', 'beauty'];
const SHORT: Record<string, string> = { pilates_yoga: 'Pilates', massage_spa: 'Μασάζ', physio: 'Φυσικοθ.', nails: 'Νύχια', beauty: 'Αισθητική' };
function CatGrid({ onPick }: { onPick: (k: string) => void }) {
  const light = isLight(C.bg);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
      {GRID_CATS.map((k) => {
        const art = CAT_ART[k] ?? CAT_ART.other;
        return (
          <Pressable key={k} onPress={() => onPick(k)} style={({ pressed }) => ({ width: '25%', alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: light ? art.bg : art.bgDark }}>
              <Image source={art.img} style={{ width: 46, height: 46 }} resizeMode="contain" />
            </View>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{SHORT[k] ?? catLabel(k)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* Η αρχική σε υπολογιστή: πλακίδια κατηγοριών και ενότητες σε πλέγμα αντί για οριζόντια κύλιση.
   Η αναζήτηση και το μενού είναι στην πάνω μπάρα (lib/client/desk). */
function DeskHome({ chips, sections, list, loaded, filtering, empty, cat, onOpen }:
  { chips: React.ReactNode; sections: { title: string; items: Biz[] }[]; list: Biz[]; loaded: boolean; filtering: boolean; empty: React.ReactNode; cat: string | null; onOpen: (b: Biz) => void }) {
  const [w, setW] = useState(0);
  const [more, setMore] = useState<Record<string, boolean>>({});
  const cols = w >= 1100 ? 4 : w >= 700 ? 3 : 2, GAP = 20;
  const cw = w ? (w - GAP * (cols - 1)) / cols : 0;
  const grid = (items: Biz[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {!!cw && items.map((b) => <View key={b.id} style={{ width: cw }}><BizCard b={b} onPress={() => onOpen(b)} /></View>)}
    </View>
  );
  const head = (title: string, right?: React.ReactNode) => (
    <View style={[s.row, { alignItems: 'baseline' }]}>
      <Text style={[s.h, { flex: 1, fontSize: 22 }]}>{title}</Text>
      {right}
    </View>
  );
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingVertical: 26, paddingHorizontal: 32, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: SITE, alignSelf: 'center' }}>
        <View style={{ gap: 26 }} onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}>
          <FavRow pad={0} />
          {chips}
          {!loaded ? null : list.length === 0 ? empty
            : filtering ? (
              <View style={{ gap: 16 }}>
                {head(cat ? catLabel(cat) : 'Αποτελέσματα', <Text style={{ color: C.mute, fontWeight: '600', fontSize: 14 }}>{list.length} {list.length === 1 ? 'κατάστημα' : 'καταστήματα'}</Text>)}
                {grid(list)}
              </View>
            ) : sections.map((x) => {
              const open = !!more[x.title], extra = x.items.length > cols;
              return (
                <View key={x.title} style={{ gap: 14 }}>
                  {head(x.title, extra ? (
                    <Pressable onPress={() => setMore((m) => ({ ...m, [x.title]: !open }))} hitSlop={8} style={({ hovered }: any) => ({ opacity: hovered ? 0.6 : 1 })}>
                      <Text style={{ color: C.mute, fontWeight: '700', fontSize: 14 }}>{open ? 'Λιγότερα' : `Όλα (${x.items.length}) ›`}</Text>
                    </Pressable>
                  ) : undefined)}
                  {grid(open ? x.items : x.items.slice(0, cols))}
                </View>
              );
            })}
        </View>
      </View>
    </ScrollView>
  );
}
