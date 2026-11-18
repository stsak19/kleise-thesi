import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../../lib/Txt';
import { Btn, C, Group, Icon, Row, TAB_SPACE, alpha, onColor, price, shadow } from '../../../../lib/ui';
import { Photo } from '../../../../lib/Photo';
import { readable } from '../../../../lib/theme';
import { useStore } from '../../../../lib/store/data';
import { useBook, firstName } from '../../../../lib/store/book';
import { Face, UsualCard, dur } from '../../../../lib/store/BookUI';
import { Credits, ExitPill, FavButton, MessageList, Notice, StoreLogo } from '../../../../lib/store/parts';
import { StorePacks } from '../../../../lib/store/Packs';
import { screenFor } from '../../../../lib/bizscreen';
import { useWide } from '../../../../lib/wide';
import { useState } from 'react';
import { DragSheet, InfoButton } from '../../../../lib/DragSheet';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_FULL = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const Head = ({ t, c }: { t: string; c: string }) => <Text style={{ color: c, fontWeight: '800', fontSize: 18, marginTop: 14 }}>{t}</Text>;
const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/* Η αρχική του καταστήματος: μπαίνεις και βλέπεις πρώτα τα στοιχεία του (φωτογραφία, όνομα, αν είναι ανοιχτά, κλήση,
   οδηγίες, υπηρεσίες με τιμές, πακέτα). Στο κινητό η περιγραφή μένει κάτω από το όνομα· επικοινωνία, κανόνες, ωράριο, ομάδα και ανακοινώσεις
   είναι στο ⓘ πάνω δεξιά (φύλλο «Πληροφορίες»)· στον υπολογιστή στη σελίδα, όπως πριν.
   Ένα κουμπί ανά είδος ανοίγει το παράθυρο της κράτησης:
   - ραντεβού με ομάδα/πολλές υπηρεσίες (κομμωτήριο κ.λπ.): «Διάλεξε υπηρεσία» → βήματα (lib/store/BookUI · BookSheet)
   - ένα άτομο ή ιατρείο (personal, φυσιο, γιατρός): το κουμπί του είδους, π.χ. «Κλείσε προπόνηση» → ίδια βήματα
   - μαθήματα (γυμναστήριο, pilates): «Δες το πρόγραμμα» → πρόγραμμα (lib/store/Schedule)· χωρίς πακέτο μόνο για να δεις τις ώρες
   Κινητό: η κράτηση είναι το ＋ στη μέση της μπάρας του καταστήματος. Υπολογιστής: δεξιά κάρτα με το κουμπί και την επικοινωνία. */
