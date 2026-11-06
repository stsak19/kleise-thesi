import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb } from './supabase';
import { DEMO_UID, demoSession, isDemo } from './demo';

const Ctx = createContext<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      // Με τα δοκιμαστικά δεδομένα παντού, ένας παλιός πραγματικός λογαριασμός στη συσκευή γίνεται ο δοκιμαστικός.
      if (isDemo() && data.session && data.session.user.id !== DEMO_UID) {
        const ds = demoSession();
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
