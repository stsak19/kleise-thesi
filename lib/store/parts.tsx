import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Text } from '../Txt';
import { Photo } from '../Photo';
import { isLight } from '../theme';
import { C, Icon, alpha } from '../ui';
import type { IconName } from '../Icon';
import { useStore } from './data';

/* Η κάτω μπάρα του καταστήματος (σχέδιο 2): γυάλινο «χάπι» όπου η ενεργή καρτέλα δείχνει εικονίδιο και όνομα. */
export type StoreTabs = Record<string, { icon: IconName; label: string }>;
export function StoreBar({ items, state, navigateToTab }: { items: StoreTabs; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const bottom = useSafeAreaInsets().bottom;
  const light = isLight(C.bg);
  const activeKey = state.routes[state.index]?.key;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16, paddingBottom: Math.max(bottom, 10) + 6 }}>
      <BlurView intensity={light ? 40 : 30} tint={light ? 'light' : 'dark'} experimentalBlurMethod="dimezisBlurView"
        style={{ height: 58, borderRadius: 29, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6,
          backgroundColor: light ? alpha('#ffffff', 0.72) : alpha('#30302e', 0.65), borderWidth: 1, borderColor: light ? alpha('#000000', 0.06) : alpha('#ffffff', 0.1),
          boxShadow: `0px 10px 30px ${alpha(C.shade, light ? 0.12 : 0.4)}, inset 0px 1px 0px ${alpha('#ffffff', light ? 0.9 : 0.08)}` }}>
        {state.routes.filter((r) => items[r.name]).map((r) => {
          const on = r.key === activeKey, it = items[r.name];
          return (
            <Pressable key={r.key} onPress={() => { if (!on) navigateToTab(r.key); }}
              accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ height: 46, borderRadius: 23, paddingHorizontal: on ? 16 : 13, flexDirection: 'row', alignItems: 'center', gap: 7,
                backgroundColor: on ? C.accent : 'transparent', opacity: pressed ? 0.75 : 1 })}>
              <Icon name={it.icon} size={19} color={on ? C.onAccent : alpha(C.text, 0.5)} />
              {on && <Text style={{ color: C.onAccent, fontWeight: '700', fontSize: 14 }}>{it.label}</Text>}
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

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

/* Κορυφή κάθε καρτέλας: «‹ SpotOn», και από κάτω λογότυπο, όνομα καταστήματος και ο τίτλος της καρτέλας. */
export function StoreTop({ title, right }: { title: string; right?: React.ReactNode }) {
  const S = useStore();
  const top = useSafeAreaInsets().top;
  return (
    <View style={{ paddingTop: top + 8, paddingHorizontal: 20, paddingBottom: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg }}>
      <ExitPill />
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

/* Υπόλοιπο πακέτου σε μικρό μέγεθος (5/8 · στο πακέτο). */
export function Credits() {
  const { pack } = useStore();
  if (!pack) return null;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{pack.left}<Text style={{ color: C.mute, fontWeight: '600' }}>/{pack.total}</Text></Text>
      <Text style={{ color: C.mute, fontSize: 11 }}>στο πακέτο</Text>
    </View>
  );
}

/* Δαχτυλίδι προόδου (σχέδιο 8): πόσες προπονήσεις απομένουν από το πακέτο.
   Φτιαγμένο μόνο με View: δύο μισά δαχτυλίδια που γυρίζουν μέσα σε «παράθυρα» μισού πλάτους. */
export function Ring({ left, total, size = 92 }: { left: number; total: number; size?: number }) {
  const sw = 9, deg = 360 * Math.max(0, Math.min(1, left / Math.max(1, total)));
  const circle = (color: string) => ({ position: 'absolute' as const, top: 0, width: size, height: size, borderRadius: size / 2, borderWidth: sw, borderColor: color });
  const Half = ({ side, rot }: { side: 'right' | 'left'; rot: number }) => (
    <View style={{ position: 'absolute', top: 0, left: side === 'right' ? size / 2 : 0, width: size / 2, height: size, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, left: side === 'right' ? -size / 2 : 0, width: size, height: size, transform: [{ rotate: `${rot}deg` }] }}>
        <View style={{ position: 'absolute', top: 0, left: side === 'right' ? 0 : size / 2, width: size / 2, height: size, overflow: 'hidden' }}>
          <View style={[circle(C.text), { left: side === 'right' ? 0 : -size / 2 }]} />
        </View>
      </View>
    </View>
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[circle(alpha(C.text, 0.1)), { left: 0 }]} />
      {deg > 0 && <Half side="right" rot={Math.min(deg, 180)} />}
      {deg > 180 && <Half side="left" rot={deg - 180} />}
      <Text style={{ color: C.text, fontWeight: '800', fontSize: size * 0.26, letterSpacing: -0.5 }}>{left}</Text>
    </View>
  );
}
