import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../../../lib/Txt';
import { Btn, C, DAYS, MONTHS, TAB_SPACE, alpha } from '../../../../lib/ui';
import { usePerson } from '../../../../lib/profile/data';
import { useStore, type Slot } from '../../../../lib/store/data';
import { Credits, Notice, StoreTop } from '../../../../lib/store/parts';
import { screenFor } from '../../../../lib/bizscreen';
import { useBook } from '../../../../lib/store/book';
import { BookHome, BookPage, BookSheet } from '../../../../lib/store/BookUI';
import { useWide } from '../../../../lib/wide';

const DAY_FULL = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

/* Πρόγραμμα (σχέδιο 1, όπως το Gym_Schedule): λωρίδα ημερών με κουτάκια, τίτλος ημέρας (το πακέτο
   φαίνεται πάνω δεξιά), και η λίστα με τις ώρες: Κράτηση · Ακύρωση · Αναμονή · Απόσυρση. */
export default function Program() {
  const S = useStore();
  const wide = useWide();
  const { p } = usePerson();
  if (S.layout && S.layout !== 'classes') {
    /* Ραντεβού: η ροή κράτησης (lib/store/book). Κινητό: υπηρεσίες + φύλλο βημάτων (πατάς υπηρεσία και ανοίγει)·
       υπολογιστής: όλα σε μία σελίδα. Πάνω πάνω το τελευταίο μήνυμα του καταστήματος. */
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StoreTop title={wide ? 'Κλείσε ραντεβού' : p.first_name ? `Γεια σου, ${p.first_name}` : 'Κλείσε ραντεβού'} right={<Credits />} />
        <ScrollView contentContainerStyle={{ paddingBottom: wide ? 40 : TAB_SPACE }}>
          <Notice style={{ marginHorizontal: 20, marginTop: wide ? 0 : 16, marginBottom: wide ? 14 : 0 }} />
          {wide ? <BookPage /> : <BookHome />}
        </ScrollView>
        <BookSheet />
      </View>
    );
  }
  return <Classes />;
}

/* Μαθήματα: το πρόγραμμα είναι το πρώτο βήμα· το «Κράτηση» ανοίγει την επιβεβαίωση. */
function Classes() {
  const S = useStore();
  const B = useBook();
  const { p } = usePerson();
  const multi = S.services.length > 1;
  const d = new Date(S.date + 'T00:00');
  const today = S.days[0];

  const Row = ({ sl, last }: { sl: Slot; last: boolean }) => {
    const st = S.state(sl), dis = S.busy === sl.sv.id + sl.time, w = S.waitAt(sl.sv, sl.time);
    const many = sl.capacity > 1;
    const tag = st === 'mine' ? (
      <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, backgroundColor: C.accent }}>
        <Text style={{ color: C.onAccent, fontSize: 11, fontWeight: '700' }}>✓ Έχεις κράτηση</Text>
      </View>
    ) : st === 'wait' ? (
      <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: C.mute }}>
        <Text style={{ color: C.text, fontSize: 11, fontWeight: '700' }}>Σε αναμονή{w?.position ? ` · ${w.position}ος` : ''}</Text>
      </View>
    ) : (
      <Text style={{ color: C.mute, fontSize: 12 }}>
        {st === 'full' ? 'Δεν υπάρχουν διαθέσιμες θέσεις' : many ? `${sl.free} ${sl.free === 1 ? 'θέση ελεύθερη' : 'θέσεις ελεύθερες'}` : 'Ελεύθερο'}
      </Text>
    );
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>
        <View style={{ flex: 1, gap: 7, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={{ color: st === 'full' ? C.mute : C.text, fontSize: 28, fontWeight: '500', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{sl.time}</Text>
            {(multi || S.layout === 'classes') && <Text style={{ flex: 1, color: C.mute, fontSize: 13 }} numberOfLines={1}>{sl.sv.name}</Text>}
          </View>
          {tag}
        </View>
        {st === 'mine' ? <Btn size="sm" kind="danger" title="Ακύρωση" disabled={dis} onPress={() => S.cancel(sl)} />
          : st === 'wait' ? <Btn size="sm" kind="ghost" title="Απόσυρση" disabled={dis} onPress={() => S.unwait(sl)} />
          : st === 'full' ? <Btn size="sm" kind="ghost" title="Αναμονή" disabled={dis} onPress={() => S.wait(sl)} />
          : <Btn size="sm" title="Κράτηση" disabled={dis || (!!S.pack && S.pack.left <= 0)} onPress={() => B.confirmClass(sl)} />}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title={p.first_name ? `Γεια σου, ${p.first_name}` : 'Πρόγραμμα'} right={<Credits />} />
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE }} stickyHeaderIndices={[0]}>
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
              {[...(S.layout === 'classes' ? [{ id: null as string | null, name: 'Όλα' }] : []), ...S.services].map((x) => {
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

        <Notice style={{ marginHorizontal: 20, marginTop: 12 }} />
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
      <BookSheet />
    </View>
  );
}
