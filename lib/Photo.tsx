import { useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { Text } from './Txt';
import { alpha, grad } from './theme';

/* Φωτογραφία με ήπια εναλλακτική: αν λείπει ή δεν φορτώσει, μένει σκούρο πλαίσιο με «λάμψη»
   στο χρώμα του καταστήματος και λίγο πράσινο της εφαρμογής, ή το αρχικό γράμμα για τα λογότυπα. */
export function Photo({ uri, style, color, letter }:
  { uri?: string | null; style?: StyleProp<ImageStyle>; color: string; letter?: string }) {
  const [bad, setBad] = useState(false);
  if (uri && !bad) return <Image source={{ uri }} style={[{ width: '100%', height: '100%' }, style]} resizeMode="cover" onError={() => setBad(true)} />;
  return (
    <View style={[{ width: '100%', height: '100%', backgroundColor: letter ? alpha(color, 0.1) : '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
      !letter && { backgroundColor: color }, style as any]}>
      {!!letter && <Text style={{ color, fontWeight: '800', fontSize: 22 }}>{letter}</Text>}
    </View>
  );
}

/* Σκούρο «πέπλο» στο κάτω μέρος μιας φωτογραφίας, για να διαβάζεται το κείμενο από πάνω.
   Μία ομαλή διαβάθμιση (όχι λωρίδες, που φαίνονταν σαν παράλληλες γραμμές στο εξώφυλλο). */
export function Scrim({ strength = 0.45 }: { strength?: number }) {
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => `rgba(0,0,0,${(strength * t ** 1.6).toFixed(3)}) ${Math.round(t * 100)}%`).join(', ');
  return <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }, grad(`linear-gradient(to bottom, ${stops})`)]} />;
}
