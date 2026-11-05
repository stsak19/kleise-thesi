import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { say } from '../../../lib/alert';
import { sb } from '../../../lib/supabase';
import { LAYOUTS, styleOf } from '../../../lib/presets';
import { PagePreview } from '../../../lib/owner/PagePreview';
import { NoBiz, useMyBiz } from '../../../lib/owner/hub';
import { C, Group, Row, ScreenHeader, Section, SwitchRow, catLabel, s } from '../../../lib/ui';

/* «Σελίδα»: πώς φαίνεται το κατάστημα στους πελάτες, η δημοσίευση και οι αλλαγές (υπηρεσίες, ωράριο, εμφάνιση). */
export default function Page() {
  const router = useRouter();
  const biz = useMyBiz();
  const [published, setPublished] = useState<boolean | null>(null);
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
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0 }]}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title="Η σελίδα μου" sub={[catLabel(biz.category), biz.city].filter(Boolean).join(' · ')} />
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
    </ScrollView>
  );
}
