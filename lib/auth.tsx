import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { sb } from './supabase';
import { cleanupReady, isOldTestSession } from './cleanup';

const Ctx = createContext<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    cleanupReady.then(() => sb.auth.getSession()).then(async ({ data }) => {
      // Παλιά δοκιμαστική σύνδεση στη συσκευή: δεν είναι πραγματικός λογαριασμός, οπότε αποσυνδέεται.
      if (data.session && isOldTestSession(data.session.refresh_token)) {
        await sb.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null); setReady(true); return;
      }
      setSession(data.session); setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((e, sess) => {
      setSession(sess);
      // Άνοιξε τον σύνδεσμο «νέος κωδικός» από το email: πάει στη φόρμα νέου κωδικού.
      if (e === 'PASSWORD_RECOVERY') setTimeout(() => router.replace('/new-password'), 300);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={{ session, ready }}>{children}</Ctx.Provider>;
}
