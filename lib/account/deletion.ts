import { useCallback, useEffect, useState } from 'react';
import { sb } from '../supabase';

/* Διαγραφή λογαριασμού με αίτηση (app/delete-account.tsx): περιθώριο ημερών και πότε σβήνεται. */
export const GRACE_DAYS = 7;
export const dayOf = (iso: string) => { const d = new Date(new Date(iso).getTime() + GRACE_DAYS * 864e5); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };

/* Πότε ζήτησε διαγραφή ο χρήστης (null = δεν έχει ζητήσει). Το χρησιμοποιούν και οι Ρυθμίσεις. */
export function useDeletion(uid: string) {
  const [at, setAt] = useState<string | null | undefined>(undefined);
  const load = useCallback(() => {
    if (uid) sb.from('profiles').select('delete_requested_at').eq('id', uid).maybeSingle().then(({ data }) => setAt(data?.delete_requested_at ?? null));
  }, [uid]);
  useEffect(load, [load]);
  return { at, reload: load, deleteOn: at ? dayOf(at) : null };
}

