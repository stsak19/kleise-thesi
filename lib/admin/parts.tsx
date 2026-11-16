import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Text, TextInput } from '../Txt';
import type { IconName } from '../Icon';
import { Avatar, C, Icon, Pill, alpha, s } from '../ui';
import { useWide } from '../wide';
import { usePerson } from '../profile/data';
import { initials } from './data';

/* Το super admin: πλαϊνό μενού αριστερά (στο κινητό: λωρίδα επιλογών πάνω), περιεχόμενο δεξιά.
   Ίδιο ύφος με το admin της επιχείρησης (lib/owner/desk.tsx). */

export const NAV: { path: string; label: string; icon: IconName; badge?: 'reviews' | 'deletions' }[] = [
  { path: '/admin', label: 'Επισκόπηση', icon: 'home' },
  { path: '/admin/shops', label: 'Καταστήματα', icon: 'store' },
  { path: '/admin/people', label: 'Πελάτες', icon: 'user' },
  { path: '/admin/bookings', label: 'Κρατήσεις', icon: 'calendar' },
  { path: '/admin/reviews', label: 'Βαθμολογίες', icon: 'chat', badge: 'reviews' },
  { path: '/admin/deletions', label: 'Αιτήσεις διαγραφής', icon: 'close', badge: 'deletions' },
];
const sectionOf = (p: string) => (p.startsWith('/admin/shop') ? '/admin/shops' : p.startsWith('/admin/person') ? '/admin/people' : p.replace(/\/$/, '') || '/admin');

export function Shell({ children, badges }: { children: React.ReactNode; badges: Record<string, number> }) {
  const wide = useWide();
  const router = useRouter();
  const here = sectionOf(usePathname());
  const person = usePerson();
  const me = person.name || person.email || '';
  const item = (n: (typeof NAV)[number], compact = false) => {
    const on = here === n.path;
    const count = n.badge ? badges[n.badge] ?? 0 : 0;
    return (
      <Pressable key={n.path} onPress={() => router.navigate(n.path as any)}
        style={({ pressed, hovered }: any) => [s.row, { gap: 12, paddingVertical: compact ? 9 : 11, paddingHorizontal: 12, borderRadius: 12,
          backgroundColor: on ? C.text : pressed || hovered ? C.soft : 'transparent' }]}>
        <Icon name={n.icon} size={compact ? 16 : 19} color={on ? C.bg : C.text} />
        <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: compact ? 14 : 15, flexShrink: 1 }}>{n.label}</Text>
        {count > 0 && (
          <View style={{ marginLeft: compact ? 0 : 'auto', backgroundColor: on ? '#00e676' : C.bad, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 }}>
            <Text style={{ color: on ? '#000' : '#fff', fontSize: 12, fontWeight: '800' }}>{count}</Text>
          </View>
        )}
      </Pressable>
    );
  };
  const brand = (
    <View style={[s.row, { gap: 10, padding: 6 }]}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#00e676', fontWeight: '800', fontSize: 17 }}>S</Text>
      </View>
      <View>
        <View style={[s.row, { gap: 6 }]}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>SpotOn</Text>
          <View style={{ backgroundColor: '#0a0a0a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: '#00e676', fontWeight: '800', fontSize: 10, letterSpacing: 0.5 }}>ADMIN</Text>
          </View>
        </View>
        <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>Όλη η πλατφόρμα</Text>
      </View>
    </View>
  );
  const back = () => router.replace('/profile' as any);
  if (!wide) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.row, { paddingTop: 14, paddingHorizontal: 14, justifyContent: 'space-between' }]}>
        {brand}
        <Pressable onPress={back} hitSlop={8}><Text style={{ color: C.mute, fontWeight: '700' }}>Έξοδος</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.line }}
        contentContainerStyle={{ gap: 4, paddingHorizontal: 12, paddingVertical: 10 }}>
        {NAV.map((n) => item(n, true))}
      </ScrollView>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
      <View style={{ width: 248, backgroundColor: alpha(C.text, 0.02), borderRightWidth: 1, borderRightColor: C.line, paddingVertical: 20, paddingHorizontal: 14, gap: 4 }}>
        <View style={{ marginBottom: 14 }}>{brand}</View>
        {NAV.map((n) => item(n))}
        <View style={{ flex: 1 }} />
        <Pressable onPress={back} style={({ pressed, hovered }: any) => [s.row, { gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, backgroundColor: pressed || hovered ? C.soft : 'transparent' }]}>
          <Icon name="back" size={19} color={C.text} />
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>Πίσω στην εφαρμογή</Text>
        </Pressable>
        <View style={[s.row, { gap: 10, padding: 10, borderTopWidth: 1, borderTopColor: C.line, marginTop: 8 }]}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 13 }}>{initials(me) || '?'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{me}</Text>
            <Text style={{ color: C.mute, fontSize: 12 }}>Super admin</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

/* Σελίδα: τίτλος + δεξιά στοιχεία, και περιεχόμενο που κυλάει. */
export function Page({ title, sub, right, eyebrow, children }: { title: string; sub?: string; right?: React.ReactNode; eyebrow?: React.ReactNode; children: React.ReactNode }) {
  const wide = useWide();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: wide ? 32 : 16, paddingTop: wide ? 24 : 16, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', gap: wide ? 16 : 10, flexWrap: 'wrap' }}>
        <View style={[s.row, { gap: 14, flexShrink: 1, flexWrap: 'wrap' }]}>
          {eyebrow}
          <Text style={{ color: C.text, fontSize: wide ? 30 : 26, fontWeight: '800', letterSpacing: -0.6 }}>{title}</Text>
          {!!sub && <Text style={{ color: C.mute, fontWeight: '600', fontSize: 15 }}>{sub}</Text>}
        </View>
        {right && <View style={[s.row, { gap: 8, marginLeft: wide ? 'auto' : 0, flexWrap: 'wrap' }]}>{right}</View>}
      </View>
      {children}
    </ScrollView>
  );
}

