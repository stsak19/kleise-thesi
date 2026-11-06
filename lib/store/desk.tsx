import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../Txt';
import { usePerson } from '../profile/data';
import { Initials } from '../profile/parts';
import { C, Icon, fmtDay, price, s } from '../ui';
import type { IconName } from '../Icon';
import { useStore } from './data';
import { ExitPill, StoreLogo } from './parts';
import { askLogin } from '../guest';

/* Το κατάστημα σε υπολογιστή: σαν ξεχωριστή εφαρμογή, με δική του πάνω μπάρα (‹ SpotOn, λογότυπο και όνομα, καρτέλες,
   Σύνδεση ή ο λογαριασμός), περιεχόμενο σε στήλη στη μέση και δεξιά η κράτησή σου, το πακέτο, οι υπηρεσίες και το ωράριο.
   Στο κινητό μένει η κάτω μπάρα. */

export function StoreTopBar({ items, state, navigateToTab }: { items: Record<string, { icon: IconName; label: string }>; state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void }) {
  const S = useStore();
  const P = usePerson();
  const activeKey = state.routes[state.index]?.key;
  const profile = state.routes.find((r) => r.name === 'profile');
  return (
    <View style={[s.row, { gap: 20, paddingVertical: 12, paddingHorizontal: 40, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg }]}>
      <ExitPill />
      <View style={[s.row, { gap: 10, flex: 1, minWidth: 0 }]}>
        <StoreLogo size={40} />
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{S.biz?.name ?? ''}</Text>
          <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>{[S.biz?.address, S.biz?.city].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <View style={[s.row, { gap: 4 }]}>
        {state.routes.filter((r) => items[r.name]).map((r) => {
          const on = r.key === activeKey;
          return (
            <Pressable key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={({ pressed, hovered }: any) => [s.row, { gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
                backgroundColor: on ? C.text : pressed || hovered ? C.soft : 'transparent' }]}>
              <Icon name={items[r.name].icon} size={17} color={on ? C.bg : C.text} />
              <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 14 }}>{items[r.name].label}</Text>
            </Pressable>
          );
        })}
      </View>
      {P.guest ? (
        <Pressable onPress={() => askLogin()} accessibilityRole="button"
          style={({ pressed, hovered }: any) => ({ paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: C.text, opacity: pressed || hovered ? 0.85 : 1 })}>
          <Text style={{ color: C.bg, fontWeight: '800', fontSize: 14 }}>Σύνδεση</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => profile && navigateToTab(profile.key)} accessibilityLabel="Προφίλ" style={({ hovered }: any) => ({ opacity: hovered ? 0.8 : 1 })}>
          <Initials text={P.initials} size={38} />
        </Pressable>
      )}
    </View>
  );
}

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 10 }}>
    <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{title}</Text>
    {children}
  </View>
);

export function StoreAside() {
  const S = useStore();
  // Ωράριο: μία γραμμή ανά μέρα (ενώνει τα διαστήματα της ίδιας μέρας).
  const hours = WEEK.map((wd) => {
    const h = S.hours.filter((x) => x.weekday === wd && !x.service_id).sort((a, b) => a.opens.localeCompare(b.opens));
    const any = h.length ? h : S.hours.filter((x) => x.weekday === wd);
    return { wd, text: any.length ? [...new Set(any.map((x) => `${x.opens.slice(0, 5)} – ${x.closes.slice(0, 5)}`))].join(', ') : 'Κλειστά' };
  });
  const today = new Date().getDay();
  return (
    <ScrollView style={{ width: 340, flexGrow: 0 }} contentContainerStyle={{ gap: 14, paddingVertical: 26, paddingRight: 32 }}>
      {S.upcoming.length > 0 && (
        <Box title={S.upcoming.length === 1 ? 'Η κράτησή σου' : 'Οι κρατήσεις σου'}>
          {S.upcoming.slice(0, 4).map((b: any, i: number) => (
            <View key={b.id} style={[s.row, { gap: 10, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{String(b.time).slice(0, 5)}</Text>
                <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{fmtDay(b.date)} · {b.service}</Text>
              </View>
              <Pressable onPress={() => S.cancelBooking(b)} style={({ hovered }: any) => ({ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, backgroundColor: hovered ? C.line : C.btn })}>
                <Text style={{ color: C.bad, fontWeight: '700', fontSize: 13 }}>Ακύρωση</Text>
              </Pressable>
            </View>
          ))}
        </Box>
      )}
      {!!S.pack && (
        <Box title="Το πακέτο σου">
          <View style={[s.row, { alignItems: 'baseline', gap: 6 }]}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 28 }}>{S.pack.left}</Text>
            <Text style={{ color: C.mute, fontWeight: '600', fontSize: 15 }}>/ {S.pack.total} κρατήσεις</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.soft }}>
            <View style={{ width: `${Math.min(100, (100 * S.pack.left) / S.pack.total)}%`, height: 6, borderRadius: 3, backgroundColor: C.text }} />
          </View>
          {!!S.pack.expires && <Text style={{ color: C.mute, fontSize: 13 }}>Ισχύει έως {fmtDay(S.pack.expires)}</Text>}
        </Box>
      )}
      {S.services.length > 0 && (
        <Box title="Υπηρεσίες">
          {S.services.map((x) => (
            <View key={x.id} style={[s.row, { gap: 10 }]}>
              <Text style={{ flex: 1, color: C.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{x.name}</Text>
              <Text style={{ color: C.mute, fontSize: 13 }}>{x.duration_min}′{x.price_cents != null ? ` · ${price(x.price_cents)}` : ''}</Text>
            </View>
          ))}
        </Box>
      )}
      {S.hours.length > 0 && (
        <Box title="Ωράριο">
          {hours.map((h) => (
            <View key={h.wd} style={[s.row, { gap: 10 }]}>
              <Text style={{ flex: 1, color: h.wd === today ? C.text : C.mute, fontWeight: h.wd === today ? '800' : '500', fontSize: 13 }}>{DAY[h.wd]}</Text>
              <Text style={{ color: h.wd === today ? C.text : C.mute, fontWeight: h.wd === today ? '700' : '500', fontSize: 13 }}>{h.text}</Text>
            </View>
          ))}
        </Box>
      )}
    </ScrollView>
  );
}

/* Τίτλος καρτέλας σε υπολογιστή: το κατάστημα φαίνεται ήδη στην πάνω μπάρα, εδώ μένει μόνο ο τίτλος. */
export function DeskTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 26, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 12, backgroundColor: C.bg }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 28, letterSpacing: -0.5 }} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
