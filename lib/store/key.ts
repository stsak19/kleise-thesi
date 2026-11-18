import { sb } from '../supabase';

/* Σύνδεσμος καταστήματος: /store/<slug> (από το όνομα, migration 019) ή, για παλιούς συνδέσμους, /store/<uuid>.
   Το slug δεν αλλάζει όταν αλλάζει το όνομα, οπότε οι σύνδεσμοι που έχουν μοιραστεί δεν σπάνε. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (k: string) => UUID.test(k);

/* slug → id, με μνήμη ώστε να μη ρωτάμε τη βάση ξανά για το ίδιο κατάστημα. */
const known = new Map<string, string>();
export const rememberSlug = (b: { id: string; slug?: string | null }) => { if (b?.slug) known.set(b.slug, b.id); };

/* Το κομμάτι της διεύθυνσης για ένα κατάστημα: το slug του αν υπάρχει, αλλιώς ο κωδικός του. */
export const storeKey = (b: { id: string; slug?: string | null }) => b.slug || b.id;
export const storeHref = (b: { id: string; slug?: string | null }) => { rememberSlug(b); return `/store/${storeKey(b)}`; };

export const knownId = (k: string) => (isUuid(k) ? k : known.get(k));
export async function resolveStore(k: string): Promise<string | null> {
  const hit = knownId(k);
  if (hit) return hit;
  const { data, error } = await sb.from('businesses').select('id, slug').eq('slug', k).maybeSingle();
  if (error || !data) return null;
  rememberSlug(data);
  return data.id;
}
