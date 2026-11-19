import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { WEB_URL } from '../supabase';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type TabItems } from '../FloatBar';
import { Text } from '../Txt';
import { Photo } from '../Photo';
import { C, Icon, alpha } from '../ui';
import { useStore } from './data';
import { useWide } from '../wide';
import { DeskTitle } from './desk';
import { usePerson } from '../profile/data';
import { Initials } from '../profile/parts';
import { askLogin } from '../guest';
import { Heart } from '../Icon';
import { isFavorite, toggleFavorite, useFavorites } from '../favorites';

/* Οι καρτέλες του καταστήματος (η κάτω μπάρα του κινητού είναι στο lib/store/StoreBar). */
export type StoreTabs = TabItems;

/* «‹ SpotOn»: βγαίνει από το κατάστημα και γυρίζει στην εφαρμογή. */
export function ExitPill() {
  const router = useRouter();
  const out = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Pressable onPress={out} accessibilityRole="button" accessibilityLabel="Επιστροφή στο SpotOn" hitSlop={6}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', height: 34, paddingLeft: 8, paddingRight: 13,
        borderRadius: 17, backgroundColor: C.card, opacity: pressed ? 0.7 : 1 })}>
      <Icon name="back" size={16} color={C.text} />
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>SpotOn</Text>
    </Pressable>
  );
}

/* Λογότυπο του καταστήματος. Όταν υπάρχει ανεβασμένο λογότυπο δεν έχει φόντο ούτε περίγραμμα: ένα διαφανές PNG
   φαίνεται όπως ανέβηκε, χωρίς λευκό ή χρωματιστό κουτί από πίσω. Χωρίς λογότυπο μένει το αρχικό γράμμα σε πλαίσιο. */
export function StoreLogo({ size = 44 }: { size?: number }) {
  const S = useStore();
  const has = !!S.biz?.logo_url;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, overflow: 'hidden', backgroundColor: has ? 'transparent' : C.bg, borderWidth: has ? 0 : 1, borderColor: C.line }}>
      <Photo uri={S.biz?.logo_url} color={S.st?.color ?? C.accent} letter={String(S.biz?.name ?? 'Κ').slice(0, 1)} style={{ borderRadius: size * 0.27 }} />
    </View>
  );
}

// Κεφαλαία στα ελληνικά χωρίς τόνους (ΓΥΜΝΑΣΤΗΡΙΟ, όχι ΓΥΜΝΑΣΤΉΡΙΟ).
export const upper = (x: string) => x.normalize('NFD').replace(/́/g, '').normalize('NFC').toUpperCase();

/* Κορυφή κάθε καρτέλας: «‹ SpotOn» και τα αρχικά σου (ο λογαριασμός), και από κάτω λογότυπο, όνομα καταστήματος και ο τίτλος της καρτέλας. */
export function StoreTop({ title, right }: { title: string; right?: React.ReactNode }) {
  const S = useStore();
  const top = useSafeAreaInsets().top;
  if (useWide()) return <DeskTitle title={title} right={right} />;
  return (
    <View style={{ paddingTop: top + 8, paddingHorizontal: 20, paddingBottom: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ExitPill />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FavButton />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StoreLogo size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: C.mute, fontWeight: '800', fontSize: 11, letterSpacing: 1.8 }} numberOfLines={1}>{upper(String(S.biz?.name ?? ''))}</Text>
          <Text style={{ color: C.text, fontWeight: '600', fontSize: 17, marginTop: 2 }} numberOfLines={1}>{title}</Text>
        </View>
        {right}
      </View>
    </View>
  );
}

/* Καρδιά «Αγαπημένο»: αποθηκεύει το κατάστημα για να φαίνεται πάνω πάνω στην αρχική.
   Πάτημα → η καρδιά γίνεται κόκκινη και για λίγο φαίνεται η λέξη «Στα αγαπημένα», μετά μένει μόνο η κόκκινη καρδιά.
   Όχι αγαπημένο = κύκλος με περίγραμμα καρδιάς (φαίνεται και πάνω σε σκούρο εξώφυλλο). Επισκέπτης: ζητά σύνδεση. */
