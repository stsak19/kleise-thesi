import { Linking, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../../lib/Txt';
import { C, Group, Row, TAB_SPACE, fmtLong } from '../../../../lib/ui';
import { usePerson } from '../../../../lib/profile/data';
import { useStore } from '../../../../lib/store/data';
import { Ring, StoreTop } from '../../../../lib/store/parts';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_FULL = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const Head = ({ t }: { t: string }) => <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginTop: 10 }}>{t}</Text>;

/* Το προφίλ μου μέσα στο κατάστημα: το πακέτο μου (δαχτυλίδι, σχέδιο 8), στοιχεία και ωράριο του καταστήματος,
   και οι Ρυθμίσεις του SpotOn όπως είναι. */
export default function StoreProfile() {
  const S = useStore();
  const router = useRouter();
  const P = usePerson();
  const biz = S.biz ?? {};
  const pending = S.membership?.status === 'pending';
  const todayWd = new Date().getDay();
  const cancelText = (m: number) => m >= 1440 ? `${Math.round(m / 1440)} ${m >= 2880 ? 'μέρες' : 'μέρα'}` : m >= 60 ? `${Math.round(m / 60)} ${m >= 120 ? 'ώρες' : 'ώρα'}` : `${m} λεπτά`;
  const directions = () => {
    const q = encodeURIComponent([biz.address, biz.city].filter(Boolean).join(', '));
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title="Προφίλ" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: TAB_SPACE }}>
        {/* εγώ */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.onAccent, fontWeight: '800', fontSize: 20 }}>{P.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 20 }} numberOfLines={1}>{P.name || 'Ο λογαριασμός μου'}</Text>
            <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{P.email}</Text>
          </View>
        </View>

        {/* πακέτο */}
        {S.pack ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 22, backgroundColor: C.card }}>
            <Ring left={S.pack.left} total={S.pack.total} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>{S.pack.left === 1 ? 'απομένει' : 'απομένουν'}</Text>
              <Text style={{ color: C.mute, fontSize: 13 }}>από {S.pack.total} στο πακέτο</Text>
              {!!S.pack.expires && <Text style={{ color: C.mute, fontSize: 13 }}>λήγει {fmtLong(S.pack.expires)}</Text>}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 22, backgroundColor: C.card }}>
            <Ring left={S.upcoming.length} total={Math.max(1, S.upcoming.length)} size={72} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>{S.upcoming.length === 1 ? 'επερχόμενη κράτηση' : 'επερχόμενες κρατήσεις'}</Text>
              <Text style={{ color: C.mute, fontSize: 13 }}>{pending ? 'Το κατάστημα θα εγκρίνει σύντομα τον λογαριασμό σου.' : biz.uses_credits ? 'Δεν έχεις ενεργό πακέτο. Ανανέωσε στο κατάστημα.' : 'Χωρίς πακέτο: πληρώνεις στο κατάστημα.'}</Text>
            </View>
          </View>
        )}

        {/* το κατάστημα */}
        <Head t="Το κατάστημα" />
        {!!biz.description && <Text style={{ color: C.mute, fontSize: 15, lineHeight: 22 }}>{biz.description}</Text>}
        <Group>
          {!!biz.address && <Row icon="pin" title={biz.address} sub={biz.city ? `${biz.city} · Οδηγίες` : 'Οδηγίες'} onPress={directions} />}
          {!!biz.phone && <Row icon="phone" title={String(biz.phone)} sub="Κλήση" onPress={() => Linking.openURL(`tel:${String(biz.phone).replace(/\s/g, '')}`)} />}
          <Row icon="clock" title="Κανόνες κρατήσεων" last
            sub={[biz.cancel_before_min ? `Δωρεάν ακύρωση έως ${cancelText(biz.cancel_before_min)} πριν.` : '', `Κρατήσεις έως ${biz.max_days_ahead ?? 14} μέρες μπροστά.`].filter(Boolean).join(' ')} />
        </Group>

        {S.hours.length > 0 && <>
          <Head t="Ωράριο" />
          <View style={{ borderRadius: 18, backgroundColor: C.card, overflow: 'hidden' }}>
            {WEEK.map((wd, i) => {
              const list = S.hours.filter((h) => h.weekday === wd).sort((a, z) => a.opens.localeCompare(z.opens));
              const on = wd === todayWd;
              return (
                <View key={wd} style={{ flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: C.line }}>
                  <Text style={{ flex: 1, color: C.text, fontWeight: on ? '800' : '500', fontSize: 15 }}>{DAY_FULL[wd]}</Text>
                  <Text style={{ color: list.length ? C.text : C.mute, fontWeight: on ? '800' : '500', fontSize: 14 }}>
                    {list.length ? list.map((h) => `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}`).join(', ') : 'Κλειστά'}
                  </Text>
                </View>
              );
            })}
          </View>
        </>}

        {/* οι ρυθμίσεις του SpotOn, όπως είναι */}
        <Head t="Εφαρμογή" />
        <Group>
          <Row icon="user" title="Τα στοιχεία μου" sub="Όνομα, τηλέφωνο" onPress={() => router.push(`/store/${S.id}/me`)} />
          <Row icon="gear" title="Ρυθμίσεις" sub="Εμφάνιση, ειδοποιήσεις, κωδικός" onPress={() => router.push(`/store/${S.id}/settings`)} />
          <Row icon="back" title="Επιστροφή στο SpotOn" last onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </Group>
      </ScrollView>
    </View>
  );
}
