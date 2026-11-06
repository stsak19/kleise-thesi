import { Linking, Platform, ScrollView, View } from 'react-native';
import { Text } from '../../../../lib/Txt';
import { Btn, C, Group, Row, TAB_SPACE, price } from '../../../../lib/ui';
import { useStore } from '../../../../lib/store/data';
import { useBook, firstName } from '../../../../lib/store/book';
import { Face, dur } from '../../../../lib/store/BookUI';
import { MessageList, StoreTop } from '../../../../lib/store/parts';
import { StorePacks } from '../../../../lib/store/Packs';
import { useWide } from '../../../../lib/wide';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_FULL = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const Head = ({ t }: { t: string }) => <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginTop: 10 }}>{t}</Text>;

/* Κατάστημα: ό,τι χρειάζεται ο πελάτης για να αποφασίσει, σε ένα μέρος. Περιγραφή, διεύθυνση, τηλέφωνο, κανόνες,
   ωράριο, υπηρεσίες με τιμές, η ομάδα και οι ανακοινώσεις του καταστήματος (πριν ήταν η καρτέλα «Μηνύματα»).
   Οι υπηρεσίες με τις τιμές μπαίνουν πρώτες, σε κάθε είδος καταστήματος.
   Ο λογαριασμός και οι ρυθμίσεις ανοίγουν από τα αρχικά πάνω δεξιά. Υπολογιστής: δύο στήλες, χωρίς δεξιά στήλη. */
export default function StoreInfo() {
  const S = useStore();
  const B = useBook();
  const wide = useWide();
  const biz = S.biz ?? {};
  const todayWd = new Date().getDay();
  const cancelText = (m: number) => m >= 1440 ? `${Math.round(m / 1440)} ${m >= 2880 ? 'μέρες' : 'μέρα'}` : m >= 60 ? `${Math.round(m / 60)} ${m >= 120 ? 'ώρες' : 'ώρα'}` : `${m} λεπτά`;
  const directions = () => {
    const q = encodeURIComponent([biz.address, biz.city].filter(Boolean).join(', '));
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
  };
  const phone = biz.phone ? String(biz.phone).replace(/\s/g, '') : null;

  const contact = (
    <Group>
      {!!biz.address && <Row icon="pin" title={biz.address} sub={biz.city ? `${biz.city} · Οδηγίες` : 'Οδηγίες'} onPress={directions} />}
      {!!phone && <Row icon="phone" title={String(biz.phone)} sub="Κλήση" onPress={() => Linking.openURL(`tel:${phone}`)} />}
      <Row icon="clock" title="Κανόνες κρατήσεων" last
        sub={[biz.cancel_before_min ? `Δωρεάν ακύρωση έως ${cancelText(biz.cancel_before_min)} πριν.` : '', `Κρατήσεις έως ${biz.max_days_ahead ?? 14} μέρες μπροστά.`].filter(Boolean).join(' ')} />
    </Group>
  );

  const hours = S.hours.length > 0 && (
    <View style={{ gap: 8 }}>
      <Head t="Ωράριο" />
      <View style={{ borderRadius: 18, backgroundColor: C.card, overflow: 'hidden' }}>
        {WEEK.map((wd, i) => {
          const list = S.hours.filter((h) => h.weekday === wd).sort((a, z) => a.opens.localeCompare(z.opens));
          const on = wd === todayWd;
          return (
            <View key={wd} style={{ flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: C.line }}>
              <Text style={{ flex: 1, color: on ? C.text : C.mute, fontWeight: on ? '800' : '500', fontSize: 14.5 }}>{DAY_FULL[wd]}</Text>
              <Text style={{ color: on ? C.text : C.mute, fontWeight: on ? '800' : '500', fontSize: 14 }}>
                {list.length ? [...new Set(list.map((h) => `${h.opens.slice(0, 5)} – ${h.closes.slice(0, 5)}`))].join(', ') : 'Κλειστά'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const services = S.services.length > 0 && (
    <View>
      <Head t={S.layout === 'classes' ? 'Μαθήματα και τιμές' : 'Υπηρεσίες και τιμές'} />
      {S.services.map((sv, i) => (
        <View key={sv.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === S.services.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{sv.name}</Text>
            <Text style={{ color: C.mute, fontSize: 12.5 }}>{dur(sv.duration_min)}</Text>
          </View>
          {sv.price_cents != null
            ? <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{price(sv.price_cents)}</Text>
            : S.layout === 'classes' && <Text style={{ color: C.mute, fontWeight: '700', fontSize: 13 }}>Με πακέτο</Text>}
        </View>
      ))}
    </View>
  );

  const team = B.staff.length > 1 && (
    <View style={{ gap: 10 }}>
      <Head t="Η ομάδα" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {B.staff.map((st) => (
          <View key={st.id} style={{ width: 84, alignItems: 'center', gap: 4 }}>
            <Face st={st} size={56} />
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{firstName(st.name)}{B.favStaff?.id === st.id ? ' ♥' : ''}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const news = (
    <View style={{ gap: 10 }}>
      <Head t="Ανακοινώσεις" />
      {S.messages.length === 0
        ? <Text style={{ color: C.mute, fontSize: 14, lineHeight: 20 }}>Εδώ θα βλέπεις ό,τι σου στέλνει το κατάστημα: αλλαγές στο πρόγραμμα, ανακοινώσεις και υπενθυμίσεις.</Text>
        : <MessageList />}
    </View>
  );

  const about = !!biz.description && <Text style={{ color: C.mute, fontSize: 15, lineHeight: 22 }}>{biz.description}</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title={wide ? String(biz.name ?? 'Κατάστημα') : 'Κατάστημα'} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: wide ? 40 : TAB_SPACE }}>
        {wide ? (
          <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
            <View style={{ flex: 1.2, gap: 12, minWidth: 0 }}>{about}{services}<StorePacks />{news}</View>
            <View style={{ flex: 1, gap: 12, minWidth: 0 }}>{contact}{hours}{team}</View>
          </View>
        ) : (
          <>
            {about}
            {services}
            <StorePacks />
            {contact}
            {hours}
            {team}
            {news}
            {!!phone && <Btn kind="ghost" icon="phone" title="Κλήση στο κατάστημα" onPress={() => Linking.openURL(`tel:${phone}`)} style={{ marginTop: 8 }} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}
