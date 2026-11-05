import { Redirect, useLocalSearchParams } from 'expo-router';

/* Η σελίδα καταστήματος έγινε ξεχωριστή «εφαρμογή» (app/store/[id]). Παλιοί σύνδεσμοι οδηγούν εκεί. */
export default function OldBusiness() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/store/${id}`} />;
}
