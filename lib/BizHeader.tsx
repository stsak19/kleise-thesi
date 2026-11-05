import { Image, View } from 'react-native';
import { Text } from './Txt';
import { C, Pill, T, alpha, catEmoji, catLabel, onColor, s, shadow } from './ui';
import { Header } from './presets';
import { Photo, Scrim } from './Photo';

/* Κορυφή σελίδας καταστήματος. Τρία στυλ, ανάλογα με το θέμα:
   cover   = μεγάλο εξώφυλλο, λογότυπο που «κρέμεται» από κάτω
   compact = χαμηλό χρωματιστό πλαίσιο με λογότυπο και όνομα μέσα του
   minimal = χωρίς εξώφυλλο: λογότυπο και όνομα πάνω στο λευκό, λεπτή χρωματιστή γραμμή */
export function BizHeader({ biz, header, color, radius, full = true }:
  { biz: any; header: Header; color: string; radius: number; full?: boolean }) {
  const logo = (size: number, onBrand = false) => (
    <View style={{ width: size, height: size, borderRadius: radius + 4, backgroundColor: '#ffffff', padding: onBrand ? 2 : 4, ...(onBrand ? {} : shadow(2)) }}>
      <Photo uri={biz.logo_url} color={color} letter={(biz.name || 'Κ').slice(0, 1)} style={{ borderRadius: radius }} />
    </View>
  );
  const info = (
    <View style={{ gap: 8 }}>
      <View style={s.row}>
        <Pill text={catLabel(biz.category)} />
        {!!biz.city && <Pill text={biz.city} />}
      </View>
      {full && !!biz.description && <T mute style={{ fontSize: 15, lineHeight: 22 }}>{biz.description}</T>}
    </View>
  );
  const name = (c = C.text, size = 28) => <Text style={{ color: c, fontSize: size, fontWeight: '900', letterSpacing: -0.8 }} numberOfLines={2}>{biz.name || 'Το κατάστημά σου'}</Text>;

  if (header === 'compact') return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: color, borderRadius: radius + 6, padding: 18, paddingTop: 90, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}><Photo uri={biz.cover_url} color={color} /></View>
        <Scrim strength={0.7} />
        {logo(60, true)}
        <View style={{ flex: 1 }}>{name('#ffffff', 22)}</View>
      </View>
      {info}
    </View>
  );
  if (header === 'minimal') return (
    <View style={{ gap: 12, paddingTop: 4 }}>
      {!!biz.cover_url && <View style={{ height: full ? 150 : 100, borderRadius: radius + 6, overflow: 'hidden', backgroundColor: color }}><Photo uri={biz.cover_url} color={color} /></View>}
      <View style={[s.row, { gap: 14 }]}>
        {logo(64)}
        <View style={{ flex: 1 }}>{name(C.text, 24)}</View>
      </View>
      {info}
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: full ? 210 : 130, backgroundColor: color, borderRadius: radius + 10, overflow: 'hidden' }}>
        <Photo uri={biz.cover_url} color={color} />
        <Scrim strength={0.25} />
      </View>
      <View style={{ marginTop: full ? -56 : -48, marginLeft: 6 }}>{logo(full ? 84 : 68)}</View>
      {name()}
      {info}
    </View>
  );
}
