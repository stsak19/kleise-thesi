import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DragSheet, InfoButton } from '../DragSheet';
import { Text } from '../Txt';
import { Btn, C, Icon, price, shadow } from '../ui';
import { amountLabel as hrsTxt } from '../TimePick';
import { Photo, Scrim } from '../Photo';
import { screenFor } from '../bizscreen';
import { styleOf } from '../presets';
import { svcKind } from './svcKind';
import { upper } from './PagePreview';
import { DAYNAME, WEEK, type Hours, type Svc } from './save';

/* Ο οδηγός «Νέα επιχείρηση» στον υπολογιστή: δεξιά η σελίδα του καταστήματος όπως θα τη δει ο πελάτης στον υπολογιστή,
   μέσα σε ένα παράθυρο browser. Γεμίζει από ό,τι έχει γράψει μέχρι τώρα ο ιδιοκτήτης. Δεν πατιέται τίποτα. */
const dur = (m: number) => (m >= 60 && m % 60 === 0 ? `${m / 60} ${m === 60 ? 'ώρα' : 'ώρες'}` : m > 60 ? `${Math.floor(m / 60)}ω ${m % 60}′` : `${m}′`);
const cents = (p: string) => (p ? Math.round(parseFloat(p.replace(',', '.')) * 100) : null);
const DAY = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];

