import { Text, View } from 'react-native';
import { C, Icon, alpha, s, shadow } from '../ui';
import { NIGHT } from '../theme';
import { screenFor } from '../bizscreen';
import { styleOf } from '../presets';
import { Photo, Scrim } from '../Photo';

/* Μικρή προεπισκόπηση της κορυφής της σελίδας, όπως τη βλέπει ο πελάτης.
   Ακολουθεί την «οθόνη» του είδους (lib/bizscreen.ts): photo, profile, clinic ή night. */
export const upper = (x: string) => x.normalize('NFD').replace(/́/g, '').normalize('NFC').toUpperCase();

export function PagePreview({ biz }: { biz: any }) {
  const scr = screenFor(biz.category);
  const st = styleOf(biz);
  const brand = st.color, r = st.radius;
  const night = scr.hero === 'night';
  const name = biz.name?.trim() || 'Το κατάστημά σου';
  const where = [biz.city, biz.address].filter(Boolean).join(' · ');
  const letter = name.slice(0, 1);
  const frame = [{ borderRadius: 22, overflow: 'hidden' as const, backgroundColor: night ? NIGHT.bg : C.bg }, shadow(2)];
  const logo = (size: number, round?: boolean) => (
    <View style={{ width: size, height: size, borderRadius: round ? size / 2 : r + 2, backgroundColor: '#ffffff', padding: round ? 3 : 2, ...shadow(1) }}>
      <Photo uri={biz.logo_url} color={brand} letter={letter} style={{ borderRadius: round ? size / 2 : r }} />
    </View>
  );

  if (scr.hero === 'profile') return (
    <View style={frame}>
      <View style={{ height: 96, backgroundColor: brand }}><Photo uri={biz.cover_url} color={brand} /><Scrim strength={0.5} /></View>
      <View style={{ alignItems: 'center', marginTop: -44, gap: 4, padding: 16, paddingTop: 0 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: C.bg, padding: 4 }}>
          <Photo uri={biz.logo_url} color={brand} letter={letter} style={{ borderRadius: 40 }} />
        </View>
        <Text style={{ color: brand, fontWeight: '800', fontSize: 12, letterSpacing: 0.6, marginTop: 2 }}>{upper(scr.kicker)}</Text>
        <Text style={{ color: C.text, fontWeight: '900', fontSize: 22, letterSpacing: -0.5, textAlign: 'center' }} numberOfLines={2}>{name}</Text>
        {!!where && <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{where}</Text>}
      </View>
    </View>
  );
  if (scr.hero === 'clinic') return (
    <View style={[frame, { padding: 16, gap: 12 }]}>
      <View style={[s.row, { gap: 14 }]}>
        {logo(64)}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: brand, fontWeight: '800', fontSize: 12, letterSpacing: 0.4 }}>{scr.kicker}</Text>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 21, letterSpacing: -0.4 }} numberOfLines={2}>{name}</Text>
          {!!where && <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{where}</Text>}
        </View>
      </View>
      {!!biz.cover_url && <View style={{ height: 110, borderRadius: r + 4, overflow: 'hidden', backgroundColor: alpha(brand, 0.1) }}><Photo uri={biz.cover_url} color={brand} /></View>}
    </View>
  );
  // photo & night: φωτογραφία από άκρη σε άκρη με το όνομα πάνω της
  const bg = night ? NIGHT.card : brand;
  return (
    <View style={frame}>
      <View style={{ height: 210, backgroundColor: bg }}>
        <Photo uri={biz.cover_url} color={bg} />
        <Scrim strength={night ? 0.95 : 0.7} />
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, gap: 8 }}>
          <View style={[s.row, { gap: 10 }]}>
            {logo(44, night)}
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12, letterSpacing: 1, opacity: 0.9 }}>{upper(scr.kicker)}</Text>
          </View>
          <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 25, letterSpacing: night ? 0.4 : -0.6 }} numberOfLines={2}>{night ? upper(name) : name}</Text>
          {!!where && (
            <View style={[s.row, { gap: 6 }]}>
              <Icon name="pin" size={13} color="#ffffff" />
              <Text style={{ color: '#ffffff', opacity: 0.9, fontSize: 13 }} numberOfLines={1}>{where}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
