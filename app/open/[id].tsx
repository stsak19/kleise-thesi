import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { demoSession, setDemo } from '../../lib/demo';
import { setMode } from '../../lib/mode';
import { setActiveBiz } from '../../lib/owner/active';
import { sb } from '../../lib/supabase';
import { C } from '../../lib/ui';

/* Άμεσος σύνδεσμος σε μία επιχείρηση, σε λειτουργία επιχείρησης: .../open/b-eleni
   Αν δεν υπάρχει σύνδεση, μπαίνει όπως το «Δες το demo». Μετά ανοίγει το Πρόγραμμα αυτής της επιχείρησης. */
export default function OpenBiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  useEffect(() => {
    (async () => {
      if (!session) {
        setDemo(true);
        const ds = demoSession();
        await sb.auth.setSession({ access_token: ds.access_token, refresh_token: ds.refresh_token });
      }
      if (id) setActiveBiz(String(id));
      setMode('biz');
      router.replace('/today');
    })();
  }, []);
  return <View style={{ flex: 1, backgroundColor: C.bg }} />;
}
