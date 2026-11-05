import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { say } from '../alert';
import { setDemo } from '../demo';
import { rpc, sb } from '../supabase';
import { useAuth } from '../auth';
import { iso } from '../ui';

export type Person = { first_name: string; last_name: string; phone: string };

/* Τα στοιχεία του χρήστη. Τα χρησιμοποιούν όλες οι εκδοχές του προφίλ και η οθόνη «Τα στοιχεία μου». */
export function usePerson() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [p, setP] = useState<Person>({ first_name: '', last_name: '', phone: '' });
  useEffect(() => { sb.from('profiles').select('*').eq('id', uid).maybeSingle().then(({ data }) => data && setP({ ...data, phone: data.phone ?? '' })); }, [uid]);
  const save = async () => {
    const { error } = await sb.from('profiles').upsert({ id: uid, first_name: p.first_name.trim(), last_name: p.last_name.trim(), phone: p.phone.replace(/\D/g, '').slice(0, 10) });
    say(error ? 'Δεν αποθηκεύτηκε' : 'Αποθηκεύτηκε');
    return !error;
  };
  const email = session!.user.email ?? '';
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const initials = ((p.first_name || '').slice(0, 1) + (p.last_name || '').slice(0, 1)).toUpperCase() || (email || '?').slice(0, 1).toUpperCase();
  return { uid, p, setP, save, email, name, initials };
}

/* Έχει επιχείρηση; Πόσα επερχόμενα ραντεβού; (ανανεώνονται κάθε φορά που ανοίγει το προφίλ) */
export function useProfileExtras(uid: string) {
  const [hasBiz, setHasBiz] = useState<boolean | null>(null);
  const [upcoming, setUpcoming] = useState<number | null>(null);
  useFocusEffect(useCallback(() => {
    sb.from('businesses').select('id').eq('owner_id', uid).maybeSingle().then(({ data }) => setHasBiz(!!data));
    rpc('my_bookings').then((m: any) => {
      const today = iso(new Date());
      setUpcoming(((m?.bookings ?? []) as any[]).filter((b) => b.status === 'booked' && b.date >= today).length);
    }).catch(() => setUpcoming(null));
  }, [uid]));
  return { hasBiz, upcoming };
}

export const signOut = async () => { await sb.auth.signOut(); setDemo(false); };
