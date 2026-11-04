import { say } from '../../../../lib/alert';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { sb } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/auth';
import { Btn, C, Card, Group, Icon, Section, T, alpha, catLabel, onColor, s } from '../../../../lib/ui';
import { BizHeader } from '../../../../lib/BizHeader';
import { LAYOUTS, THEMES, presetFor, styleOf, themeOf } from '../../../../lib/presets';

const COLORS = ['#1d85ed', '#2563eb', '#1e3a8a', '#6366f1', '#a855f7', '#d946ef', '#ec4899', '#ed1d51', '#840b29', '#f97316',
  '#f59e0b', '#84cc16', '#1fa971', '#059669', '#14b8a6', '#0ea5e9', '#92400e', '#334155', '#16161a'];

/* Εμφάνιση καταστήματος: διάταξη σελίδας κράτησης, θέμα (έτοιμα presets) και χρώμα, με ζωντανή προεπισκόπηση. */
export default function Style() {
  const router = useRouter();
  const { session } = useAuth();
  const [b, setB] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    sb.from('businesses').select('*').eq('owner_id', session!.user.id).maybeSingle().then(({ data }) => setB(data ?? null));
  }, [session]));

  if (!b) return <View style={s.screen} />;
  const st = styleOf(b);
  const preset = presetFor(b.category);
  const isDefault = !b.layout && !b.theme && !b.brand_color;

  const save = async () => {
    setSaving(true);
    const { error } = await sb.from('businesses').update({ layout: b.layout ?? null, theme: b.theme ?? null, brand_color: b.brand_color ?? null }).eq('id', b.id);
    setSaving(false);
    if (error) return say('Δεν αποθηκεύτηκε', error.message.includes('layout') || error.message.includes('theme')
      ? 'Χρειάζεται ενημέρωση της βάσης (supabase/migrations/003).' : error.message);
    say('Αποθηκεύτηκε', 'Έτσι θα βλέπουν οι πελάτες τη σελίδα σου.'); router.back();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      {/* Προεπισκόπηση */}
      <Section title="Προεπισκόπηση" sub="Αλλάζει αμέσως με κάθε επιλογή." />
      <Card style={{ gap: 12, padding: 14 }}>
        <BizHeader biz={b} header={st.header} color={st.color} radius={st.radius} full={false} />
        <View style={[s.row, { gap: 12, padding: 12, borderRadius: st.radius + 4, borderWidth: 1, borderColor: alpha(C.text, 0.1) }]}>
          <View style={{ width: 56 }}>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 18 }}>18:00</Text>
            <Text style={{ color: C.mute, fontSize: 11 }}>έως 19:00</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {st.layout === 'classes' && <Text style={{ color: C.text, fontWeight: '800' }}>{preset.services[0].name}</Text>}
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{st.layout === 'classes' ? '4 ελεύθερες θέσεις' : 'Ελεύθερο'}</Text>
            {st.layout === 'classes' && <View style={{ height: 6, borderRadius: 3, backgroundColor: alpha(C.text, 0.08) }}>
              <View style={{ width: '66%', height: '100%', borderRadius: 3, backgroundColor: C.ok }} /></View>}
          </View>
          <View style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: Math.max(6, st.radius - 2), backgroundColor: st.color }}>
            <Text style={{ color: onColor(st.color), fontWeight: '800' }}>Κράτηση</Text>
          </View>
        </View>
      </Card>

      {/* Διάταξη */}
      <Section title="Διάταξη σελίδας κράτησης" sub={`Προτεινόμενη για ${catLabel(b.category)}: ${LAYOUTS.find((l) => l.key === preset.layout)!.name}`} />
      <Group>
        {LAYOUTS.map((l, i) => {
          const on = st.layout === l.key;
          return (
            <Pressable key={l.key} onPress={() => setB({ ...b, layout: l.key })}
              style={[s.row, { gap: 14, padding: 14, backgroundColor: on ? alpha(st.color, 0.08) : 'transparent' },
                i < LAYOUTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: alpha(C.text, 0.08) }]}>
              <Text style={{ fontSize: 26 }}>{l.emoji}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{l.name}{l.key === preset.layout ? '  · προτεινόμενη' : ''}</Text>
                <Text style={{ color: C.mute, fontSize: 13, lineHeight: 18 }}>{l.text}</Text>
              </View>
              {on && <Icon name="check" size={18} color={st.color} />}
            </Pressable>
          );
        })}
      </Group>

      {/* Θέμα */}
      <Section title="Θέμα" sub="Έτοιμοι συνδυασμοί χρώματος, κορυφής σελίδας και στρογγυλέματος." />
      <View style={[s.row, { flexWrap: 'wrap', gap: 10 }]}>
        {THEMES.map((t) => {
          const on = st.theme.key === t.key;
          return (
            <Pressable key={t.key} onPress={() => setB({ ...b, theme: t.key, brand_color: null })}
              style={{ width: '31%', flexGrow: 1, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? t.color : alpha(C.text, 0.12), backgroundColor: C.card, overflow: 'hidden' }}>
              <View style={{ height: t.header === 'minimal' ? 6 : 34, backgroundColor: t.color, borderBottomLeftRadius: t.header === 'cover' ? t.radius : 0, borderBottomRightRadius: t.header === 'cover' ? t.radius : 0 }} />
              <View style={{ padding: 10, gap: 6 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 13 }}>{t.emoji} {t.name}</Text>
                <View style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: Math.max(4, t.radius - 4), backgroundColor: t.color }}>
                  <Text style={{ color: onColor(t.color), fontSize: 11, fontWeight: '700' }}>Κράτηση</Text>
                </View>
              </View>
              {t.key === preset.theme && <Text style={{ position: 'absolute', right: 8, top: 6, color: onColor(t.color), fontSize: 10, fontWeight: '800' }}>★</Text>}
            </Pressable>
          );
        })}
      </View>

      {/* Χρώμα */}
      <Section title="Χρώμα" sub={b.brand_color ? 'Δικό σου χρώμα' : `Του θέματος «${st.theme.name}»`} />
      <Card style={{ gap: 12 }}>
        <View style={[s.row, { flexWrap: 'wrap', gap: 10 }]}>
          {COLORS.map((c) => {
            const on = st.color.toLowerCase() === c;
            return (
              <Pressable key={c} onPress={() => setB({ ...b, brand_color: c })}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c, alignItems: 'center', justifyContent: 'center',
                  boxShadow: on ? `0px 0px 0px 3px ${C.card}, 0px 0px 0px 5px ${c}` : undefined }}>
                {on && <Icon name="check" size={16} color={onColor(c)} />}
              </Pressable>
            );
          })}
        </View>
        {!!b.brand_color && <Btn kind="ghost" size="sm" title={`Χρώμα του θέματος (${themeOf(b.theme)?.name ?? st.theme.name})`} onPress={() => setB({ ...b, brand_color: null })} />}
      </Card>

      {!isDefault && <Btn kind="ghost" title={`Επαναφορά στο πρότυπο «${catLabel(b.category)}»`} onPress={() => setB({ ...b, layout: null, theme: null, brand_color: null })} />}
      <T mute style={{ fontSize: 13 }}>Το είδος της επιχείρησης, οι υπηρεσίες και το ωράριο αλλάζουν από τις Ρυθμίσεις.</T>
      <Btn title={saving ? 'Αποθήκευση…' : 'Αποθήκευση'} color={st.color} disabled={saving} onPress={save} />
    </ScrollView>
  );
}