export function FavButton({ size = 34 }: { size?: number }) {
  const S = useStore();
  const P = usePerson();
  const favs = useFavorites();
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!S.biz) return null;
  const on = isFavorite(favs, S.biz.id);
  const press = () => {
    if (P.guest) return askLogin(`/store/${S.path}`);
    if (timer.current) clearTimeout(timer.current);
    setFlash(!on);
    if (!on) timer.current = setTimeout(() => setFlash(false), 1600);
    toggleFavorite(S.biz);
  };
  const word = on && flash;
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityState={{ selected: on }} hitSlop={6}
      accessibilityLabel={on ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
      style={({ pressed, hovered }: any) => ({ height: size, minWidth: size, borderRadius: size / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingHorizontal: word ? 12 : 0, backgroundColor: C.card, opacity: pressed || hovered ? 0.8 : 1 })}>
      <Heart size={15} filled={on} color={on ? C.bad : C.text} bg={C.card} />
      {word && <Text style={{ color: C.text, fontWeight: '800', fontSize: 13 }}>Στα αγαπημένα</Text>}
    </Pressable>
  );
}

/* Δημόσιος σύνδεσμος του καταστήματος. Στο web κρατά τη διεύθυνση της σελίδας που είσαι (π.χ. και στις προεπισκοπήσεις PR). */
export function storeLink(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const href = window.location.href.split('#')[0].split('?')[0];
    const i = href.indexOf('/store/');
    if (i >= 0) return `${href.slice(0, i)}/store/${encodeURIComponent(key)}`;
  }
  return `${WEB_URL}store/${encodeURIComponent(key)}`;
}

/* Κοινοποίηση της σελίδας του καταστήματος σε φίλους: στο κινητό ανοίγει το μενού κοινοποίησης του συστήματος
   (Viber, Messenger, WhatsApp…), στον υπολογιστή αντιγράφει τον σύνδεσμο και γράφει «Αντιγράφηκε». */
export function ShareButton({ size = 34 }: { size?: number }) {
  const S = useStore();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!S.biz) return null;
  const name = String(S.biz.name ?? '');
  const url = storeLink(String(S.biz.slug || S.id)); // με το όνομα (slug), όταν υπάρχει
  const flash = () => { if (timer.current) clearTimeout(timer.current); setCopied(true); timer.current = setTimeout(() => setCopied(false), 1800); };
  const press = async () => {
    const text = `${name} στο SpotOn · κλείσε ραντεβού online`;
    if (Platform.OS !== 'web') { Share.share({ title: name, message: `${text}\n${url}`, url }).catch(() => {}); return; }
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && nav?.share) { try { await nav.share({ title: name, text, url }); } catch {} return; }
    try { await nav?.clipboard?.writeText(url); flash(); }
    catch { if (nav?.share) nav.share({ title: name, text, url }).catch(() => {}); }
  };
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityLabel="Κοινοποίηση καταστήματος" hitSlop={6}
      style={({ pressed, hovered }: any) => ({ height: size, minWidth: size, borderRadius: size / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingHorizontal: copied ? 12 : 0, backgroundColor: C.card, opacity: pressed || hovered ? 0.8 : 1 })}>
      <Icon name={copied ? 'check' : 'share'} size={16} color={C.text} />
      {copied && <Text style={{ color: C.text, fontWeight: '800', fontSize: 13 }}>Αντιγράφηκε</Text>}
    </Pressable>
  );
}

