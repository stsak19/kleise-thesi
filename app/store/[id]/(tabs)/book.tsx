import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, TAB_SPACE } from '../../../../lib/ui';
import { useStore } from '../../../../lib/store/data';
import { useBook } from '../../../../lib/store/book';
import { BookPage } from '../../../../lib/store/BookUI';
import { ScheduleList } from '../../../../lib/store/Schedule';
import { StoreTop } from '../../../../lib/store/parts';
import { useWide } from '../../../../lib/wide';

/* Το ＋ στη μέση της μπάρας του καταστήματος (κινητό): η κράτηση σαν κανονική σελίδα, όπως οι άλλες δύο καρτέλες
   (ίδιο πάνω μέρος με το κατάστημα, η μπάρα μένει από κάτω).
   - μαθήματα (γυμναστήριο, pilates): το πρόγραμμα· το «Κράτηση» ανοίγει μόνο την επιβεβαίωση από κάτω
   - ραντεβού: τα βήματα Υπηρεσία → Άτομο → Ώρα → Επιβεβαίωση μέσα στη σελίδα
   Στον υπολογιστή η κράτηση είναι παράθυρο, οπότε η διαδρομή γυρίζει στην αρχική του καταστήματος. */
export default function BookTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wide = useWide();
  const S = useStore();
  const B = useBook();
  const bottom = useSafeAreaInsets().bottom;
  const ref = useRef(B); ref.current = B;

  // Ανοιχτή σελίδα = τα βήματα δείχνονται εδώ. Φεύγοντας, η κράτηση κλείνει (ξεκινά από την αρχή την επόμενη φορά).
  useFocusEffect(useCallback(() => {
    ref.current.setPage(true);
    return () => { ref.current.setPage(false); ref.current.close(); };
  }, []));
  // Ραντεβού: αν ήρθες από το ＋ (όχι από υπηρεσία ή «Το συνηθισμένο σου»), ξεκινά από το πρώτο βήμα.
  useEffect(() => {
    if (B.page && !B.classes && !B.open && !B.resume && S.services.length) B.start();
  }, [B.page, B.classes, B.open, B.resume, S.services.length]);

  if (wide) return <Redirect href={`/store/${id}`} />;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StoreTop title={B.classes ? 'Πρόγραμμα' : B.cta} />
      {B.classes ? <ScheduleList bottom={TAB_SPACE + bottom} /> : <BookPage />}
    </View>
  );
}
