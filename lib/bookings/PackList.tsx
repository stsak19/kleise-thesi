import { Card, Empty, fmtDay, iso } from '../ui';
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
  // Ιστορικό: και τα παλιά πακέτα που αντικαταστάθηκαν από νέο (pack_history).
  const old = which === 'past' ? D.packHistory : [];
  const oldText = (h: any) => {
    const from = `από ${fmtDay(h.started)}`;
    if (h.reason === 'renewed') return `Ανανεώθηκε · ${from}`;
    if (h.reason === 'used') return `Τελείωσε · ${from}`;
    return h.expires ? `Έληξε ${fmtDay(h.expires)}` : 'Έληξε';
  };
  if (which === 'past' && old.length) return <>
    {list.map((m: any) => (
      <PackCard key={m.business_id} name={m.business} biz={D.biz[m.business_id]} color={D.color(m)} p={packInfo(m, D.biz[m.business_id], all)} onPress={() => D.open(m)} ended />
    ))}
    {old.map((h: any) => (
      <PackCard key={h.id} name={h.business} biz={D.biz[h.business_id]} color={D.color(h)} ended endText={oldText(h)}
        p={{ left: h.credits ?? 0, total: h.total ?? null, unlimited: h.total == null, expires: h.expires ?? null, pending: false, name: h.pack ?? null, asked: null }} />
    ))}
  </>;
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
