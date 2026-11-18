import { FloatBar, type TabItems } from '../FloatBar';
import { useBook } from './book';

/* Η κάτω μπάρα του καταστήματος στο κινητό: η ίδια γυάλινη μπάρα του SpotOn (lib/FloatBar), με τη λογική που έχουμε παντού
   (εικονίδια, η ενεργή καρτέλα δείχνει και τη λέξη της, σταγόνα που γλιστράει). Κατάστημα · Κλείσε θέση/ώρα (μέση) · Κρατήσεις.
   Το μεσαίο δεν ανοίγει σελίδα: ανοίγει την κράτηση (πρόγραμμα στα μαθήματα, βήματα στα ραντεβού) πάνω από το Κατάστημα.
   Η διαδρομή «book» (app/store/[id]/(tabs)/book.tsx) υπάρχει μόνο για να έχει θέση στη μπάρα. */
type Props = { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (key: string) => void };

export function StoreBar({ state, navigateToTab }: Props) {
  const B = useBook();
  const items: TabItems = {
    index: { icon: 'store', label: 'Κατάστημα' },
    book: { icon: 'plus', label: B.cta },
    bookings: { icon: 'calendar', label: 'Κρατήσεις' },
  };
  const keyOf = (name: string) => state.routes.find((r) => r.name === name)?.key;
  const nav = (key: string) => {
    if (key !== keyOf('book')) return navigateToTab(key);
    const home = keyOf('index');
    if (home && state.routes[state.index]?.name !== 'index') navigateToTab(home);
    B.go();
  };
  return <FloatBar items={items} state={state} navigateToTab={nav} labels />;
}