export function DeskPreview({ biz, svcs, hours }: { biz: any; svcs: Svc[]; hours: Hours; rules?: boolean }) {
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
            {list.length > 0 && <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{k.mode === 'class' ? 'Μαθήματα' : scr.services}</Text>}
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

/* Πατημένο: ανεβαίνει από κάτω η σελίδα όπως τη βλέπει ο πελάτης στο κινητό (app/store/[id]/(tabs)/index.tsx):
   εξώφυλλο, όνομα, κουμπάκια, υπηρεσίες. Το ⓘ πάνω δεξιά δείχνει τις πληροφορίες, όπως και στην πραγματική σελίδα. */
export function PreviewSheet({ biz, svcs, hours, rules, onClose }: { biz: any; svcs: Svc[]; hours: Hours; rules: boolean; onClose: () => void }) {
  const [info, setInfo] = useState(false);
  const cat = biz.category ?? 'other';
  const scr = screenFor(cat);
  const k = svcKind(cat);
  const color = styleOf(biz).color;
  const name = biz.name?.trim() || 'Το κατάστημά σου';
  const all = svcs.filter((x) => x.name.trim());
  const general = hours.filter((h) => h.svc === null);
  const days = WEEK.map((d) => {
    const sl = general.filter((h) => h.weekday === d).sort((a, z) => a.opens.localeCompare(z.opens));
    return { d, txt: sl.length ? sl.map((h) => `${h.opens.slice(0, 5)} – ${h.closes.slice(0, 5)}`).join(', ') : 'Κλειστά' };
  });
  const phone = biz.phone?.trim() && biz.show_phone !== false ? biz.phone.trim() : '';
  const head = (x: string) => <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginTop: 14 }}>{x}</Text>;
  const chip = (x: string) => (
    <View key={x} style={{ paddingVertical: 7, paddingHorizontal: 11, borderRadius: 11, backgroundColor: C.soft }}>
      <Text style={{ color: C.text, fontSize: 12.5, fontWeight: '700' }}>{x}</Text>
    </View>
  );
  const row = (icon: any, a: string, b: string, last?: boolean) => (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={16} color={C.text} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{a}</Text>
        <Text style={{ color: C.mute, fontSize: 13 }}>{b}</Text>
      </View>
    </View>
  );
  const cancel = +biz.cancel_before_min || 0;

  return (
    <DragSheet title="Η σελίδα σου" sub="Έτσι τη βλέπουν οι πελάτες" onClose={onClose}
      footer={<Btn kind="ghost" title="Πίσω στην επεξεργασία" onPress={onClose} />}>
      {!info ? (
        <>
          <View style={{ height: 170, backgroundColor: color }}>
            <Photo uri={biz.cover_url} color={color} />
            <View style={{ position: 'absolute', top: 12, right: 16 }}><InfoButton onPress={() => setInfo(true)} /></View>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 12 }}>
            <View>
              <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{name}</Text>
              <Text style={{ color: C.mute, fontSize: 13.5, fontWeight: '600', marginTop: 2 }} numberOfLines={2}>
                {[scr.kicker, [biz.address, biz.city].filter((v: string) => v?.trim()).join(', ')].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {!!phone && chip('📞 Κλήση')}
              {!!biz.address?.trim() && chip('📍 Οδηγίες')}
            </View>
            {all.length > 0 && head(k.mode === 'class' ? 'Μαθήματα' : 'Υπηρεσίες και τιμές')}
            {all.map((x) => {
              const c = cents(x.price);
              return (
                <View key={x.key} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 16, paddingRight: 12, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg }, shadow(1)]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.text, fontSize: 15.5, fontWeight: '800' }} numberOfLines={1}>{x.name.trim()}</Text>
                    <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                      {dur(+x.duration_min || 30)}{c != null ? ` · ${x.from ? 'από ' : ''}${price(c)}` : k.mode === 'class' ? ' · με πακέτο' : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingLeft: 12, paddingRight: 8, borderRadius: 999, backgroundColor: C.text }}>
                    <Text style={{ color: C.bg, fontWeight: '800', fontSize: 13 }}>{k.mode === 'class' ? 'Ώρες' : 'Κλείσε'}</Text>
                    <Icon name="chevron" size={14} color={C.bg} />
                  </View>
                </View>
              );
            })}
            {!biz.is_published && <Text style={{ color: C.mute, fontSize: 12.5, textAlign: 'center', marginTop: 10 }}>Η σελίδα δεν θα φαίνεται στην αναζήτηση μέχρι να τη δημοσιεύσεις.</Text>}
          </View>
        </>
      ) : (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Pressable onPress={() => setInfo(false)} hitSlop={6} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
            <Icon name="back" size={16} color={C.mute} />
            <Text style={{ color: C.mute, fontWeight: '700', fontSize: 14 }}>Πληροφορίες · πίσω στη σελίδα</Text>
          </Pressable>
          {!!biz.description?.trim() && <Text style={{ color: C.mute, fontSize: 15, lineHeight: 22 }}>{biz.description.trim()}</Text>}
          {(!!biz.address?.trim() || !!phone || rules) && (
            <View style={{ borderRadius: 18, backgroundColor: C.card, overflow: 'hidden' }}>
              {!!biz.address?.trim() && row('pin', biz.address.trim(), biz.city?.trim() ? `${biz.city.trim()} · Οδηγίες` : 'Οδηγίες', !phone && !rules)}
              {!!phone && row('phone', phone, 'Κλήση', !rules)}
              {rules && row('clock', 'Κανόνες κρατήσεων', [cancel ? `Δωρεάν ακύρωση έως ${hrsTxt(cancel)} πριν.` : '', `Κρατήσεις έως ${biz.max_days_ahead ?? 14} μέρες μπροστά.`].filter(Boolean).join(' '), true)}
            </View>
          )}
          {!biz.description?.trim() && !biz.address?.trim() && !phone && !rules && !general.length && (
            <Text style={{ color: C.mute, fontSize: 14, lineHeight: 21 }}>Εδώ θα φαίνονται διεύθυνση, τηλέφωνο, κανόνες και ωράριο, όταν τα συμπληρώσεις.</Text>
          )}
          {general.length > 0 && head('Ωράριο')}
          {general.length > 0 && (
            <View style={{ borderRadius: 18, backgroundColor: C.card, overflow: 'hidden' }}>
              {days.map(({ d, txt }, n) => (
                <View key={d} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: n < 6 ? 1 : 0, borderBottomColor: C.line }}>
                  <Text style={{ flex: 1, color: C.mute, fontSize: 14 }}>{DAYNAME[d]}</Text>
                  <Text style={{ color: C.mute, fontSize: 13.5 }}>{txt}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </DragSheet>
  );
}
