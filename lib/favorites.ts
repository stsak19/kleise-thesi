import { useEffect, useState } from 'react';
import { sb } from './supabase';
import { useAuth } from './auth';

/* Αγαπημένα καταστήματα του πελάτη (πίνακας favorites, migration 012).
   Κοινή κατάσταση για όλη την εφαρμογή: η καρδιά στο κατάστημα και η σειρά στην αρχική βλέπουν τα ίδια. */
export type FavBiz = { slug?: string | null; id: string; name: string; category: string; city: string; logo_url?: string | null; cover_url?: string | null;
  brand_color?: string | null; theme?: string | null; layout?: string | null };

let uid = '', list: FavBiz[] = [];
const subs = new Set<(l: FavBiz[]) => void>();
const emit = () => subs.forEach((f) => f(list));

async function load(id: string) {
  const { data, error } = await sb.from('favorites')
    .select('created_at, businesses(*)')
    .order('created_at', { ascending: false });
  if (id !== uid || error) return; // άλλαξε λογαριασμός στο μεταξύ, ή δεν έχει τρέξει ακόμα το 012
  list = ((data ?? []) as any[]).map((r) => r.businesses).filter((b) => b && b.is_published !== false);
  emit();
}

/* Τα αγαπημένα του συνδεδεμένου χρήστη (νεότερο πρώτο). Επισκέπτης: κενή λίστα. */
export function useFavorites() {
  const id = useAuth().session?.user.id ?? '';
  const [l, setL] = useState(list);
  useEffect(() => { subs.add(setL); return () => { subs.delete(setL); }; }, []);
  useEffect(() => {
    if (id === uid) return;
    uid = id; list = []; emit();
    if (id) load(id);
  }, [id]);
  return l;
}

export const isFavorite = (l: FavBiz[], bizId?: string) => !!bizId && l.some((b) => b.id === bizId);

/* Πρόσθεση / αφαίρεση. Αλλάζει αμέσως στην οθόνη και γυρίζει πίσω αν αποτύχει η βάση. */
export async function toggleFavorite(b: FavBiz) {
  if (!uid) return;
  const prev = list, on = prev.some((x) => x.id === b.id);
  list = on ? prev.filter((x) => x.id !== b.id) : [b, ...prev]; emit();
  const { error } = on
    ? await sb.from('favorites').delete().eq('user_id', uid).eq('business_id', b.id)
    : await sb.from('favorites').insert({ user_id: uid, business_id: b.id });
  if (error) { list = prev; emit(); }
}