export default function StoreHome() {
  const S = useStore();
  const B = useBook();
  const wide = useWide();
  const top = useSafeAreaInsets().top;
  const { cta, go } = B;
  const [info, setInfo] = useState(false);
  const biz = S.biz ?? {};
  const color = S.st?.color ?? C.accent;
  const ink = readable(color); // το χρώμα του καταστήματος σε τίτλους, τιμές και ώρες (εκδοχή Γ)
  const scr = screenFor(biz.category);
  const classes = S.layout === 'classes';


  // Ανοιχτά τώρα; (από το ωράριο της σημερινής μέρας)
  const now = new Date(), t = hm(now);
  const todayH = S.hours.filter((h) => h.weekday === now.getDay()).sort((a, z) => a.opens.localeCompare(z.opens));
  const openH = todayH.find((h) => h.opens.slice(0, 5) <= t && t < h.closes.slice(0, 5));
  const nextH = todayH.find((h) => h.opens.slice(0, 5) > t);
  const status = !S.hours.length ? null : openH ? { on: true, text: `Ανοιχτά · έως ${openH.closes.slice(0, 5)}` }
    : { on: false, text: nextH ? `Κλειστά · ανοίγει ${nextH.opens.slice(0, 5)}` : 'Κλειστά τώρα' };

  const cancelText = (m: number) => m >= 1440 ? `${Math.round(m / 1440)} ${m >= 2880 ? 'μέρες' : 'μέρα'}` : m >= 60 ? `${Math.round(m / 60)} ${m >= 120 ? 'ώρες' : 'ώρα'}` : `${m} λεπτά`;
  const directions = () => {
    const q = encodeURIComponent([biz.address, biz.city].filter(Boolean).join(', '));
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
  };
  // Το τηλέφωνο φαίνεται μόνο αν το θέλει ο ιδιοκτήτης (businesses.show_phone, migration 011).
  const phone = biz.phone && biz.show_phone !== false ? String(biz.phone).replace(/\s/g, '') : null;
  const call = () => phone && Linking.openURL(`tel:${phone}`);

  const Chip = ({ text, on, onPress }: { text: string; on?: boolean; onPress?: () => void }) => (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ paddingVertical: 7, paddingHorizontal: 11, borderRadius: 11, opacity: pressed ? 0.7 : 1,
      backgroundColor: on === true ? alpha(C.ok, 0.12) : C.soft })}>
      <Text style={{ color: on === true ? C.ok : C.text, fontSize: 12.5, fontWeight: '700' }}>{text}</Text>
    </Pressable>
  );

  /* ---------- κομμάτια ---------- */
  const title = (
    <View style={{ flexDirection: 'row', alignItems: wide ? 'flex-end' : 'center', gap: 12 }}>
      {/* Κινητό: η φωτογραφία προφίλ (βήμα «Εμφάνιση» του οδηγού) δίπλα στο όνομα, όχι πάνω στο εξώφυλλο */}
      {!wide && <StoreLogo size={52} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontSize: wide ? 30 : 24, fontWeight: '800', letterSpacing: -0.5 }}>{biz.name ?? ''}</Text>
        <Text style={{ color: C.mute, fontSize: 13.5, fontWeight: '600', marginTop: 2 }} numberOfLines={2}>
          {!!scr.kicker && <Text style={{ color: ink, fontWeight: '800' }}>{scr.kicker}</Text>}
          {[scr.kicker ? '' : null, [biz.address, biz.city].filter(Boolean).join(', ')].filter((x) => x !== null && (x || scr.kicker)).join(' · ')}
        </Text>
      </View>
      <Credits />
    </View>
  );
  const chips = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {!!status && <Chip text={status.text} on={status.on} />}
      {!!phone && <Chip text="📞 Κλήση" onPress={call} />}
      {!!biz.address && <Chip text="📍 Οδηγίες" onPress={directions} />}
    </View>
  );
  const about = !!biz.description && <Text style={{ color: C.mute, fontSize: 15, lineHeight: 22 }}>{biz.description}</Text>;

  // Μαθήματα (γυμναστήριο, pilates): η λίστα των μαθημάτων είναι στην κράτηση (＋ / «Δες το πρόγραμμα»), όχι στο κατάστημα (2026-11-18).
  const services = !classes && S.services.length > 0 && (
    <View>
      <Head c={ink} t="Υπηρεσίες και τιμές" />
      <Text style={{ color: C.mute, fontSize: 13, marginTop: 2, marginBottom: 10 }}>Πάτα μια υπηρεσία για να κλείσεις.</Text>
      <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', gap: 10 }}>
        {S.services.map((sv) => (
          <Pressable key={sv.id} onPress={() => B.start({ service: sv })}
            accessibilityRole="button" accessibilityLabel={`${sv.name}, κλείσε`}
            style={({ pressed, hovered }: any) => [{ width: wide ? '48.6%' : '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 16, paddingRight: 12,
              borderRadius: 18, borderWidth: 1, borderColor: hovered ? C.text : C.line, backgroundColor: C.bg, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow(1)]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: C.text, fontSize: 15.5, fontWeight: '800' }} numberOfLines={1}>{sv.name}</Text>
              <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                {dur(sv.duration_min)}{sv.price_cents != null ? <> · <Text style={{ color: ink, fontWeight: '800' }}>{price(sv.price_cents)}</Text></> : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingLeft: 12, paddingRight: 8, borderRadius: 999, backgroundColor: color }}>
              <Text style={{ color: onColor(color), fontWeight: '800', fontSize: 13 }}>Κλείσε</Text>
              <Icon name="chevron" size={14} color={onColor(color)} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const hours = S.hours.length > 0 && (
    <View style={{ gap: 8 }}>
      <Head c={ink} t="Ωράριο" />
      <View style={{ borderRadius: 18, backgroundColor: C.card, overflow: 'hidden' }}>
        {WEEK.map((wd, i) => {
          const list = S.hours.filter((h) => h.weekday === wd).sort((a, z) => a.opens.localeCompare(z.opens));
          const on = wd === now.getDay();
          return (
            <View key={wd} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: C.line }}>
              <Text style={{ flex: 1, color: on ? C.text : C.mute, fontWeight: on ? '800' : '500', fontSize: 14 }}>{DAY_FULL[wd]}</Text>
              <Text style={{ color: on ? C.text : C.mute, fontWeight: on ? '800' : '500', fontSize: 13.5 }}>
                {list.length ? [...new Set(list.map((h) => `${h.opens.slice(0, 5)} – ${h.closes.slice(0, 5)}`))].join(', ') : 'Κλειστά'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const rules = (
    <Group>
      {!!biz.address && <Row icon="pin" title={biz.address} sub={biz.city ? `${biz.city} · Οδηγίες` : 'Οδηγίες'} onPress={directions} />}
      {!!phone && <Row icon="phone" title={String(biz.phone)} sub="Κλήση" onPress={call} />}
      <Row icon="clock" title="Κανόνες κρατήσεων" last
        sub={[biz.cancel_before_min ? `Δωρεάν ακύρωση έως ${cancelText(biz.cancel_before_min)} πριν.` : '', `Κρατήσεις έως ${biz.max_days_ahead ?? 14} μέρες μπροστά.`].filter(Boolean).join(' ')} />
    </Group>
  );

  const team = B.staff.length > 1 && (
    <View style={{ gap: 10 }}>
      <Head c={ink} t="Η ομάδα" />
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

  const news = S.messages.length > 0 && (
    <View style={{ gap: 10 }}>
      <Head c={ink} t="Ανακοινώσεις" />
      <MessageList />
    </View>
  );

  /* ---------- υπολογιστής ---------- */
  if (wide) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 48 }}>
        <View style={{ height: 210, borderRadius: 26, overflow: 'hidden', backgroundColor: color }}>
          <Photo uri={biz.cover_url} color={color} />
        </View>
        <View style={{ flexDirection: 'row', gap: 36, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0, gap: 12, paddingHorizontal: 12 }}>
            <View style={{ marginTop: -44 }}><View style={[{ alignSelf: 'flex-start', borderRadius: 26, borderWidth: 4, borderColor: C.bg }, shadow(2)]}><StoreLogo size={84} /></View></View>
            {title}
            {chips}
            <Notice />
            {about}
            {services}
            <StorePacks />
            {team}
            {news}
          </View>
          <View style={{ width: 340, gap: 14, marginTop: 22 }}>
            <View style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 18, gap: 12, backgroundColor: C.bg }, shadow(2)]}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{classes ? 'Κλείσε θέση' : scr.cta}</Text>
              <Btn title={classes ? 'Δες το πρόγραμμα' : cta} color={color} onPress={go} disabled={!S.services.length} />
              {!classes && <UsualCard />}
            </View>
            {rules}
            {hours}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  /* ---------- κινητό ---------- */
  /* 2026-11-18 (επιλογή χρήστη): μπαίνεις και βλέπεις το κατάστημα, καθαρό. Πάνω δεξιά ⓘ (όλες οι πληροφορίες σε φύλλο) και ♥·
     όχι λογαριασμός (υπάρχει ήδη το Προφίλ του SpotOn). Μαθήματα (γυμναστήριο, pilates): μόνο τα πακέτα, από εδώ τα αγοράζεις·
     το πρόγραμμα είναι στο ＋ και ανοίγει μόλις έχεις πακέτο. Ραντεβού: υπηρεσίες και πακέτα. */
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_SPACE }}>
        <View style={{ height: 190 + top, backgroundColor: color }}>
          <Photo uri={biz.cover_url} color={color} />
          <View style={{ position: 'absolute', top: top + 8, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ExitPill />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <InfoButton onPress={() => setInfo(true)} />
              <FavButton />
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 12 }}>
          {title}
          <Notice />
          {!classes && <UsualCard />}
          {classes && S.hasPack && <Btn title="Το πρόγραμμά σου" icon="calendar" color={color} onPress={go} style={{ marginTop: 4 }} />}
          {classes && S.preview && S.services.length > 0 && <Btn kind="ghost" title="Δες τις ώρες των μαθημάτων" icon="calendar" onPress={go} style={{ marginTop: 4 }} />}
          {services}
          {classes && !S.packages.length ? (
            <Text style={{ color: C.mute, fontSize: 14, marginTop: 14, lineHeight: 20 }}>Το κατάστημα δεν έχει βάλει ακόμα πακέτα.</Text>
          ) : <StorePacks title={classes ? 'Διάλεξε πακέτο' : 'Πακέτα'} />}
        </View>
      </ScrollView>
      {info && (
        <DragSheet title="Πληροφορίες" sub={biz.name} onClose={() => setInfo(false)}>
          <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 24 }}>
            {chips}
            {about}
            {hours}
            <View style={{ gap: 8 }}><Head c={ink} t="Επικοινωνία και κανόνες" />{rules}</View>
            {team}
            {news}
          </View>
        </DragSheet>
      )}
    </View>
  );
}
