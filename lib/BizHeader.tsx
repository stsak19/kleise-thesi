import { Image, Text, View } from 'react-native';
import { C, Pill, T, alpha, catEmoji, catLabel, onColor, s, shadow } from './ui';
import { Header } from './presets';

/* Κορυφή σελίδας καταστήματος. Τρία στυλ, ανάλογα με το θέμα:
   cover   = μεγάλο εξώφυλλο, λογότυπο που «κρέμεται» από κάτω
   compact = χαμηλό χρωματιστό πλαίσιο με λογότυπο και όνομα μέσα του
   minimal = χωρίς εξώφυλλο: λογότυπο και όνομα πάνω στο λευκό, λεπτή χρωματιστή γραμμή */
export function BizHeader({ biz, header, color, radius, full = true }:
  { biz: any; header: Header; color: string; radius: number; full?: boolean }) {
  const fg = onColor(color);
  const logo = (size: number, onBrand = false) => (
    <View style={{ width: size, height: size, borderRadius: radius + 4, backgroundColor: onBrand ? 'rgba(255,255,255,0.18)' : C.card, padding: onBrand ? 0 : 4, ...(onBrand ? {} : shadow(2)) }}>
      {biz.logo_url
        ? <Image source={{ uri: biz.logo_url }} style={{ width: '100%', height: '100%', borderRadius: radius }} />
        : <View style={{ flex: 1, borderRadius: radius, backgroundColor: onBrand ? 'transparent' : alpha(color, 0.14), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: onBrand ? fg : color, fontWeight: '900', fontSize: size * 0.4 }}>{(biz.name || '🏪').slice(0, 1)}</Text>
          </View>}
    </View>
  );
  const info = (
    <View style={{ gap: 8 }}>
      <View style={s.row}>
        <Pill text={catLabel(biz.category)} color={color} />
        {!!biz.city && <Pill text={biz.city} />}
      </View>
      {full && !!biz.description && <T mute style={{ fontSize: 15, lineHeight: 22 }}>{biz.description}</T>}
    </View>
  );
  const name = (c = C.text, size = 28) => <Text style={{ color: c, fontSize: size, fontWeight: '900', letterSpacing: -0.8 }} numberOfLines={2}>{biz.name || 'Το κατάστημά σου'}</Text>;

  if (header === 'compact') return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: color, borderRadius: radius + 6, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
        {biz.cover_url && <Image source={{ uri: biz.cover_url }} style={{ position: 'absolute', width: '120%', height: '100%', opacity: 0.25 }} resizeMode="cover" />}
        {logo(60, true)}
        <View style={{ flex: 1 }}>{name(fg, 22)}</View>
        <Text style={{ fontSize: 34 }}>{catEmoji(biz.category)}</Text>
      </View>
      {info}
    </View>
  );
  if (header === 'minimal') return (
    <View style={{ gap: 12, paddingTop: 4 }}>
      <View style={{ height: 4, width: 48, borderRadius: 2, backgroundColor: color }} />
      <View style={[s.row, { gap: 14 }]}>
        {logo(64)}
        <View style={{ flex: 1 }}>{name(C.text, 24)}</View>
      </View>
      {info}
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: full ? 180 : 120, backgroundColor: color, borderRadius: radius + 10, overflow: 'hidden' }}>
        {biz.cover_url
          ? <Image source={{ uri: biz.cover_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <>
              <View style={{ position: 'absolute', right: -40, top: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ position: 'absolute', left: -30, bottom: -70, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ position: 'absolute', right: 30, top: full ? 40 : 20, fontSize: full ? 72 : 52 }}>{catEmoji(biz.category)}</Text>
            </>}
      </View>
      <View style={{ marginTop: full ? -56 : -48, marginLeft: 6 }}>{logo(full ? 84 : 68)}</View>
      {name()}
      {info}
    </View>
  );
}
