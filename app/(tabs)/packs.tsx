import { Redirect } from 'expo-router';

/* Τα πακέτα είναι πλέον καρτέλα μέσα στις Κρατήσεις· το παλιό /packs οδηγεί εκεί. */
export default function Packs() {
  return <Redirect href={{ pathname: '/bookings', params: { tab: 'p' } } as any} />;
}
