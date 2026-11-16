import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { demoSession, isDemo, setDemo } from '../../lib/demo';
import { setMode } from '../../lib/mode';
import { setActiveBiz } from '../../lib/owner/active';
import { sb } from '../../lib/supabase';
import { C } from '../../lib/ui';

/* Κρυφή είσοδος στο demo (δεν φαίνεται πουθενά στην εφαρμογή, μόνο με τον σύνδεσμο):
   .../open/demo     → η εφαρμογή πελάτη με τα δοκιμαστικά καταστήματα, ως «Χριστίνα Αντωνίου»
   .../open/b-eleni  → λειτουργία επιχείρησης, Πρόγραμμα αυτής της δοκιμαστικής επιχείρησης
   .../open/admin    → ο πίνακας super admin με τα δοκιμαστικά καταστήματα και πελάτες
   Το demo τρέχει μόνο στη συσκευή και δεν αγγίζει τη βάση. Φεύγει με την Αποσύνδεση. */
export default function OpenBiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    (async () => {
      if (!isDemo()) {
        // Ένας πραγματικός λογαριασμός στη συσκευή αποσυνδέεται πρώτα, για να μη μπερδευτούν τα δεδομένα.
        await sb.auth.signOut({ scope: 'local' }).catch(() => {});
        setDemo(true);
        const ds = demoSession();
        await sb.auth.setSession({ access_token: ds.access_token, refresh_token: ds.refresh_token });
      }
      if (!id || id === 'demo') { setMode('client'); router.replace('/'); return; }
      // Το super admin με δοκιμαστικά δεδομένα (στη βάση ανοίγει μόνο για όσους είναι στο platform_admins).
      if (id === 'admin') { setMode('client'); router.replace('/admin'); return; }
      setActiveBiz(String(id));
      setMode('biz');
      router.replace('/today');
    })();
  }, []);
  return <View style={{ flex: 1, backgroundColor: C.bg }} />;
}
