import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { sb } from '../supabase';
import { useAuth } from '../auth';

/* Ποια από τις επιχειρήσεις του λογαριασμού είναι ανοιχτή στη λειτουργία επιχείρησης.
   Ένας λογαριασμός μπορεί να έχει πολλές (π.χ. δύο καταστήματα)· η επιλογή μένει στη συσκευή
   και όλες οι οθόνες της επιχείρησης ξαναφορτώνουν όταν αλλάζει. */
const KEY = 'biz.active.v1';
let active: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
AsyncStorage.getItem(KEY).then((v) => { if (v && !active) { active = v; emit(); } }).catch(() => {});

export const getActiveBiz = () => active;
export function setActiveBiz(id: string) {
  active = id; emit();
  AsyncStorage.setItem(KEY, id).catch(() => {});
}
export function useActiveBizId() {
  const [, setV] = useState(0);
  useEffect(() => { const f = () => setV((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return active;
}

/* Όλες οι επιχειρήσεις του χρήστη (με τη σειρά που δημιουργήθηκαν). */
export async function fetchMyBizList(uid: string): Promise<any[]> {
  const { data } = await sb.from('businesses').select('*').eq('owner_id', uid).order('created_at');
  return data ?? [];
}
export const pickActive = (list: any[]) => list.find((b) => b.id === active) ?? list[0] ?? null;
export async function fetchMyBiz(uid: string) { return pickActive(await fetchMyBizList(uid)); }

/* Η λίστα για τον γρήγορο διακόπτη. */
export function useMyBizList() {
  const { session } = useAuth();
  const [list, setList] = useState<any[]>([]);
  useFocusEffect(useCallback(() => { fetchMyBizList(session!.user.id).then(setList); }, [session]));
  return list;
}
