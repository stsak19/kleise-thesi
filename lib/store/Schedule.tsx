import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../Txt';
import { Btn, C, DAYS, MONTHS, alpha, shadow } from '../ui';
import { readable } from '../theme';
import { useStore, type Slot } from './data';
import { Seats } from './Seats';
import { useBook } from './book';
import { screenFor } from '../bizscreen';
import { useWide } from '../wide';
import { useRouter } from 'expo-router';

const DAY_FULL = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

/* Το πρόγραμμα των μαθημάτων (γυμναστήριο, pilates): ανοίγει σε παράθυρο από το «Δες το πρόγραμμα» της αρχικής του καταστήματος.
   Λωρίδα ημερών, φίλτρο μαθημάτων, και οι ώρες με Κράτηση · Ακύρωση · Αναμονή · Απόσυρση.
   Το «Κράτηση» κλείνει το πρόγραμμα και ανοίγει την επιβεβαίωση (lib/store/BookUI). Κινητό: φύλλο από κάτω· υπολογιστής: στη μέση. */
export function ScheduleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  if (!open) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} accessibilityLabel="Κλείσιμο" />
      <View style={[wide
          ? { position: 'absolute', alignSelf: 'center', top: '6%', bottom: '6%', width: 620, borderRadius: 28 }
          : { position: 'absolute', left: 0, right: 0, bottom: 0, top: insets.top + 40, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
        { backgroundColor: C.bg, paddingTop: 10, overflow: 'hidden' }, shadow(3)]}>
        {!wide && <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 6 }} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 4 }}>
          <Text style={{ flex: 1, color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>Πρόγραμμα</Text>
          <Pressable onPress={onClose} accessibilityLabel="Κλείσιμο" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.mute, fontWeight: '800', fontSize: 15 }}>✕</Text>
          </Pressable>
        </View>
        <ScheduleList bottom={insets.bottom + 24} onBook={onClose} onPacks={onClose} />
      </View>
    </Modal>
  );
}

/* Το περιεχόμενο του προγράμματος (ημέρες, φίλτρο, ώρες). Μπαίνει στο παράθυρο του υπολογιστή (ScheduleSheet)
   και ως κανονική σελίδα στο κινητό (app/store/[id]/(tabs)/book.tsx, το ＋ της μπάρας). */
