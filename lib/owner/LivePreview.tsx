import { useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../Txt';
import { Btn, C, Icon, alpha, price, shadow } from '../ui';
import { Photo, Scrim } from '../Photo';
import { screenFor } from '../bizscreen';
import { styleOf } from '../presets';
import { svcKind } from './svcKind';
import { PagePreview, upper } from './PagePreview';
import { DAYNAME, WEEK, type Hours, type Svc } from './save';

/* Ο οδηγός «Νέα επιχείρηση» στον υπολογιστή: δεξιά η σελίδα του καταστήματος όπως θα τη δει ο πελάτης στον υπολογιστή,
   μέσα σε ένα παράθυρο browser. Γεμίζει από ό,τι έχει γράψει μέχρι τώρα ο ιδιοκτήτης. Δεν πατιέται τίποτα. */
const dur = (m: number) => (m >= 60 && m % 60 === 0 ? `${m / 60} ${m === 60 ? 'ώρα' : 'ώρες'}` : m > 60 ? `${Math.floor(m / 60)}ω ${m % 60}′` : `${m}′`);
const cents = (p: string) => (p ? Math.round(parseFloat(p.replace(',', '.')) * 100) : null);
const DAY = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];

export function DeskPreview({ biz, svcs, hours }: { biz: any; svcs: Svc[]; hours: Hours }) {
  const cat = biz.category ?? 'other';
  const scr = screenFor(cat);
  const k = svcKind(cat);
  const brand = styleOf(biz).color;
  const name = biz.name?.trim() || 'Το κατάστημά σου';
  const where = [biz.city, biz.address].filter(Boolean).join(' · ');
  const all = svcs.filter((x) => x.name.trim());
  const list = all.slice(0, 6);
  const open = WEEK.filter((d) => hours.some((h) => h.svc === null && h.weekday === d));

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="eye" size={14} color={C.mute} />
        <Text style={{ color: C.mute, fontWeight: '700', fontSize: 12.5 }}>Η σελίδα σου, όπως τη βλέπουν οι πελάτες στον υπολογιστή</Text>
      </View>
      <View style={[{ borderRadius: 18, overflow: 'hidden', backgroundColor: C.bg }, shadow(3)]}>
        {/* μπάρα browser */}
        <View style={{ height: 34, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 }}>
          {[0, 1, 2].map((n) => <View key={n} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.line }} />)}
          <View style={{ marginLeft: 10, backgroundColor: C.bg, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 12, maxWidth: '70%' }}>
            <Text style={{ color: C.mute, fontSize: 11 }} numberOfLines={1}>spoton · {name}</Text>
          </View>
        </View>

        {/* κορυφή: εξώφυλλο, λογότυπο, όνομα */}
        <View style={{ height: 210, backgroundColor: C.banner }}>
          <Photo uri={biz.cover_url} color={brand} />
          <Scrim strength={0.7} photo={biz.cover_url} />
          <View style={{ position: 'absolute', left: 24, right: 24, bottom: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <View style={{ width: 66, height: 66, borderRadius: 16, backgroundColor: '#ffffff', padding: 3 }}>
              <Photo uri={biz.logo_url} color={brand} letter={name.slice(0, 1)} style={{ borderRadius: 13 }} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 1, opacity: 0.9 }}>{upper(scr.kicker)}</Text>
              <Text style={{ color: '#ffffff', fontSize: 27, fontWeight: '800', letterSpacing: -0.5 }} numberOfLines={1}>{name}</Text>
              {!!where && <Text style={{ color: '#ffffff', fontSize: 13, opacity: 0.9 }} numberOfLines={1}>📍 {where}</Text>}
            </View>
          </View>
        </View>

        {/* σώμα: υπηρεσίες αριστερά, κράτηση + ωράριο δεξιά */}
        <View style={{ flexDirection: 'row', gap: 20, padding: 22 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 9 }}>
            {!!biz.description?.trim() && <Text style={{ color: C.mute, fontSize: 13, lineHeight: 19, marginBottom: 4 }} numberOfLines={3}>{biz.description.trim()}</Text>}
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{k.mode === 'class' ? 'Μαθήματα' : scr.services}</Text>
            {list.length === 0 && <Text style={{ color: C.mute, fontSize: 13 }}>Εδώ θα φαίνονται οι {k.many} σου.</Text>}
            {list.map((x) => {
              const c = cents(x.price);
              return (
                <View key={x.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.card }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 13.5 }} numberOfLines={1}>{x.name.trim()}</Text>
                    <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>{dur(+x.duration_min || 30)}{+x.capacity > 1 ? ` · έως ${x.capacity} άτομα` : ''}</Text>
                  </View>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 13.5 }}>{c != null ? `${x.from ? 'από ' : ''}${price(c)}` : k.mode === 'visit' ? 'Κατόπιν εκτίμησης' : ''}</Text>
                </View>
              );
            })}
            {all.length > list.length && <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>και {all.length - list.length} ακόμα</Text>}
          </View>
          <View style={{ width: '36%', gap: 10 }}>
            <View style={{ height: 42, borderRadius: 21, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.bg, fontWeight: '800', fontSize: 14 }}>{k.mode === 'class' ? 'Δες το πρόγραμμα' : scr.cta}</Text>
            </View>
            {!!biz.phone?.trim() && biz.show_phone !== false && (
              <View style={{ borderRadius: 14, backgroundColor: C.card, padding: 12, gap: 4 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 12.5 }}>Επικοινωνία</Text>
                {!!biz.phone?.trim() && <Text style={{ color: C.mute, fontSize: 12 }} numberOfLines={1}>📞 {biz.phone.trim()}</Text>}
              </View>
            )}
            {open.length > 0 && (
              <View style={{ borderRadius: 14, backgroundColor: C.card, padding: 12, gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 12.5 }}>Ωράριο</Text>
                <Text style={{ color: C.mute, fontSize: 12 }}>Ανοιχτά {open.map((d) => DAY[d]).join(' ')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      {!biz.is_published && <Text style={{ color: C.mute, fontSize: 12, textAlign: 'center' }}>Η σελίδα δεν θα φαίνεται στην αναζήτηση μέχρι να τη δημοσιεύσεις.</Text>}
    </View>
  );
}

/* Ο οδηγός στο κινητό: πλωτό κουμπί «Προεπισκόπηση» πάνω από το «Συνέχεια». */
export function PreviewPill({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Προεπισκόπηση της σελίδας σου" hitSlop={6}
      style={({ pressed }) => [{ position: 'absolute', right: 20, bottom: '100%', marginBottom: 14, height: 44, borderRadius: 22, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, opacity: pressed ? 0.8 : 1 }, shadow(3)]}>
      <Icon name="eye" size={16} color={C.text} />
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 14.5 }}>Προεπισκόπηση</Text>
    </Pressable>
  );
}

