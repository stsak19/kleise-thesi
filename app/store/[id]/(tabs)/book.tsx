import { Redirect, useLocalSearchParams } from 'expo-router';

/* Θέση του «Κλείσε θέση/ώρα» στη μπάρα του καταστήματος (lib/store/StoreBar). Δεν ανοίγει ποτέ από τη μπάρα·
   αν κάποιος φτάσει εδώ με σύνδεσμο, γυρίζει στην αρχική του καταστήματος. */
export default function BookSlot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/store/${id}`} />;
}
