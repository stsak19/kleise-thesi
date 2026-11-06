import { useWindowDimensions, type ViewStyle } from 'react-native';

/* Υπολογιστής ή μεγάλο tablet: από αυτό το πλάτος και πάνω οι οθόνες απλώνονται (πλαϊνό μενού / πάνω μπάρα αντί για κάτω μπάρα).
   Κοινό για τον πελάτη, το κατάστημα και τη λειτουργία επιχείρησης. Στο κινητό δεν αλλάζει τίποτα. */
export const WIDE = 1000;
export const useWide = () => useWindowDimensions().width >= WIDE;
/* Στον υπολογιστή οι οθόνες-λίστες δεν απλώνονται σε όλο το πλάτος: μένουν σε μια άνετη στήλη στη μέση. */
export const deskCol = (wide: boolean, max = 820): ViewStyle | null => (wide ? { width: '100%', maxWidth: max, alignSelf: 'center', paddingHorizontal: 32 } : null);
