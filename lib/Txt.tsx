import React, { forwardRef } from 'react';
import { Animated, StyleSheet, Text as RNText, TextInput as RNTextInput, TextInputProps, TextProps } from 'react-native';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { tr, trNode } from './i18n';

/* Η γραμματοσειρά της εφαρμογής (Manrope). Κάθε βάρος είναι ξεχωριστό αρχείο, οπότε
   το fontWeight ενός στυλ γίνεται το αντίστοιχο fontFamily. Όλη η εφαρμογή εισάγει
   Text / TextInput από εδώ αντί για το react-native. */
export const FONTS = { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold };

const family = (w?: string | number) => {
  const n = Number(w === 'bold' ? 700 : w === 'normal' || w == null ? 400 : w);
  return n >= 800 ? 'Manrope_800ExtraBold' : n >= 700 ? 'Manrope_700Bold' : n >= 600 ? 'Manrope_600SemiBold' : n >= 500 ? 'Manrope_500Medium' : 'Manrope_400Regular';
};
const font = (style: any) => {
  const f = StyleSheet.flatten(style) ?? {};
  if (f.fontFamily) return style; // π.χ. emoji ή monospace: μένει όπως είναι
  return [style, { fontFamily: family(f.fontWeight), fontWeight: 'normal' as const }];
};

/* Στα αγγλικά (lib/i18n) το κείμενο μεταφράζεται εδώ, πριν ζωγραφιστεί. Στα ελληνικά δεν αλλάζει τίποτα. */
export const Text = forwardRef<any, TextProps>((p, ref) => (
  <RNText ref={ref} {...p} accessibilityLabel={p.accessibilityLabel && tr(p.accessibilityLabel)} style={font(p.style)}>{trNode(p.children)}</RNText>
));
Text.displayName = 'Text';
export const TextInput = forwardRef<any, TextInputProps>((p, ref) => (
  <RNTextInput ref={ref} {...p} placeholder={p.placeholder && tr(p.placeholder)} accessibilityLabel={p.accessibilityLabel && tr(p.accessibilityLabel)} style={font(p.style)} />
));
TextInput.displayName = 'TextInput';

/* Animated.Text με τη γραμματοσειρά της εφαρμογής. */
export const AText = Animated.createAnimatedComponent(Text);