/* Πατημένο: ανεβαίνει από κάτω όλη η σελίδα, όπως τη βλέπει ο πελάτης στο κινητό. Δεν πατιέται τίποτα μέσα.
   Κλείνει με το ✕, με το «Πίσω στην επεξεργασία» ή σέρνοντάς το προς τα κάτω (από πάνω, ή από τη σελίδα όταν είναι στην αρχή της). */
export function PreviewSheet({ biz, svcs, hours, onClose }: { biz: any; svcs: Svc[]; hours: Hours; onClose: () => void }) {
  const { top, bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const y = useRef(new Animated.Value(0)).current;
  const atTop = useRef(true);
  const close = useRef(onClose); close.current = onClose;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => atTop.current && g.dy > 8 && g.dy > Math.abs(g.dx) * 1.5,
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 1) Animated.timing(y, { toValue: height, duration: 200, useNativeDriver: false }).start(() => close.current());
      else Animated.spring(y, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: false }).start(),
  })).current;
  const dim = y.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: 'clamp' });
  const cat = biz.category ?? 'other';
  const scr = screenFor(cat);
  const k = svcKind(cat);
  const all = svcs.filter((x) => x.name.trim());
  const days = WEEK.map((d) => {
    const sl = hours.filter((h) => h.svc === null && h.weekday === d).sort((a, z) => a.opens.localeCompare(z.opens));
    return { d, txt: sl.length ? sl.map((h) => `${h.opens.slice(0, 5)} – ${h.closes.slice(0, 5)}`).join(', ') : 'Κλειστά' };
  });
  const phone = biz.phone?.trim() && biz.show_phone !== false ? biz.phone.trim() : '';
  const title = (x: string) => <Text style={{ color: C.text, fontWeight: '800', fontSize: 21, letterSpacing: -0.3, marginTop: 22, marginBottom: 4 }}>{x}</Text>;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, paddingTop: top + 10 }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: alpha('#000000', 0.35), opacity: dim }} />
        <Animated.View {...pan.panHandlers} style={{ flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', transform: [{ translateY: y }] }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginTop: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>Η σελίδα σου</Text>
              <Text style={{ color: C.mute, fontSize: 13 }}>Έτσι τη βλέπουν οι πελάτες</Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Κλείσιμο" hitSlop={8}
              style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Icon name="close" size={14} color={C.text} />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} scrollEventThrottle={16}
            onScroll={(e) => { atTop.current = e.nativeEvent.contentOffset.y <= 0; }}>
            <PagePreview biz={biz} bare />
            <View style={{ paddingHorizontal: 20 }}>
              {!!biz.description?.trim() && <Text style={{ color: C.mute, fontSize: 15, lineHeight: 22, marginTop: 18 }}>{biz.description.trim()}</Text>}
              {title(k.mode === 'class' ? 'Μαθήματα' : scr.services)}
              {all.length === 0 && <Text style={{ color: C.mute, fontSize: 14, paddingVertical: 10 }}>Εδώ θα φαίνονται οι {k.many} σου.</Text>}
              {all.map((x, n) => {
                const c = cents(x.price);
                return (
                  <View key={x.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: n < all.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{x.name.trim()}</Text>
                      <Text style={{ color: C.mute, fontSize: 13 }}>{dur(+x.duration_min || 30)}{+x.capacity > 1 ? ` · έως ${x.capacity} άτομα` : ''}</Text>
                    </View>
                    <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{c != null ? `${x.from ? 'από ' : ''}${price(c)}` : k.mode === 'visit' ? 'Κατόπιν εκτίμησης' : ''}</Text>
                  </View>
                );
              })}
              {(!!biz.city?.trim() || !!phone) && title('Επικοινωνία')}
              {!!(biz.address?.trim() || biz.city?.trim()) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                  <Icon name="pin" size={16} color={C.mute} />
                  <Text style={{ color: C.text, fontSize: 15, flex: 1 }}>{[biz.address, biz.city].filter((v: string) => v?.trim()).join(', ')}</Text>
                </View>
              )}
              {!!phone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                  <Icon name="phone" size={16} color={C.mute} />
                  <Text style={{ color: C.text, fontSize: 15 }}>{phone}</Text>
                </View>
              )}
              {hours.some((h) => h.svc === null) && title('Ωράριο')}
              {hours.some((h) => h.svc === null) && days.map(({ d, txt }) => (
                <View key={d} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 }}>
                  <Text style={{ color: C.text, fontSize: 15 }}>{DAYNAME[d]}</Text>
                  <Text style={{ color: txt === 'Κλειστά' ? C.mute : C.text, fontSize: 15 }}>{txt}</Text>
                </View>
              ))}
              {!biz.is_published && <Text style={{ color: C.mute, fontSize: 12.5, textAlign: 'center', marginTop: 18 }}>Η σελίδα δεν θα φαίνεται στην αναζήτηση μέχρι να τη δημοσιεύσεις.</Text>}
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottom + 16, borderTopWidth: 1, borderTopColor: C.line }}>
            <Btn kind="ghost" title="Πίσω στην επεξεργασία" onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
