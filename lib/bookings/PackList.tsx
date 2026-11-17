import { Card, Empty, iso } from '../ui';
import type { BookingsData } from './data';
import { PackCard, packInfo } from './cards';

/* Πακέτο που τελείωσε: έληξε η ημερομηνία ή δεν έμειναν κρατήσεις (και δεν έχει ζητηθεί νέο). */
export const packEnded = (m: any) => {
  if (m.status === 'pending' || m.pending_package || m.unlimited) return false;
  const today = iso(new Date());
  return (!!m.expires && m.expires < today) || (!!m.total && (m.credits ?? 0) <= 0);
};

/* Τα πακέτα του χρήστη ανά κατάστημα, μέσα στη σελίδα «Κρατήσεις» → «Πακέτα».
   which: 'active' = σε ισχύ ή σε αναμονή, 'past' = Ιστορικό (έληξαν ή τελείωσαν). */
export function PackList({ D, which }: { D: BookingsData; which: 'active' | 'past' }) {
  const all = [...D.upcoming, ...D.past];
  const list = D.packs.filter((m: any) => (which === 'past') === packEnded(m));
  return <>
    {D.ready && list.length === 0 && (which === 'active'
      ? <Card><Empty icon="pack" title="Δεν έχεις ενεργό πακέτο" text="Όταν πάρεις πακέτο σε ένα κατάστημα, θα βλέπεις εδώ πόσες κρατήσεις σου απομένουν και πότε λήγει."
          action="Βρες κατάστημα" onAction={D.find} /></Card>
      : <Card><Empty icon="pack" title="Κανένα παλιό πακέτο" text="Τα πακέτα που λήγουν ή τελειώνουν θα μένουν εδώ." /></Card>)}
    {list.map((m: any) => (
      <PackCard key={m.business_id} name={m.business} biz={D.biz[m.business_id]} color={D.color(m)} p={packInfo(m, D.biz[m.business_id], all)}
        onPress={() => D.open(m)} ended={which === 'past'} />
    ))}
  </>;
}
