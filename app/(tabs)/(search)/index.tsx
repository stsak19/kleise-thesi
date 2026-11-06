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
import { setSearchOpen } from '../../../lib/searchOpen';
import { useWide } from '../../../lib/wide';
import { DeskSearch } from '../../../lib/client/desk';
type Biz = { theme?: string | null; layout?: string | null; id: string; name: string; category: string; city: string; address: string | null; brand_color?: string | null; logo_url?: string | null; cover_url?: string | null };


/* Κάρτα καταστήματος: εξώφυλλο (ή σκούρο πλαίσιο με λάμψη στο χρώμα του), ετικέτα κατηγορίας
   πάνω του, και από κάτω λογότυπο, όνομα και διεύθυνση. */
function BizCard({ b, onPress }: { b: Biz; onPress: () => void }) {
  const brand = styleOf(b).color, light = isLight(C.bg);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ borderRadius: 20, backgroundColor: C.card, opacity: pressed ? 0.88 : 1,
      boxShadow: `0px 10px 22px ${alpha('#000000', light ? 0.14 : 0.5)}, 0px 2px 6px ${alpha('#000000', light ? 0.07 : 0.3)}` })}>
      <View style={{ height: 150, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', backgroundColor: '#0d0d0d' }}>
        <Photo uri={b.cover_url} color={brand} />
      </View>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 2 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, letterSpacing: -0.2 }} numberOfLines={1}>{b.name}</Text>
        <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{catEmoji(b.category)} {catLabel(b.category)} · {b.city}</Text>
      </View>
    </Pressable>
  );
}


