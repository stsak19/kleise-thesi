import { Linking, Platform } from 'react-native';
import { sb } from './supabase';

/* Πληρωμή πακέτου με Viva (Edge Function supabase/functions/viva-pay).
   Ανοίγει τη σελίδα πληρωμής της Viva. Μετά την πληρωμή η Viva γυρίζει τον πελάτη στη σελίδα …/paid
   (app/paid.tsx), που επιβεβαιώνει την πληρωμή και δείχνει ότι το πακέτο ενεργοποιήθηκε. */
export async function payPackage(packageId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await sb.functions.invoke('viva-pay', { body: { package_id: packageId } });
  if (error) return { ok: false, error: 'Η πληρωμή δεν είναι διαθέσιμη αυτή τη στιγμή. Μπορείς να πληρώσεις στο κατάστημα.' };
  if (!data?.ok || !data.url) return { ok: false, error: data?.error ?? 'Η πληρωμή δεν ξεκίνησε' };
  if (Platform.OS === 'web') window.location.assign(data.url);
  else await Linking.openURL(data.url);
  return { ok: true };
}

/* Επιβεβαίωση από τη σελίδα επιστροφής: η Viva στέλνει ?s=<orderCode>&t=<transactionId>. */
export async function confirmPayment(orderCode: string, transactionId: string) {
  const { data, error } = await sb.functions.invoke('viva-pay', { body: { action: 'confirm', order_code: orderCode, transaction_id: transactionId } });
  if (error) return { ok: false, error: 'Δεν μπορέσαμε να ελέγξουμε την πληρωμή. Αν χρεώθηκες, το πακέτο θα ενεργοποιηθεί σε λίγα λεπτά.' };
  return data as { ok: boolean; error?: string; pending?: boolean; business_id?: string; package?: string };
}
