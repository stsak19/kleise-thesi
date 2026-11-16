import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { C, Icon, alpha, shadow } from '../ui';
import { say } from '../alert';
import { pickAndUpload, pickAndUploadMany } from '../upload';

/* Φωτογραφίες καταστήματος: εξώφυλλο, λογότυπο και φωτογραφίες του χώρου.
   Το χρησιμοποιούν ο οδηγός «Νέα επιχείρηση» (βήμα 4) και οι Ρυθμίσεις → Στοιχεία. */
export const MAX_PHOTOS = 8;

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

export function PhotosEditor({ uid, b, setB, wide, coverH, galleryOnly }:
  { uid: string; b: any; setB: (f: (x: any) => any) => void; wide?: boolean; coverH?: number; galleryOnly?: boolean }) {
  const [up, setUp] = useState<string | null>(null);
  const photos: string[] = Array.isArray(b.photos) ? b.photos : [];
  const one = async (kind: 'logo' | 'cover') => {
    setUp(kind);
    try { const url = await pickAndUpload(uid, kind); if (url) setB((x) => ({ ...x, [kind === 'logo' ? 'logo_url' : 'cover_url']: url })); }
    catch (e: any) { say('Δεν ανέβηκε η φωτογραφία', e.message); }
    setUp(null);
  };
  const many = async () => {
    setUp('photos');
    try {
      const urls = await pickAndUploadMany(uid, MAX_PHOTOS - photos.length);
      if (urls.length) setB((x) => ({ ...x, photos: [...(Array.isArray(x.photos) ? x.photos : []), ...urls].slice(0, MAX_PHOTOS) }));
    } catch (e: any) { say('Δεν ανέβηκαν οι φωτογραφίες', e.message); }
    setUp(null);
  };
  const drop = (u: string) => setB((x) => ({ ...x, photos: (x.photos ?? []).filter((p: string) => p !== u) }));

  const H = coverH ?? (wide ? 170 : 150);
  const tile = wide ? 118 : 100;
  const cols = wide ? 4 : 3;

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
    <View style={{ width: wide ? 150 : '100%' }}>
      <Label t="Λογότυπο" sub={wide ? 'Τετράγωνο.' : 'Τετράγωνη εικόνα με το σήμα σου.'} />
      {b.logo_url ? (
        <View style={{ width: tile, height: tile, borderRadius: 18, overflow: 'hidden', backgroundColor: C.card }}>
          <Image source={{ uri: b.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <X label="Αφαίρεση λογότυπου" onPress={() => setB((x) => ({ ...x, logo_url: null }))} />
          <Over label="Αλλαγή λογότυπου" onPress={() => one('logo')} style={{ left: 0, right: 0, bottom: 0, justifyContent: 'center', paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{up === 'logo' ? 'Ανέβασμα…' : 'Αλλαγή'}</Text>
          </Over>
        </View>
      ) : <Drop h={tile} icon="🏷️" title="Ανέβασε" busy={up === 'logo'} onPress={() => one('logo')} style={!wide && { width: tile }} />}
    </View>
  );

  const gallery = (
    <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
      <Label t="Φωτογραφίες του χώρου" extra={`${photos.length} από ${MAX_PHOTOS}`} sub="Το κατάστημα, η δουλειά σου, η ομάδα. Φαίνονται στη σελίδα σου." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {photos.map((u) => (
          <View key={u} style={{ width: `${100 / cols - 3}%` as any, flexGrow: 0, height: tile, borderRadius: 14, overflow: 'hidden', backgroundColor: C.card }}>
            <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <X label="Αφαίρεση φωτογραφίας" onPress={() => drop(u)} />
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Drop h={tile} icon="＋" title={photos.length ? 'Κι άλλες' : 'Πρόσθεσε φωτογραφίες'} sub={photos.length ? undefined : 'Μπορείς να διαλέξεις πολλές μαζί'}
            busy={up === 'photos'} onPress={many} style={photos.length ? { width: `${100 / cols - 3}%`, padding: 4 } : { flexGrow: 1 }} />
        )}
      </View>
    </View>
  );

  if (galleryOnly) return gallery;
  return (
    <View style={{ gap: 22 }}>
      {cover}
      {wide ? <View style={{ flexDirection: 'row', gap: 18 }}>{logo}{gallery}</View> : <>{logo}{gallery}</>}
    </View>
  );
}

/* Οι φωτογραφίες του χώρου στη σελίδα του καταστήματος: σειρά από μικρογραφίες· πατάς μία και ανοίγει μεγάλη. */
export function StorePhotos({ photos, wide, onOpen }: { photos?: string[] | null; wide?: boolean; onOpen: (i: number) => void }) {
  if (!photos?.length) return null;
  const h = wide ? 120 : 96;
  return (
    <View style={{ flexDirection: 'row', gap: wide ? 10 : 8 }}>
      {photos.slice(0, 4).map((u, i) => (
        <Pressable key={u} onPress={() => onOpen(i)} accessibilityLabel={`Φωτογραφία ${i + 1}`}
          style={({ pressed }) => ({ flex: 1, height: h, borderRadius: 14, overflow: 'hidden', backgroundColor: C.card, opacity: pressed ? 0.85 : 1 })}>
          <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          {i === 3 && photos.length > 4 && (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' } as any}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>+{photos.length - 4}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/* Μεγάλη προβολή μιας φωτογραφίας, με «προηγούμενη / επόμενη». Πατάς έξω για να κλείσει. */
export function PhotoViewer({ photos, index, onClose }: { photos: string[]; index: number | null; onClose: () => void }) {
  const [i, setI] = useState(0);
  const open = index !== null;
  const cur = open ? (i >= 0 && i < photos.length ? i : 0) : 0;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} onShow={() => setI(index ?? 0)}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {open && photos[cur] && <Image source={{ uri: photos[cur] }} style={{ width: '100%', height: '80%', maxWidth: 1100 }} resizeMode="contain" />}
        <Text style={{ color: '#fff', opacity: 0.8, fontWeight: '700', marginTop: 14 }}>{cur + 1} / {photos.length}</Text>
        {photos.length > 1 && (['back', 'chevron'] as const).map((n, k) => (
          <Pressable key={n} onPress={(e) => { e.stopPropagation?.(); setI((cur + (k ? 1 : -1) + photos.length) % photos.length); }} accessibilityLabel={k ? 'Επόμενη' : 'Προηγούμενη'}
            style={{ position: 'absolute', top: '50%', [k ? 'right' : 'left']: 20, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' } as any}>
            <Icon name={n} size={18} color="#fff" />
          </Pressable>
        ))}
        <Pressable onPress={onClose} accessibilityLabel="Κλείσιμο" style={{ position: 'absolute', top: 20, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={15} color="#fff" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