export function ScheduleList({ bottom, onBook, onPacks }: { bottom: number; onBook?: () => void; onPacks?: () => void }) {
  const router = useRouter();
  const S = useStore();
  const B = useBook();
  const multi = S.schedServices.length > 1;
  /* Γυμναστήριο με πακέτα και ο πελάτης δεν έχει ακόμα πακέτο: κανένα πρόγραμμα, μόνο «Χρειάζεσαι πακέτο» και κουμπί προς τα πακέτα
     (στο Κατάστημα). Μόλις ενεργοποιηθεί το πακέτο, εδώ εμφανίζεται το πρόγραμμα του πακέτου (2026-11-18). */
  if (S.layout === 'classes' && !!S.biz?.uses_credits && !S.hasPack) {
    const asked = S.pendingPack;
    return (
      <View style={{ paddingHorizontal: 28, paddingTop: 48, paddingBottom: bottom, alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 40 }}>{asked ? '⏳' : '🎟️'}</Text>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' }}>
          {asked ? `Ζήτησες το «${asked.name}»` : 'Πρώτα αγόρασε πακέτο'}
        </Text>
        <Text style={{ color: C.mute, fontSize: 14.5, lineHeight: 21, textAlign: 'center' }}>
          {asked ? 'Μόλις το πληρώσεις στο κατάστημα, εδώ θα δεις το πρόγραμμα του πακέτου σου και θα κλείνεις θέση.'
            : S.packages.length ? 'Για να δεις το πρόγραμμα και να κλείσεις θέση χρειάζεσαι πακέτο. Διάλεξε ένα στο Κατάστημα.'
            : 'Το κατάστημα δεν έχει βάλει ακόμα πακέτα.'}
        </Text>
        {!!S.packages.length && <Btn title={asked ? 'Τα πακέτα' : 'Δες τα πακέτα'} kind={asked ? 'ghost' : undefined} color={asked ? undefined : S.st?.color}
          onPress={() => (onPacks ? onPacks() : router.navigate(`/store/${S.id}` as any))} style={{ alignSelf: 'stretch', marginTop: 6 }} />}
      </View>
    );
  }
  const d = new Date(S.date + 'T00:00');
  const today = S.days[0];
  const ink = readable(S.st?.color ?? C.text); // ώρες και σήματα στο χρώμα του καταστήματος

  const Row = ({ sl, last }: { sl: Slot; last: boolean }) => {
    const st = S.state(sl), dis = S.busy === sl.sv.id + sl.time, w = S.waitAt(sl.sv, sl.time);
    const many = sl.capacity > 1;
    const seats = many && !!sl.sv.show_seats; // κουτάκια με τις κρατημένες θέσεις, αν το θέλει ο ιδιοκτήτης
    const tag = st === 'mine' ? (
      <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, backgroundColor: alpha(ink, 0.12) }}>
        <Text style={{ color: ink, fontSize: 11, fontWeight: '800' }}>✓ Έχεις κράτηση</Text>
      </View>
    ) : st === 'wait' ? (
      <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: C.mute }}>
        <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>Σε αναμονή{w?.position ? ` · ${w.position}ος` : ''}</Text>
      </View>
    ) : seats ? null : (
      <Text style={{ color: C.mute, fontSize: 12 }}>
        {st === 'full' ? 'Δεν υπάρχουν διαθέσιμες θέσεις' : many ? `${sl.free} ${sl.free === 1 ? 'θέση ελεύθερη' : 'θέσεις ελεύθερες'}` : 'Ελεύθερο'}
      </Text>
    );
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>
        <View style={{ flex: 1, gap: 7, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={{ color: st === 'full' ? C.mute : ink, fontSize: 28, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{sl.time}</Text>
            {(multi || S.layout === 'classes') && <Text style={{ flex: 1, color: C.mute, fontSize: 13 }} numberOfLines={1}>{sl.sv.name}</Text>}
          </View>
          {tag}
          {seats && <Seats taken={sl.taken} capacity={sl.capacity} />}
        </View>
        {st === 'mine' ? <Btn size="sm" kind="danger" title="Ακύρωση" disabled={dis} onPress={() => S.cancel(sl)} />
          : st === 'wait' ? <Btn size="sm" kind="ghost" title="Απόσυρση" disabled={dis} onPress={() => S.unwait(sl)} />
          : st === 'full' ? <Btn size="sm" kind="ghost" title="Αναμονή" disabled={dis} onPress={() => S.wait(sl)} />
          : <Btn size="sm" title="Κράτηση" color={S.st?.color} disabled={dis || (!!S.pack && S.pack.left <= 0)} onPress={() => { onBook?.(); B.confirmClass(sl); }} />}
      </View>
    );
  };

  return (
        <ScrollView contentContainerStyle={{ paddingBottom: bottom }} stickyHeaderIndices={[0]}>
        <View style={{ backgroundColor: C.bg }}>
          {/* λωρίδα ημερών */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
            {S.days.map((x) => {
              const dd = new Date(x + 'T00:00'), on = x === S.date;
              return (
                <Pressable key={x} onPress={() => S.setDate(x)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({ width: 52, height: 64, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: on ? C.accent : C.card, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
                  <Text style={{ color: on ? C.onAccent : C.mute, fontSize: 11, fontWeight: '600' }}>{x === today ? 'Σήμ.' : DAYS[dd.getDay()]}</Text>
                  <Text style={{ color: on ? C.onAccent : C.text, fontSize: 19, fontWeight: '800', marginTop: 2 }}>{dd.getDate()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {/* υπηρεσίες: φίλτρο στα μαθήματα, επιλογή στα ραντεβού */}
          {multi && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingTop: 12 }}>
              {[...(S.showAll ? [{ id: null as string | null, name: 'Όλα' }] : []), ...S.schedServices].map((x) => {
                const on = S.service === x.id;
                return (
                  <Pressable key={x.id ?? 'all'} onPress={() => S.setService(x.id)}
                    style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: on ? C.accent : 'transparent', borderWidth: 1, borderColor: on ? C.accent : C.line }}>
                    <Text style={{ color: on ? C.onAccent : C.text, fontSize: 13, fontWeight: '700' }}>{x.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {/* τίτλος ημέρας + υπόλοιπο πακέτου */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{DAY_FULL[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]}</Text>
              <Text style={{ color: C.mute, fontSize: 13, marginTop: 2 }}>{screenFor(S.biz?.category).times}</Text>
            </View>
          </View>
        </View>

        {!!S.packOnly && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ color: C.mute, fontSize: 13 }}>{S.schedServices.length === 1 ? `Το πακέτο σου είναι για ${S.schedServices[0].name}.` : `Βλέπεις τα μαθήματα του πακέτου σου: ${S.schedServices.map((x) => x.name).join(', ')}.`}</Text>
          </View>
        )}
        {!!S.pack && S.pack.left <= 0 && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>Τελείωσε το πακέτο σου</Text>
            <Text style={{ color: C.mute, fontSize: 13, marginTop: 2, lineHeight: 19 }}>Αν ακυρώσεις μία κράτηση σου επιστρέφεται. Για νέες ώρες, ανανέωσε στο κατάστημα.</Text>
          </View>
        )}
        {!!S.note && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: alpha(C.text, 0.04), borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ color: C.text, fontSize: 14 }}>📌 {S.note}</Text>
          </View>
        )}

        {S.slots === null ? (
          <Text style={{ color: C.mute, padding: 20 }}>Φόρτωση…</Text>
        ) : S.slots.length === 0 ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 56, alignItems: 'center', gap: 10 }}>
            <Text style={{ color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' }}>Ξεκουράσου 🖤</Text>
            <Text style={{ color: C.mute, fontSize: 14, textAlign: 'center' }}>
              {S.services.length === 0 ? 'Το κατάστημα δεν έχει ανοίξει ακόμα κρατήσεις.'
                : S.date === today ? 'Οι ώρες για σήμερα πέρασαν. Δες την επόμενη μέρα.' : 'Δεν υπάρχουν ώρες αυτή την ημέρα.'}
            </Text>
          </View>
        ) : (
          S.slots.map((sl, i) => <Row key={sl.sv.id + sl.time} sl={sl} last={i === S.slots!.length - 1} />)
        )}
        </ScrollView>
  );
}
