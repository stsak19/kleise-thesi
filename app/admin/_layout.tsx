import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { useAdminState } from '../../lib/admin/data';
import { Loading, Shell } from '../../lib/admin/parts';
import { rpc } from '../../lib/supabase';
import { Text } from '../../lib/Txt';
import { Btn, C, Empty } from '../../lib/ui';

/* /admin: ο πίνακας super admin της πλατφόρμας. Ανοίγει μόνο για όσους είναι στο platform_admins της βάσης
   (και η βάση ξαναελέγχει σε κάθε κλήση). Για τους άλλους: «Δεν επιτρέπεται». */
export default function AdminLayout() {
  const { session } = useAuth();
  const st = useAdminState(session?.user.id);
  const ok = st === 'admin';
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
  if (!session || st === null) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading /></View>;
  if (!ok) {
    const msg = st === 'nodb'
      ? { title: 'Η βάση δεν έχει ακόμα το super admin', text: 'Τρέξε το αρχείο 010-super-admin.sql στο SQL Editor της Supabase και μετά τη γραμμή που σε ορίζει super admin. Μετά ανανέωσε τη σελίδα.' }
      : st === 'error'
        ? { title: 'Η βάση δεν απάντησε', text: 'Δοκίμασε ξανά σε λίγο.' }
        : { title: 'Δεν είσαι super admin', text: 'Αυτή η σελίδα ανοίγει μόνο για τη διαχείριση του SpotOn. Αν είναι ο δικός σου λογαριασμός, πρόσθεσέ τον στο platform_admins (γραμμή στο τέλος του 010-super-admin.sql) και ανανέωσε τη σελίδα.' };
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ maxWidth: 520, width: '100%', alignItems: 'center', gap: 6 }}>
          <Empty icon="lock" title={msg.title} text={msg.text} />
          {!!session.user.email && <Text style={{ color: C.mute, fontWeight: '600', fontSize: 13 }}>Συνδεδεμένος ως {session.user.email}</Text>}
          <Btn kind="ghost" title="Πίσω στην εφαρμογή" onPress={() => router.replace('/')} style={{ marginTop: 10 }} />
        </View>
      </View>
    );
  }
  return <Shell badges={badges}><Slot /></Shell>;
}
