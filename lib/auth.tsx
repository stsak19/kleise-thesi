import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { sb } from './supabase';
import { demoReady, demoSession, isDemo, isDemoSession } from './demo';

const Ctx = createContext<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    demoReady().then(() => sb.auth.getSession()).then(async ({ data }) => {
      // Δοκιμαστική σύνδεση που έμεινε στη συσκευή από την εποχή του demo: δεν ισχύει στη βάση, οπότε αποσυνδέεται.
      if (!isDemo() && data.session && isDemoSession(data.session.refresh_token)) {
        await sb.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null); setReady(true); return;
      }
      // Με τα δοκιμαστικά δεδομένα παντού, ένας παλιός πραγματικός λογαριασμός στη συσκευή συνεχίζει με το ίδιο email (καθαρός).
      if (isDemo() && data.session && !isDemoSession(data.session.refresh_token)) {
        const ds = demoSession(data.session.user.id, data.session.user.email ?? data.session.user.id);
        const r = await sb.auth.setSession({ access_token: ds.access_token, refresh_token: ds.refresh_token });
        setSession(r.data.session); setReady(true); return;
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
