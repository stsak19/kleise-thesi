import { C } from './ui';
/* Κοινές ρυθμίσεις για τις στοίβες μέσα στις καρτέλες. */
export const stackOptions = () => ({
  headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 17 },
  contentStyle: { backgroundColor: C.bg }, headerBackTitle: 'Πίσω',
});