/* Τα αρχικά σου πάνω δεξιά: ανοίγουν τον λογαριασμό (στοιχεία, ρυθμίσεις). Επισκέπτης: «Σύνδεση». */
export function AccountButton({ size = 34 }: { size?: number }) {
  const S = useStore();
  const P = usePerson();
  const router = useRouter();
  if (P.guest) return (
    <Pressable onPress={() => askLogin(`/store/${S.path}`)} accessibilityRole="button" hitSlop={6}
      style={({ pressed }) => ({ height: size, paddingHorizontal: 14, borderRadius: size / 2, backgroundColor: C.text, justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ color: C.bg, fontWeight: '800', fontSize: 13 }}>Σύνδεση</Text>
    </Pressable>
  );
  return (
    <Pressable onPress={() => router.push(`/store/${S.path}/account`)} accessibilityRole="button" accessibilityLabel="Ο λογαριασμός μου" hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Initials text={P.initials} size={size} />
    </Pressable>
  );
}

/* Πλαίσιο με το τελευταίο μήνυμα του καταστήματος (από τις τελευταίες 7 μέρες), πάνω στην Κράτηση.
   Όλα τα μηνύματα είναι στην καρτέλα «Κατάστημα». */
export function Notice({ style }: { style?: object }) {
  const S = useStore();
  const m = S.messages[0];
  if (!m || Date.now() - new Date(m.created_at).getTime() > 7 * 864e5) return null;
  const { subject, body } = splitMsg(m, String(S.biz?.name ?? ''));
  return (
    <View style={[style, { flexDirection: 'row', gap: 10, backgroundColor: alpha(C.text, 0.04), borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 13 }]}>
      <Text style={{ fontSize: 15 }}>📌</Text>
      <View style={{ flex: 1, gap: 2 }}>
        {!!subject && <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>{subject}</Text>}
        <Text style={{ color: C.text, fontSize: 13.5, lineHeight: 19 }} numberOfLines={3}>{body}</Text>
        <Text style={{ color: C.mute, fontSize: 11.5, marginTop: 2 }}>Από το κατάστημα · {when(m.created_at)}</Text>
      </View>
    </View>
  );
}

const when = (ts: string) => {
  const d = new Date(ts), now = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return `σήμερα ${hm}`;
  return `${d.getDate()}/${d.getMonth() + 1} · ${hm}`;
};
// Ο τίτλος είναι «Όνομα καταστήματος · θέμα»· δείχνουμε μόνο το θέμα.
const splitMsg = (m: any, name: string) => ({ subject: String(m.title).slice(name.length).replace(/^\s*·\s*/, ''), body: String(m.body ?? '') });

/* Οι ανακοινώσεις του καταστήματος σαν φυσαλίδες (καρτέλα «Κατάστημα»). */
export function MessageList() {
  const S = useStore();
  const name = String(S.biz?.name ?? '');
  return (
    <View style={{ gap: 10 }}>
      {S.messages.map((m) => {
        const { subject, body } = splitMsg(m, name);
        return (
          <View key={m.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <StoreLogo size={30} />
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 18, borderBottomLeftRadius: 6, padding: 14, gap: 4 }}>
              {!!subject && <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{subject}</Text>}
              <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{body}</Text>
              <Text style={{ color: C.mute, fontSize: 11, alignSelf: 'flex-end' }}>{when(m.created_at)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* Υπόλοιπο πακέτου σε μικρό κουτάκι (9/12): το μόνο σημείο του πακέτου έξω από τις «Οι κρατήσεις μου». */
export function Credits() {
  const S = useStore();
  const pack = S.pack ?? (S.packInfo && !S.packInfo.pending && S.packInfo.total ? { left: S.packInfo.left, total: S.packInfo.total } : null);
  if (!pack) return null;
  return (
    <View accessibilityLabel={`Πακέτο: απομένουν ${pack.left} από ${pack.total}`} style={{ alignItems: 'center', backgroundColor: C.soft, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{pack.left}<Text style={{ color: C.mute, fontWeight: '600', fontSize: 12 }}>/{pack.total}</Text></Text>
      <Text style={{ color: C.mute, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5 }}>ΠΑΚΕΤΟ</Text>
    </View>
  );
}
