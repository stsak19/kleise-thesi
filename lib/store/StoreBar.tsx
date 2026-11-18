import { FloatBar, type TabItems } from '../FloatBar';
import { useBook } from './book';

/* Η κάτω μπάρα του καταστήματος στο κινητό: η ίδια γυάλινη μπάρα του SpotOn (lib/FloatBar), με τη λογική που έχουμε παντού
   (εικονίδια, η ενεργή καρτέλα δείχνει και τη λέξη της, σταγόνα που γλιστράει). Κατάστημα · Κλείσε θέση/ώρα (μέση) · Κρατήσεις.
   Το μεσαίο (＋) ανοίγει την κράτηση ως κανονική σελίδα (app/store/[id]/(tabs)/book.tsx): πρόγραμμα στα μαθήματα, βήματα στα ραντεβού. */
type Props = { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void };

export function StoreBar({ state, navigateToTab }: Props) {
  const B = useBook();
  const items: TabItems = {
    index: { icon: 'store', label: 'Κατάστημα' },
    book: { icon: 'plus', label: B.cta },
    bookings: { icon: 'calendar', label: 'Κρατήσεις' },
  };
  return <FloatBar items={items} state={state} navigateToTab={navigateToTab} labels />;
}