/* Δύο στήλες στον υπολογιστή (κύρια + δεξιά 380px), μία στο κινητό. */
export function Cols({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  const wide = useWide();
  return (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
      <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 14, minWidth: 0 }}>{main}</View>
      <View style={{ width: wide ? 380 : undefined, alignSelf: 'stretch', gap: 14 }}>{side}</View>
    </View>
  );
}

export function Box({ title, action, onAction, children, style }: { title?: string; action?: string; onAction?: () => void; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: C.bg }, style]}>
      {!!title && (
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 6 }]}>
          <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>{title.toUpperCase()}</Text>
          {!!action && <Pressable onPress={onAction} hitSlop={8}><Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{action} →</Text></Pressable>}
        </View>
      )}
      {children}
    </View>
  );
}

/* Μία γραμμή λίστας: εικονίδιο/αρχικά, τίτλος + υπότιτλος, δεξιά κουμπιά ή ετικέτες. */
export function Line({ lead, title, sub, right, onPress, last }: { lead?: React.ReactNode; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean }) {
  const body = (
    <View style={[s.row, { gap: 12, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }]}>
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 14.5 }} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={{ color: C.mute, fontWeight: '600', fontSize: 12.5, marginTop: 1 }} numberOfLines={2}>{sub}</Text>}
      </View>
      {right && <View style={[s.row, { gap: 6 }]}>{right}</View>}
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} style={({ hovered }: any) => ({ backgroundColor: hovered ? alpha(C.text, 0.02) : 'transparent' })}>{body}</Pressable>;
}

export const Lead = ({ name, color, size = 30 }: { name: string; color?: string | null; size?: number }) => (
  <Avatar name={name} color={color ?? undefined} size={size} radius={size * 0.3} />
);
export const Person = ({ name, size = 32 }: { name: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: C.text, fontWeight: '800', fontSize: size * 0.38 }}>{initials(name) || '?'}</Text>
  </View>
);

/* Μικρό κουμπί με περίγραμμα (κόκκινο για τις επικίνδυνες ενέργειες). */
export function Small({ title, onPress, danger, dark }: { title: string; onPress: () => void; danger?: boolean; dark?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed, hovered }: any) => ({ borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 13,
      borderColor: dark ? C.text : danger ? alpha(C.bad, 0.35) : C.btn2Line,
      backgroundColor: dark ? C.text : pressed || hovered ? C.soft : C.bg })}>
      <Text style={{ color: dark ? C.bg : danger ? C.bad : C.text, fontWeight: '700', fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}

export const KV = ({ k, v, color, last }: { k: string; v: React.ReactNode; color?: string; last?: boolean }) => (
  <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line, gap: 12 }]}>
    <Text style={{ color: C.mute, fontWeight: '600', fontSize: 14 }}>{k}</Text>
    {typeof v === 'string' || typeof v === 'number'
      ? <Text style={{ color: color ?? C.text, fontWeight: '700', fontSize: 14, flexShrink: 1, textAlign: 'right' }} selectable>{v}</Text> : v}
  </View>
);

