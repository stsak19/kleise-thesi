import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb } from './supabase';
import { demoSession, isDemo, isDemoSession } from './demo';

const Ctx = createContext<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      // Με τα δοκιμαστικά δεδομένα παντού, ένας παλιός πραγματικός λογαριασμός στη συσκευή συνεχίζει με το ίδιο email (καθαρός).
      if (isDemo() && data.session && !isDemoSession(data.session.refresh_token)) {
        const ds = demoSession(data.session.user.id, data.session.user.email ?? data.session.user.id);
        const r = await sb.auth.setSession({ access_token: ds.access_token, refresh_token: ds.refresh_token });
        setSession(r.data.session); setReady(true); return;
      }
      setSession(data.session); setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => data.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={{ session, ready }}>{children}</Ctx.Provider>;
}
