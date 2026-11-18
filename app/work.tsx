import { Linking, Pressable, View } from 'react-native';
import { Text } from '../lib/Txt';
import { Page } from '../lib/account/Page';
import { BizLogo } from '../lib/bookings/parts';
import { relDay } from '../lib/bookings/data';
import { styleOf } from '../lib/presets';
import { readable } from '../lib/theme';
import { useMyWork, type WorkItem } from '../lib/staff';
import { accessLabel } from '../lib/owner/Invite';
import { C, Card, Empty, fmtLong, iso, s } from '../lib/ui';

/* «Το πρόγραμμά μου» του υπαλλήλου: ανοίγει μετά την αποδοχή της πρόσκλησης και από το Προφίλ («Η δουλειά μου»).
   Για κάθε επιχείρηση όπου είναι στην ομάδα: τα ραντεβού του (ώρα, υπηρεσία, πελάτης, κλήση) και τα μαθήματα που κάνει
   (πόσοι έκλεισαν), για τις επόμενες 2 εβδομάδες. Μόνο ανάγνωση· τις αλλαγές τις κάνει ο ιδιοκτήτης. */
export default function WorkScreen() {
  const { list, nodb } = useMyWork();
  const today = iso(new Date());
  return (
    <Page title="Το πρόγραμμά μου" sub="Τα ραντεβού και τα μαθήματά σου, τις επόμενες 2 εβδομάδες">
      {list === null ? <Text style={{ color: C.mute }}>Φόρτωση…</Text>
        : nodb ? <Card><Empty icon="calendar" title="Δεν είναι έτοιμο ακόμα" text="Η βάση χρειάζεται την ενημέρωση 016 (πρόγραμμα υπαλλήλου)." /></Card>
        : list.length === 0 ? <Card><Empty icon="team" title="Δεν είσαι σε καμία ομάδα" text="Όταν μια επιχείρηση σου στείλει πρόσκληση και την αποδεχτείς, εδώ θα βλέπεις το πρόγραμμά σου." /></Card>
        : list.map((w) => {
          const color = styleOf({ category: w.category, brand_color: w.brand_color }).color;
          const ink = readable(color);
          const items = w.items.filter((x) => x.date >= today);
          const days = [...new Set(items.map((x) => x.date))];
          return (
            <View key={w.staff_id} style={{ gap: 10 }}>
              <View style={[s.row, { gap: 12, marginTop: 6 }]}>
                <BizLogo biz={w as any} name={w.business} color={color} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }} numberOfLines={1}>{w.business}</Text>
                  <Text style={{ color: C.mute, fontSize: 13 }}>{w.staff} · {accessLabel(w.access)}</Text>
                </View>
              </View>
              {days.length === 0 && <Card flat><Text style={{ color: C.mute, fontSize: 14 }}>Δεν έχεις ραντεβού τις επόμενες 2 εβδομάδες.</Text></Card>}
              {days.map((d) => (
                <Card key={d} style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{relDay(d) === 'Σήμερα' || relDay(d) === 'Αύριο' ? `${relDay(d)} · ${fmtLong(d)}` : fmtLong(d)}</Text>
                  </View>
                  {items.filter((x) => x.date === d).map((x, i, a) => <Line key={(x.id ?? x.service) + x.time} x={x} ink={ink} last={i === a.length - 1} />)}
                </Card>
              ))}
            </View>
          );
        })}
    </Page>
  );
}

function Line({ x, ink, last }: { x: WorkItem; ink: string; last: boolean }) {
  const call = x.phone ? () => Linking.openURL(`tel:${String(x.phone).replace(/\s/g, '')}`) : undefined;
  return (
    <View style={[s.row, { gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line }, last && { paddingBottom: 14 }]}>
      <Text style={{ color: ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'], width: 64 }}>{x.time}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{x.service}</Text>
        <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>
          {x.kind === 'class' ? `${x.count} από ${x.capacity} θέσεις κλεισμένες` : x.client || 'Πελάτης'}{` · ${x.duration}′`}
        </Text>
      </View>
      {call && (
        <Pressable onPress={call} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Κλήση ${x.client ?? ''}`}
          style={({ pressed }) => ({ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.soft, opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>📞 Κλήση</Text>
        </Pressable>
      )}
    </View>
  );
}
