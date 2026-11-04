import { say, promptText } from '../../../lib/alert';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { sb } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Btn, H, Input, T, s } from '../../../lib/ui';

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
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <H>Τα στοιχεία μου</H>
      <T mute>Τα βλέπει η επιχείρηση όταν κλείνεις θέση.</T>
      <Input placeholder="Όνομα" value={p.first_name} onChangeText={(v) => setP({ ...p, first_name: v })} />
      <Input placeholder="Επώνυμο" value={p.last_name} onChangeText={(v) => setP({ ...p, last_name: v })} />
      <Input placeholder="Κινητό" keyboardType="phone-pad" value={p.phone ?? ''} onChangeText={(v) => setP({ ...p, phone: v })} />
      <Btn title="Αποθήκευση" onPress={save} />
      <H>Για επιχειρήσεις</H>
      <T mute>Στήσε το κατάστημά σου: χρώμα, ωράριο, υπηρεσίες και κρατήσεις.</T>
      <Btn kind="ghost" title="🏪 Η επιχείρησή μου" onPress={() => router.push('/owner')} />
      <Btn kind="ghost" title="Αποσύνδεση" onPress={() => sb.auth.signOut()} />
    </ScrollView>
  );
}