type Next = { date: string; time: string; service: string; business: string };
/* Η επόμενη κράτηση του χρήστη για ΣΗΜΕΡΑ (ή τίποτα). */
function useTodayBooking() {
  const [n, setN] = useState<Next | null>(null);
  useFocusEffect(useCallback(() => {
    rpc('my_bookings').then((m: any) => {
      const d = new Date(), today = iso(d), now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      setN(((m?.bookings ?? []) as any[]).filter((b) => b.status === 'booked' && b.date === today && b.time >= now)
        .sort((x, z) => x.time.localeCompare(z.time))[0] ?? null);
    }).catch(() => {});
  }, []));
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
  const [q, setQ] = useState('');
  const wide = useWide();
  const [list, setList] = useState<Biz[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    let query = sb.from('businesses').select('*').eq('is_published', true).order('name').limit(100);
    if (cat) query = query.eq('category', cat);
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    const { data } = await query;
    setList((data as Biz[]) ?? []); setLoaded(true);
  }, [cat, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const top = useSafeAreaInsets().top;
  const cats = [{ key: null as string | null, label: 'Όλα', emoji: '✨' }, ...CATEGORIES];


  const filtering = !!cat || !!q.trim();
  const [focus, setFocus] = useState(false);
  const open = focus || !!q;
  const drop = useRef(new Animated.Value(0)).current, fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(drop, { toValue: open ? 36 : 0, useNativeDriver: true, friction: 9, tension: 60 }),
      Animated.timing(fade, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
    setSearchOpen(open);
  }, [open]);
  useEffect(() => () => setSearchOpen(false), []);
  const close = () => { setQ(''); setFocus(false); Keyboard.dismiss(); };
  /* Αναζήτηση ανοιχτή: η οθόνη πίσω θολώνει και τα αποτελέσματα εμφανίζονται σε κάρτες (λογότυπο + όνομα) καθώς γράφεις. */
  const overlay = (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 20, opacity: fade }}>
      <BlurView intensity={15} tint={isLight(C.bg) ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: alpha(C.bg, 0.3) }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: alpha(C.bg, 0.25) }} />
      <Pressable onPress={close} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: top + 110, paddingHorizontal: 20, paddingBottom: TAB_SPACE, gap: 6 }}>
        {!!q.trim() && list.map((b) => (
          <Pressable key={b.id} onPress={() => { close(); router.push(`/business/${b.id}`); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 72, height: 54, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0d0d0d' }}>
              <Photo uri={b.cover_url ?? b.logo_url} color={styleOf(b).color} letter={b.cover_url ? undefined : b.name.slice(0, 1)} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{b.name}</Text>
              <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{catEmoji(b.category)} {catLabel(b.category)} · {b.city}</Text>
            </View>
          </Pressable>
        ))}
        {!!q.trim() && loaded && list.length === 0 && <Text style={{ color: C.mute, textAlign: 'center', marginTop: 20 }}>Δεν βρέθηκε κάτι για «{q.trim()}»</Text>}
      </ScrollView>
    </Animated.View>
  );
  const anim = () => LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));
  /* Πάνω μέρος σε στιλ Wolt: προφίλ αριστερά, στρογγυλή μπάρα αναζήτησης στο κέντρο. */
  const fixed = (
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, paddingTop: top + 10, paddingBottom: 10, zIndex: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      transform: [{ translateY: drop }] }}>
      <BlurView intensity={isLight(C.bg) ? 40 : 30} tint={isLight(C.bg) ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
        style={{ flexGrow: open ? 1 : 0, height: 46, borderRadius: 23, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16,
          backgroundColor: isLight(C.bg) ? alpha('#ffffff', 0.72) : alpha('#30302e', 0.65), borderWidth: 1,
          borderColor: focus ? alpha(C.text, 0.25) : isLight(C.bg) ? alpha('#000000', 0.06) : alpha('#ffffff', 0.1),
          boxShadow: `0px 8px 22px ${alpha(C.shade, isLight(C.bg) ? (focus ? 0.18 : 0.1) : 0.4)}` }}>
        <Icon name="search" size={18} color={focus ? C.text : C.mute} />
        <TextInput placeholder="Αναζήτηση" placeholderTextColor={C.mute} value={q} onChangeText={setQ} returnKeyType="search"
          onFocus={() => { anim(); setFocus(true); }} onBlur={() => { anim(); setFocus(false); }} onSubmitEditing={() => Keyboard.dismiss()}
          style={[{ flexGrow: open ? 1 : 0, width: open ? 0 : 92, color: C.text, fontSize: 16, fontWeight: '600', height: 46 }, { outlineStyle: 'none' } as any]} />
      </BlurView>
      {open && (
        <Pressable onPress={close} accessibilityLabel="Κλείσιμο αναζήτησης" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <BlurView intensity={isLight(C.bg) ? 40 : 30} tint={isLight(C.bg) ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
            style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
              backgroundColor: isLight(C.bg) ? alpha('#ffffff', 0.72) : alpha('#30302e', 0.65), borderWidth: 1,
              borderColor: focus ? alpha(C.text, 0.25) : isLight(C.bg) ? alpha('#000000', 0.06) : alpha('#ffffff', 0.1),
              boxShadow: `0px 8px 22px ${alpha(C.shade, isLight(C.bg) ? (focus ? 0.18 : 0.1) : 0.4)}` }}>
            <Icon name="close" size={16} color={focus ? C.text : C.mute} />
          </BlurView>
        </Pressable>
      )}
    </Animated.View>
  );

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
    { title: 'Κοντά σου', items: list.slice(0, 10) },
    { title: 'Δημοφιλή', items: [...list].reverse().slice(0, 10) },
    ...CATEGORIES.map((c) => ({ title: `${c.emoji} ${c.label}`, items: list.filter((b) => b.category === c.key) })),
  ].filter((x) => x.items.length > 0);

  const row = (x: { title: string; items: Biz[] }) => (
    <View key={x.title} style={{ gap: 10 }}>
      <Text style={[s.h, { paddingHorizontal: 16 }]}>{x.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 }}>
        {x.items.map((b) => <View key={b.id} style={{ width: 270 }}><BizCard b={b} onPress={() => router.push(`/store/${b.id}`)} /></View>)}
      </ScrollView>
    </View>
  );

  const empty = <Empty emoji="🔎" title="Δεν βρέθηκαν καταστήματα" text="Δοκίμασε άλλο όνομα ή άλλη κατηγορία."
    action={filtering ? 'Καθαρισμός φίλτρων' : undefined} onAction={() => { setCat(null); setQ(''); }} />;

  if (wide) return <DeskHome {...{ q, setQ, chips, sections, list, loaded, filtering, empty, cat, onOpen: (b: Biz) => router.push(`/store/${b.id}`) }} />;

  return (
    <View style={s.screen}>
      {fixed}
      {overlay}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: top + 70, paddingBottom: TAB_SPACE, gap: 24 }} keyboardShouldPersistTaps="handled">
        {chips}
        {!loaded ? null : list.length === 0 ? <View style={{ paddingHorizontal: 16 }}>{empty}</View>
          : filtering ? (
            <View style={{ paddingHorizontal: 16, gap: 16 }}>
              <View style={s.row}>
                <Text style={[s.h, { flex: 1 }]}>{cat ? catLabel(cat) : 'Αποτελέσματα'}</Text>
                <Text style={{ color: C.mute, fontWeight: '600', fontSize: 14 }}>{list.length} {list.length === 1 ? 'κατάστημα' : 'καταστήματα'}</Text>
              </View>
              {list.map((b) => <BizCard key={b.id} b={b} onPress={() => router.push(`/store/${b.id}`)} />)}
            </View>
          ) : sections.map(row)}
      </ScrollView>
    </View>
  );
}

/* Η αρχική σε υπολογιστή (εκδοχή Β): γυάλινη αναζήτηση στο κέντρο, πλακίδια κατηγοριών
   και ενότητες σε πλέγμα αντί για οριζόντια κύλιση. Το μενού είναι αριστερά (lib/client/desk). */
function DeskHome({ q, setQ, chips, sections, list, loaded, filtering, empty, cat, onOpen }:
  { q: string; setQ: (v: string) => void; chips: React.ReactNode; sections: { title: string; items: Biz[] }[]; list: Biz[]; loaded: boolean; filtering: boolean; empty: React.ReactNode; cat: string | null; onOpen: (b: Biz) => void }) {
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
    <ScrollView style={s.screen} contentContainerStyle={{ paddingVertical: 26, paddingHorizontal: 40, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 1320, alignSelf: 'center' }}>
        <View style={{ gap: 26 }} onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}>
          <DeskSearch value={q} onChange={setQ} />
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
