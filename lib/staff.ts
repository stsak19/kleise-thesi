import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { rpc } from './supabase';
import { useAuth } from './auth';

/* Ο υπάλληλος (δέχτηκε πρόσκληση, staff.user_id): τα επόμενα ραντεβού και μαθήματά του σε κάθε επιχείρηση
   όπου είναι στην ομάδα (supabase/migrations/017_staff_schedule.sql). */
export type WorkItem = { kind: 'one' | 'class'; id?: string; date: string; time: string; service: string; duration: number;
  client?: string | null; phone?: string | null; count?: number; capacity?: number };
export type Work = { business_id: string; business: string; category: string; brand_color: string | null; logo_url: string | null;
  staff_id: string; staff: string; access: string; items: WorkItem[] };

/* list: null = φορτώνει· nodb = η βάση δεν έχει ακόμα το 017. */
export function useMyWork() {
  const signedIn = !!useAuth().session;
  const [list, setList] = useState<Work[] | null>(null);
  const [nodb, setNodb] = useState(false);
  const load = useCallback(() => {
    if (!signedIn) { setList([]); return; }
    rpc<Work[]>('staff_my_schedule', { p_days: 14 })
      .then((x) => { setList(x ?? []); setNodb(false); })
      .catch((e) => { setList([]); setNodb(/staff_my_schedule|could not find|does not exist|schema cache/i.test(String(e?.message))); });
  }, [signedIn]);
  useFocusEffect(load);
  return { list, nodb, load };
}
