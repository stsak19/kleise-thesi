import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { say } from '../../../lib/alert';
import { sb } from '../../../lib/supabase';
import { LAYOUTS, styleOf } from '../../../lib/presets';
import { PagePreview } from '../../../lib/owner/PagePreview';
import { NoBiz, useMyBiz } from '../../../lib/owner/hub';
import { C, Card, Group, Row, ScreenHeader, Section, SwitchRow, T, TAB_SPACE, catLabel, s } from '../../../lib/ui';
import { signOut, usePerson } from '../../../lib/profile/data';
import { Initials } from '../../../lib/profile/parts';
import { modeLabel } from '../../../lib/profile/Settings';
import { useSwitchTo } from '../../../lib/SwitchMode';
import { deskCol, useWide } from '../../../lib/owner/desk';

/* «Κατάστημα»: πώς φαίνεται το κατάστημα στους πελάτες, η δημοσίευση και οι αλλαγές (υπηρεσίες, ωράριο, εμφάνιση).
   Στο κινητό από κάτω και ο λογαριασμός (στον υπολογιστή είναι στο πλαϊνό μενού). */
export default function Page() {
  const router = useRouter();
  const biz = useMyBiz();
  const [published, setPublished] = useState<boolean | null>(null);
  const wide = useWide();
  const person = usePerson();
  const switchTo = useSwitchTo();
  useEffect(() => { if (biz) setPublished(!!biz.is_published); }, [biz]);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;

  const st = styleOf(biz);
  const publish = async (v: boolean) => {
    setPublished(v);
    const { error } = await sb.from('businesses').update({ is_published: v }).eq('id', biz.id);
    if (error) { setPublished(!v); say('Δεν αποθηκεύτηκε', error.message); }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0, paddingBottom: TAB_SPACE }, deskCol(wide)]}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title="Κατάστημα" sub={[catLabel(biz.category), biz.city].filter(Boolean).join(' · ')} />
      </View>
      <PagePreview biz={{ ...biz, is_published: published }} />

      <Group>
        <SwitchRow label="Δημοσίευση" sub={published ? 'Οι πελάτες σε βρίσκουν στην αναζήτηση' : 'Η σελίδα δεν φαίνεται ακόμα στην αναζήτηση'}
          value={!!published} onChange={publish} last />
      </Group>

      <Section title="Αλλαγές" />
      <Group>
        <Row icon="gear" title="Υπηρεσίες, ωράριο και κανόνες" sub="Τα στοιχεία του καταστήματος" onPress={() => router.push('/owner/setup')} />
        <Row icon="eye" title="Εμφάνιση σελίδας" sub={`${LAYOUTS.find((l) => l.key === st.layout)?.name ?? ''} · ${st.theme.name}`} onPress={() => router.push('/owner/style')} />
        <Row icon="store" title="Δες τη σελίδα σαν πελάτης" sub="Έτσι τη βλέπουν όσοι κλείνουν θέση" onPress={() => router.push(`/store/${biz.id}`)} last />
      </Group>
      <Text style={{ color: C.mute, fontSize: 13, textAlign: 'center', marginTop: 4 }}>Οι αλλαγές φαίνονται αμέσως στους πελάτες.</Text>

      {!wide && <>
        <Section title="Λογαριασμός" />
        <Card onPress={() => router.push('/account')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
          <Initials text={person.initials} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{person.name || 'Χωρίς όνομα'}</Text>
            <T mute style={{ fontSize: 14 }}>{person.email}</T>
          </View>
        </Card>
        <Group>
          <Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()} · κίνηση · κωδικός`} onPress={() => router.push('/app-settings')} />
          <Row icon="search" title="Μετάβαση σε πελάτη" sub="Κλείσε θέση σε άλλα καταστήματα" onPress={() => switchTo('client')} last />
        </Group>
        <Group><Row title="Αποσύνδεση" danger last onPress={signOut} right={<View />} /></Group>
      </>}
    </ScrollView>
  );
}
