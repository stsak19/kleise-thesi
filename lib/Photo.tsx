import { useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { Text } from './Txt';
import { C, alpha } from './theme';

/* Φωτογραφία με ήπια εναλλακτική: αν λείπει ή δεν φορτώσει, μένει σκούρο πλαίσιο με «λάμψη»
   στο χρώμα του καταστήματος και λίγο πράσινο της εφαρμογής, ή το αρχικό γράμμα για τα λογότυπα. */
export function Photo({ uri, style, color, letter }:
  { uri?: string | null; style?: StyleProp<ImageStyle>; color: string; letter?: string }) {
  const [bad, setBad] = useState(false);
  if (uri && !bad) return <Image source={{ uri }} style={[{ width: '100%', height: '100%' }, style]} resizeMode="cover" onError={() => setBad(true)} />;
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
