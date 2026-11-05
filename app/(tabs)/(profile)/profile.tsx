import { say } from '../../../lib/alert';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { setDemo } from '../../../lib/demo';
import { sb } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Btn, C, Card, Group, Input, Row, ScreenHeader, Section, T, alpha, s } from '../../../lib/ui';

export default function Profile() {
  const { session } = useAuth();
  const router = useRouter();
  const uid = session!.user.id;
  const [p, setP] = useState({ first_name: '', last_name: '', phone: '' });
  useEffect(() => { sb.from('profiles').select('*').eq('id', uid).maybeSingle().then(({ data }) => data && setP(data)); }, [uid]);
  const save = async () => {
    const { error } = await sb.from('profiles').upsert({ id: uid, first_name: p.first_name.trim(), last_name: p.last_name.trim(), phone: p.phone.replace(/\D/g, '').slice(0, 10) });
    say(error ? 'Δεν αποθηκεύτηκε' : 'Αποθηκεύτηκε');
  };
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const initials = ((p.first_name || '').slice(0, 1) + (p.last_name || '').slice(0, 1)).toUpperCase() || (session!.user.email ?? '?').slice(0, 1).toUpperCase();

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled">
      <View style={{ marginHorizontal: -20 }}><ScreenHeader title="Προφίλ" /></View>

      {/* Κάρτα χρήστη */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
          boxShadow: `0px 8px 18px ${alpha(C.accent, 0.3)}` }}>
          <Text style={{ color: C.onAccent, fontWeight: '900', fontSize: 24 }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 20, letterSpacing: -0.4 }} numberOfLines={1}>{name || 'Χωρίς όνομα'}</Text>
          <T mute style={{ fontSize: 14 }}>{session!.user.email}</T>
        </View>
      </Card>

      <Section title="Τα στοιχεία μου" sub="Τα βλέπει η επιχείρηση όταν κλείνεις θέση." />
      <Card style={{ gap: 14 }}>
        <View style={[s.row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><Input label="Όνομα" placeholder="Μαρία" value={p.first_name} onChangeText={(v) => setP({ ...p, first_name: v })} /></View>
          <View style={{ flex: 1 }}><Input label="Επώνυμο" placeholder="Παπαδοπούλου" value={p.last_name} onChangeText={(v) => setP({ ...p, last_name: v })} /></View>
        </View>
        <Input label="Κινητό" icon="phone" placeholder="69xxxxxxxx" keyboardType="phone-pad" value={p.phone ?? ''} onChangeText={(v) => setP({ ...p, phone: v })} />
        <Btn title="Αποθήκευση" onPress={save} />
      </Card>

      <Section title="Για επιχειρήσεις" />
      <Group>
        <Row icon="store" title="Η επιχείρησή μου" sub="Ωράριο, υπηρεσίες, χρώμα και κρατήσεις" onPress={() => router.push('/owner')} last />
      </Group>

      <View style={{ marginTop: 10 }}>
        <Group>
          <Row title="Αποσύνδεση" danger last onPress={async () => { await sb.auth.signOut(); setDemo(false); }} right={<View />} />
        </Group>
      </View>
    </ScrollView>
  );
}
