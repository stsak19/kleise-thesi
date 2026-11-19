import { rpc } from '../supabase';

/* Σύνδεσμος καταστήματος: /store/<slug> (από το όνομα, migration 020) ή /store/<uuid>.
   Το slug αλλάζει μαζί με το όνομα· ένα παλιό slug (ή ο κωδικός) ανοίγει το κατάστημα και η διεύθυνση γίνεται η νέα (app/store/[id]/_layout.tsx). */
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
  // Τωρινό ή παλιό slug (μετά από αλλαγή ονόματος).
  const r = await rpc<{ id: string; slug: string } | null>('store_by_slug', { p_slug: k }).catch(() => null);
  if (!r?.id) return null;
  known.set(k, r.id); rememberSlug(r);
  return r.id;
}

