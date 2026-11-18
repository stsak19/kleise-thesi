import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { say } from '../../../lib/alert';
import { sb } from '../../../lib/supabase';
import type { IconName } from '../../../lib/Icon';
import { PagePreview } from '../../../lib/owner/PagePreview';
import { NoBiz, useMyBiz, useStaff } from '../../../lib/owner/hub';
import { kindOf } from '../../../lib/owner/kinds';
import { C, Card, Group, Row, ScreenHeader, Section, SwitchRow, T, TAB_SPACE, catLabel, s } from '../../../lib/ui';
import { signOut, usePerson } from '../../../lib/profile/data';
import { Initials } from '../../../lib/profile/parts';
import { modeLabel } from '../../../lib/profile/Settings';
import { deskCol, useWide } from '../../../lib/owner/desk';
import { svcKind } from '../../../lib/owner/svcKind';
import { SECTIONS, sectionLabel, type SectionKey } from '../../../lib/owner/settings';

const ICON: Record<SectionKey, IconName> = { details: 'pin', hours: 'clock', services: 'calendar', rules: 'lock', look: 'eye' };
const SUB_ROW: Record<SectionKey, (b: any) => string> = {
  details: (b) => [b.name, b.city].filter(Boolean).join(' · ') || 'Όνομα, είδος, διεύθυνση',
  hours: () => 'Πότε είσαι ανοιχτά',
  services: () => 'Τι προσφέρεις, τιμές και διάρκεια',
  rules: () => 'Ακυρώσεις, πόσο νωρίτερα κλείνουν',
  look: () => 'Εξώφυλλο, φωτογραφία προφίλ και χρώμα',
};

/* «Κατάστημα»: πώς φαίνεται το κατάστημα στους πελάτες, η δημοσίευση και οι αλλαγές (υπηρεσίες, ωράριο, εμφάνιση).
   Στο κινητό από κάτω και ο λογαριασμός (στον υπολογιστή είναι στο πλαϊνό μενού). */
export default function Page() {
  const router = useRouter();
  const biz = useMyBiz();
  const [published, setPublished] = useState<boolean | null>(null);
  const wide = useWide();
  const person = usePerson();
  const { staff } = useStaff(biz);
  useEffect(() => { if (biz) setPublished(!!biz.is_published); }, [biz]);

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;

  const publish = async (v: boolean) => {
    setPublished(v);
    const { error } = await sb.from('businesses').update({ is_published: v }).eq('id', biz.id);
    if (error) { setPublished(!v); say('Δεν αποθηκεύτηκε', error.message); }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 0, paddingBottom: TAB_SPACE }, deskCol(wide)]}>
      <View style={{ marginHorizontal: -20 }}>
        <ScreenHeader title={wide ? 'Κατάστημα' : undefined} sub={[catLabel(biz.category), biz.city].filter(Boolean).join(' · ')} />
      </View>
      <PagePreview biz={{ ...biz, is_published: published }} />

      <Group>
        <SwitchRow label="Δημοσίευση" sub={published ? 'Οι πελάτες σε βρίσκουν στην αναζήτηση' : 'Η σελίδα δεν φαίνεται ακόμα στην αναζήτηση'}
          value={!!published} onChange={publish} last />
      </Group>

      {/* Ίδια σειρά με τον οδηγό· κάθε γραμμή ανοίγει μόνο τη δική της ενότητα */}
      <Section title="Αλλαγές" />
      <Group>
        {SECTIONS.map(({ key }) => (
          <Row key={key} icon={ICON[key]} title={sectionLabel(key, biz.category)} sub={SUB_ROW[key](biz)}
            onPress={() => router.push(wide ? `/shop-settings?s=${key}` : `/owner/setup?s=${key}`)} />
        ))}
        <Row icon="team" title={kindOf(biz.category).team} sub={staff.length > 1 ? `${staff.length} άτομα · ωράρια, υπηρεσίες, προσκλήσεις` : 'Πρόσθεσε άτομα που δουλεύουν μαζί σου'}
          onPress={() => router.push('/team')} />
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
          <Row icon="gear" title="Ρυθμίσεις" sub={`Εμφάνιση: ${modeLabel()} · κίνηση · κωδικός`} onPress={() => router.push('/app-settings')} last />
        </Group>
        <Group><Row title="Αποσύνδεση" danger last onPress={signOut} right={<View />} /></Group>
      </>}
    </ScrollView>
  );
}
