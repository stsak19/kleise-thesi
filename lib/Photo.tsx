import { useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { Text } from './Txt';
import { C, alpha, isLight } from './theme';
import { CAT_ART } from './catArt';

/* Λογότυπα (όσα δίνουν letter) δείχνονται ολόκληρα (contain), ώστε ένα διαφανές PNG να κάθεται πάνω σε ό,τι υπάρχει από πίσω.
   Φωτογραφία με ήπια εναλλακτική: αν λείπει ή δεν φορτώσει, μένει σκούρο πλαίσιο με «λάμψη»
   στο χρώμα του καταστήματος και λίγο πράσινο της εφαρμογής, ή το αρχικό γράμμα για τα λογότυπα. */
export function Photo({ uri, style, color, letter, cat }:
  { uri?: string | null; style?: StyleProp<ImageStyle>; color: string; letter?: string; cat?: string | null }) {
  const [bad, setBad] = useState(false);
  if (uri && !bad) return <Image source={{ uri }} style={[{ width: '100%', height: '100%' }, style]} resizeMode={letter !== undefined ? 'contain' : 'cover'} onError={() => setBad(true)} />;
  if (!letter && cat !== undefined) return <DefaultCover cat={cat} style={style} />;
  return (
    <View style={[{ width: '100%', height: '100%', backgroundColor: letter ? alpha(color, 0.1) : '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
      !letter && { backgroundColor: C.banner }, style as any]}>
      {!!letter && <Text style={{ color, fontWeight: '800', fontSize: 22 }}>{letter}</Text>}
    </View>
  );
}

/* Σκούρο «πέπλο» πάνω σε φωτογραφία εξωφύλλου, για να διαβάζεται το κείμενο από πάνω.
   Μόνο όταν υπάρχει φωτογραφία· χωρίς φωτογραφία το εξώφυλλο μένει ένα ενιαίο χρώμα (C.banner). Ίδια σκίαση παντού, όχι διαβάθμιση. */
export function Scrim({ strength = 0.45, photo }: { strength?: number; photo?: string | null }) {
  if (!photo) return null;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: alpha('#000000', Math.min(0.5, strength * 0.55)) }} />;
}

/* Προεπιλεγμένο εξώφυλλο για κατάστημα που δεν ανέβασε δικό του: το απαλό χρώμα της κατηγορίας του
   με τη μεγάλη τρισδιάστατη εικόνα της (ίδιες με τις κατηγορίες της αρχικής) και δύο μικρότερες, πιο αχνές. */
export function DefaultCover({ cat, style }: { cat?: string | null; style?: StyleProp<ImageStyle> }) {
  const art = CAT_ART[cat ?? ''] ?? CAT_ART.other;
  const img = (size: string, pos: object, opacity: number, rotate: string) => (
    <Image source={art.img} resizeMode="contain" accessibilityIgnoresInvertColors
      style={[{ position: 'absolute', height: size as any, aspectRatio: 1, opacity, transform: [{ rotate }] }, pos] as any} />
  );
  return (
    <View style={[{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: isLight(C.bg) ? art.bg : art.bgDark }, style as any]}>
      {img('46%', { left: '6%', top: '-8%' }, 0.28, '-14deg')}
      {img('34%', { right: '30%', bottom: '-6%' }, 0.22, '12deg')}
      {img('84%', { right: '7%', top: '8%' }, 1, '-6deg')}
    </View>
  );
}
