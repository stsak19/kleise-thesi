import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { C, Icon, alpha, s, shadow } from '../ui';
import { say } from '../alert';
import { pickAndUpload } from '../upload';

/* Φωτογραφίες καταστήματος: εξώφυλλο και φωτογραφία προφίλ (λογότυπο).
   Το χρησιμοποιούν ο οδηγός «Νέα επιχείρηση» (βήμα 4) και οι Ρυθμίσεις → Στοιχεία. */

const Label = ({ t, sub, extra }: { t: string; sub?: string; extra?: string }) => (
  <View style={{ gap: 2, marginBottom: 10 }}>
    <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{t}{!!extra && <Text style={{ color: C.mute, fontWeight: '600', fontSize: 13 }}>{`  ·  ${extra}`}</Text>}</Text>
    {!!sub && <Text style={{ color: C.mute, fontSize: 13, lineHeight: 18 }}>{sub}</Text>}
  </View>
);

/* Άδειο πλαίσιο με διακεκομμένο περίγραμμα: «πάτα για να ανεβάσεις». */
function Drop({ h, title, sub, icon, busy, onPress, style }: { h: number; title: string; sub?: string; icon: string; busy?: boolean; onPress: () => void; style?: any }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed, hovered }: any) => [{ height: h, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: hovered ? C.text : alpha(C.text, 0.22),
        backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, opacity: pressed ? 0.8 : 1 }, style]}>
      {busy ? <ActivityIndicator color={C.text} /> : (
        <>
          <View style={[{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }, shadow(1)]}>
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          </View>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 14.5, textAlign: 'center' }}>{title}</Text>
          {!!sub && <Text style={{ color: C.mute, fontSize: 12.5, textAlign: 'center' }}>{sub}</Text>}
        </>
      )}
    </Pressable>
  );
}

/* Μικρό στρογγυλό κουμπί πάνω σε φωτογραφία (✕ ή «Αλλαγή»). */
const Over = ({ onPress, label, children, style }: { onPress: () => void; label: string; children: React.ReactNode; style: any }) => (
  <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={6}
    style={({ pressed }) => [{ position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 }, style]}>{children}</Pressable>
);
const X = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <Over onPress={onPress} label={label} style={{ top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' }}>
    <Icon name="close" size={11} color="#ffffff" />
  </Over>
);

export function PhotosEditor({ uid, b, setB, wide, coverH }:
  { uid: string; b: any; setB: (f: (x: any) => any) => void; wide?: boolean; coverH?: number }) {
  const [up, setUp] = useState<string | null>(null);
  const one = async (kind: 'logo' | 'cover') => {
    setUp(kind);
    try { const url = await pickAndUpload(uid, kind); if (url) setB((x) => ({ ...x, [kind === 'logo' ? 'logo_url' : 'cover_url']: url })); }
    catch (e: any) { say('Δεν ανέβηκε η φωτογραφία', e.message); }
    setUp(null);
  };

  const H = coverH ?? (wide ? 170 : 150);
  const tile = wide ? 118 : 100;

  const cover = (
    <View>
      <Label t="Εξώφυλλο" sub="Η μεγάλη φωτογραφία στην κορυφή της σελίδας σου. Καλύτερα οριζόντια." />
      {b.cover_url ? (
        <View style={{ height: H, borderRadius: 18, overflow: 'hidden', backgroundColor: C.card }}>
          <Image source={{ uri: b.cover_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <X label="Αφαίρεση εξωφύλλου" onPress={() => setB((x) => ({ ...x, cover_url: null }))} />
          <Over label="Αλλαγή εξωφύλλου" onPress={() => one('cover')}
            style={{ left: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12 }}>
            <Text style={{ color: '#0a0a0a', fontWeight: '800', fontSize: 12.5 }}>{up === 'cover' ? 'Ανέβασμα…' : '↻ Αλλαγή'}</Text>
          </Over>
        </View>
      ) : <Drop h={H} icon="🖼️" title="Ανέβασε εξώφυλλο" sub="Οριζόντια φωτογραφία, π.χ. το μαγαζί απ’ έξω ή μέσα" busy={up === 'cover'} onPress={() => one('cover')} />}
    </View>
  );

  const logo = (
    <View style={[s.row, { gap: 16, alignItems: 'center' }]}>
      {b.logo_url ? (
        <View style={{ width: tile, height: tile, borderRadius: 18, overflow: 'hidden', backgroundColor: C.card }}>
          <Image source={{ uri: b.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <X label="Αφαίρεση φωτογραφίας προφίλ" onPress={() => setB((x) => ({ ...x, logo_url: null }))} />
          <Over label="Αλλαγή φωτογραφίας προφίλ" onPress={() => one('logo')} style={{ left: 0, right: 0, bottom: 0, justifyContent: 'center', paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{up === 'logo' ? 'Ανέβασμα…' : 'Αλλαγή'}</Text>
          </Over>
        </View>
      ) : <Drop h={tile} icon="🏷️" title="Ανέβασε" busy={up === 'logo'} onPress={() => one('logo')} style={{ width: tile }} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Label t="Φωτογραφία προφίλ" sub="Το λογότυπό σου ή μια φωτογραφία σου. Φαίνεται δίπλα στο όνομα. Καλύτερα τετράγωνη." />
      </View>
    </View>
  );

  return (
    <View style={{ gap: 22 }}>
      {cover}
      {logo}
    </View>
  );
}
