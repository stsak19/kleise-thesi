import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { demoFetch } from './demo';

const extra = Constants.expoConfig?.extra ?? {};
export const sb = createClient(extra.supabaseUrl, extra.supabaseAnonKey, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web' },
  global: { fetch: demoFetch as typeof fetch },
});

/* Η ιστοσελίδα: εδώ οδηγούν τα email επιβεβαίωσης και νέου κωδικού (και από το κινητό ανοίγουν στον browser).
   Πρέπει να υπάρχει και στη Supabase: Authentication → URL Configuration (Site URL / Redirect URLs). */
export const WEB_URL = 'https://stsak19.github.io/kleise-thesi/';

export async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
