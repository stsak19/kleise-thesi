import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatBar, type TabItems } from '../FloatBar';
import { Text } from '../Txt';
import { Photo } from '../Photo';
import { C, Icon, alpha } from '../ui';
import { useStore } from './data';
import { useWide } from '../wide';
import { DeskTitle } from './desk';
import { usePerson } from '../profile/data';
import { Initials } from '../profile/parts';
import { askLogin } from '../guest';

/* Η κάτω μπάρα του καταστήματος: η ίδια γυάλινη μπάρα του SpotOn (lib/FloatBar), με τη λέξη της ενεργής καρτέλας
   και πλάτος που αλλάζει με κίνηση. */
export type StoreTabs = TabItems;
export const StoreBar = (p: { items: StoreTabs; state: any; navigateToTab: (key: string) => void }) => <FloatBar {...p} labels />;

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

/* Λογότυπο του καταστήματος. */
export function StoreLogo({ size = 44 }: { size?: number }) {
  const S = useStore();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, overflow: 'hidden', backgroundColor: '#ffffff', borderWidth: 1, borderColor: C.line }}>
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
        <AccountButton />
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

/* Τα αρχικά σου πάνω δεξιά: ανοίγουν τον λογαριασμό (στοιχεία, ρυθμίσεις). Επισκέπτης: «Σύνδεση». */
export function AccountButton({ size = 34 }: { size?: number }) {
  const S = useStore();
  const P = usePerson();
  const router = useRouter();
  if (P.guest) return (
    <Pressable onPress={() => askLogin(`/store/${S.id}`)} accessibilityRole="button" hitSlop={6}
      style={({ pressed }) => ({ height: size, paddingHorizontal: 14, borderRadius: size / 2, backgroundColor: C.text, justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ color: C.bg, fontWeight: '800', fontSize: 13 }}>Σύνδεση</Text>
    </Pressable>
  );
  return (
    <Pressable onPress={() => router.push(`/store/${S.id}/account`)} accessibilityRole="button" accessibilityLabel="Ο λογαριασμός μου" hitSlop={6}
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
