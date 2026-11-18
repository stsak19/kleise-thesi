import { iso } from '../ui';

/* Ομάδες πελάτων για τα Μηνύματα (εκδοχή Α, 2026-11-18). Υπολογίζονται από τα owner_clients. */
export type Client = { user_id: string; name: string; phone: string | null; last: string | null; next?: string | null;
  pack?: { name: string; left: number | null; total: number | null; expires: string | null } | null };
export type GroupKey = 'tomorrow' | 'pack' | 'idle' | 'all' | 'one';

export function groupsOf(list: Client[]): Record<GroupKey, Client[]> {
  const now = new Date(), today = iso(now);
  const tm = new Date(now); tm.setDate(tm.getDate() + 1); const tomorrow = iso(tm);
  const ago = new Date(now); ago.setDate(ago.getDate() - 30); const old = iso(ago);
  return {
    tomorrow: list.filter((c) => c.next?.slice(0, 10) === tomorrow),
    pack: list.filter((c) => c.pack && c.pack.left != null && c.pack.left <= 2 && (!c.pack.expires || c.pack.expires >= today)),
    idle: list.filter((c) => !c.next && !!c.last && c.last < old),
    all: list,
    one: list,
  };
}

/* Η επιλογή της σελίδας «Σε ποιους» (app/(biz)/owner/recipients): γυρίζει στα Μηνύματα όταν πατηθεί το ✓. */
let picked: { group: GroupKey; ids: string[] } | null = null;
export const setPicked = (v: typeof picked) => { picked = v; };
export const takePicked = () => { const v = picked; picked = null; return v; };
