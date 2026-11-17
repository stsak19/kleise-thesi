import { View } from 'react-native';
import { Text } from '../Txt';
import { C, Icon, price, shadow } from '../ui';
import { Photo, Scrim } from '../Photo';
import { screenFor } from '../bizscreen';
import { styleOf } from '../presets';
import { svcKind } from './svcKind';
import { upper } from './PagePreview';
import { WEEK, type Hours, type Svc } from './save';

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
