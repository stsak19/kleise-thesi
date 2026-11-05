import { useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { Text } from './Txt';
import { NEON, alpha, glow } from './theme';

/* Φωτογραφία με ήπια εναλλακτική: αν λείπει ή δεν φορτώσει, μένει σκούρο πλαίσιο με «λάμψη»
   στο χρώμα του καταστήματος και λίγο πράσινο της εφαρμογής, ή το αρχικό γράμμα για τα λογότυπα. */
export function Photo({ uri, style, color, letter }:
  { uri?: string | null; style?: StyleProp<ImageStyle>; color: string; letter?: string }) {
  const [bad, setBad] = useState(false);
  if (uri && !bad) return <Image source={{ uri }} style={[{ width: '100%', height: '100%' }, style]} resizeMode="cover" onError={() => setBad(true)} />;
  return (
    <View style={[{ width: '100%', height: '100%', backgroundColor: letter ? alpha(color, 0.1) : '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
      !letter && glow('#0d0d0d', color, NEON, 1, 0.42), style as any]}>
      {!!letter && <Text style={{ color, fontWeight: '800', fontSize: 22 }}>{letter}</Text>}
    </View>
  );
}

/* Σκούρο «πέπλο» στο κάτω μέρος μιας φωτογραφίας, για να διαβάζεται το κείμενο από πάνω. */
export function Scrim({ strength = 0.45 }: { strength?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: alpha('#000000', strength * (i / 11) ** 1.6) }} />
      ))}
    </View>
  );
}
