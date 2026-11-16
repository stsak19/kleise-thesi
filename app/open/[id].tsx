import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { demoSession, isDemo, isDemoSession, setDemo } from '../../lib/demo';
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
  const params = useLocalSearchParams<{ id: string }>();
  // Το id από τη διαδρομή· αν δεν έχει έρθει ακόμα στις παραμέτρους, από το ίδιο το URL.
  const path = usePathname();
  const id = params.id || (path.match(/^\/open\/([^/?#]+)/)?.[1] ?? '');
  const { session } = useAuth();
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    (async () => {
      if (!isDemo()) {
        // Ένας πραγματικός λογαριασμός στη συσκευή αποσυνδέεται πρώτα, για να μη μπερδευτούν τα δεδομένα.
        await sb.auth.signOut({ scope: 'local' }).catch(() => {});
        setDemo(true);
        const ds = demoSession();
        await sb.auth.setSession({ access_token: ds.access_token, refresh_token: ds.refresh_token });
      }
      if (!live) return;
      if (id === 'demo') { setMode('client'); setTo('/'); return; }
      // Το super admin με δοκιμαστικά δεδομένα (στη βάση ανοίγει μόνο για όσους είναι στο platform_admins).
      if (id === 'admin') { setMode('client'); setTo('/admin'); return; }
      setActiveBiz(String(id));
      setMode('biz');
      setTo('/today');
    })();
    return () => { live = false; };
  }, [id]);
  // Πάμε μόνο όταν η δοκιμαστική σύνδεση έχει φτάσει στην εφαρμογή· αλλιώς η σελίδα (π.χ. /admin) θα έβλεπε «χωρίς σύνδεση».
  useEffect(() => { if (to && session && isDemoSession(session.refresh_token)) router.replace(to as any); }, [to, session]);
  return <View style={{ flex: 1, backgroundColor: C.bg }} />;
}