export const Kpi = ({ n, label, extra, bad }: { n: string | number; label: string; extra?: string; bad?: boolean }) => (
  <View style={{ flexGrow: 1, flexBasis: 160, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18 }}>
    <Text style={{ color: bad ? C.bad : C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>{n}</Text>
    <View style={[s.row, { gap: 6 }]}>
      <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      {!!extra && <Text style={{ color: C.ok, fontSize: 12, fontWeight: '800' }}>{extra}</Text>}
    </View>
  </View>
);

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const wide = useWide();
  return (
    <View style={[s.row, { flexGrow: 1, maxWidth: wide ? 460 : undefined, minWidth: wide ? 320 : undefined, borderWidth: 1, borderColor: C.btn2Line, borderRadius: 14, paddingHorizontal: 14, minHeight: 44, backgroundColor: C.bg }]}>
      <Icon name="search" size={17} color={C.mute} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.mute}
        style={[{ flex: 1, color: C.text, fontSize: 14.5, fontWeight: '600', paddingVertical: 10 }, { outlineStyle: 'none' } as any]} />
      {!!value && <Pressable onPress={() => onChange('')} hitSlop={8}><Icon name="close" size={15} color={C.mute} /></Pressable>}
    </View>
  );
}

export function Chips({ items, value, onChange }: { items: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((x) => {
        const on = x.key === value;
        return (
          <Pressable key={x.key} onPress={() => onChange(x.key)} style={{ borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: on ? C.text : C.soft }}>
            <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 13 }}>{x.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Tag = Pill;
export const Stars = ({ n }: { n: number }) => <Text style={{ color: C.text, fontWeight: '800' }}>★ {n}</Text>;
export const Loading = ({ error }: { error?: string | null }) => (
  <View style={{ padding: 40, alignItems: 'center' }}>
    <Text style={{ color: error ? C.bad : C.mute, fontWeight: '600', textAlign: 'center' }}>{error ? `Δεν φόρτωσε: ${error}` : 'Φόρτωση…'}</Text>
  </View>
);

/* Κατάσταση καταστήματος / λογαριασμού. */
export function ShopTag({ b }: { b: any }) {
  if (b.suspended) return <Pill text="Σε αναστολή" tone="bad" />;
  if (!b.is_published) return <Pill text="Πρόχειρο" />;
  if (b.services === 0) return <Pill text="Χωρίς υπηρεσίες" color="#b07600" />;
  return <Pill text="Δημοσιευμένο" tone="ok" />;
}

export function State({ u }: { u: any }) {
  if (u.is_admin) return <Pill text="Super admin" tone="accent" />;
  if (u.suspended) return <Pill text="Σε αναστολή" tone="bad" />;
  if (u.delete_requested_at) return <Pill text="Αίτηση διαγραφής" color="#b07600" />;
  if (u.owns) return <Pill text={u.owns > 1 ? `${u.owns} καταστήματα` : 'Καταστηματάρχης'} />;
  return <Pill text="Ενεργός" tone="ok" />;
}

/* Γραμμή πίνακα (κοινή με τη λίστα πελατών). */
export function Row({ cells, head, onPress, widths }: { cells: React.ReactNode[]; head?: boolean; onPress?: () => void; widths: number[] }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ hovered }: any) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
      paddingVertical: head ? 10 : 11, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: hovered ? '#00e67612' : 'transparent' })}>
      {cells.map((c, i) => (
        <View key={i} style={{ flex: widths[i], minWidth: 0 }}>
          {typeof c === 'string'
            ? <Text numberOfLines={1} style={head ? { color: C.mute, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 } : { color: C.text, fontWeight: '600', fontSize: 14 }}>{head ? c.toUpperCase() : c}</Text>
            : c}
        </View>
      ))}
    </Pressable>
  );
}
