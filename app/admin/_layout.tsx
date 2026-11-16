import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { useIsAdmin } from '../../lib/admin/data';
import { Loading, Shell } from '../../lib/admin/parts';
import { rpc } from '../../lib/supabase';
import { Btn, C, Empty } from '../../lib/ui';

/* /admin: ο πίνακας super admin της πλατφόρμας. Ανοίγει μόνο για όσους είναι στο platform_admins της βάσης
   (και η βάση ξαναελέγχει σε κάθε κλήση). Για τους άλλους: «Δεν επιτρέπεται». */
export default function AdminLayout() {
  const { session } = useAuth();
  const ok = useIsAdmin(session?.user.id);
  const router = useRouter();
  const path = usePathname();
  const [badges, setBadges] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!ok) return;
    rpc('admin_overview').then((o: any) => setBadges({
      deletions: o?.deletions?.length ?? 0,
      reviews: (o?.attention ?? []).filter((x: any) => x.kind === 'review').length,
    })).catch(() => {});
  }, [ok, path]);
  if (ok === null) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading /></View>;
  if (!ok) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}>
      <Empty icon="lock" title="Δεν επιτρέπεται" text="Αυτή η σελίδα είναι μόνο για τη διαχείριση του SpotOn." />
      <Btn kind="ghost" title="Πίσω στην εφαρμογή" onPress={() => router.replace('/')} style={{ alignSelf: 'center' }} />
    </View>
  );
  return <Shell badges={badges}><Slot /></Shell>;
}
