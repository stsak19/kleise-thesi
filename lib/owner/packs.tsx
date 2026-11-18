import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text } from '../Txt';
import { C, Chip, Icon, Input, alpha, s } from '../ui';
import { PLAN_KIND } from './kinds';
import { sb } from '../supabase';

/* Τα πακέτα της επιχείρησης: η φόρμα ενός πακέτου (ίδια στον οδηγό και στη σελίδα «Πακέτα»)
   και έτοιμες προτάσεις ανά είδος, ώστε ένα νέο γυμναστήριο να μη βγαίνει χωρίς πακέτα (έλεγχος 2026-11-18). */

export type PackForm = { id?: string; name: string; kind: string; price: string; sessions: string; days: string; only: string[] };
export const blankPack = (): PackForm => ({ name: '', kind: 'pack', price: '', sessions: '', days: '30', only: [] });

const P = (name: string, sessions: number | null, days: number, kind = 'pack'): PackForm => ({ name, kind, price: '', sessions: sessions ? String(sessions) : '', days: String(days), only: [] });
/* Προτάσεις: όνομα, επισκέψεις, μέρες. Την τιμή τη γράφει ο ιδιοκτήτης. */
export function suggestPacks(category?: string | null): PackForm[] {
  switch (category) {
    case 'gym': return [P('8 επισκέψεις', 8, 30), P('12 επισκέψεις', 12, 30), P('Απεριόριστο μήνα', null, 30, 'sub')];
    case 'pilates_yoga': return [P('4 μαθήματα', 4, 30), P('8 μαθήματα', 8, 30)];
    case 'personal_training': return [P('5 προπονήσεις', 5, 60), P('10 προπονήσεις', 10, 90)];
    case 'physio': return [P('5 συνεδρίες', 5, 60), P('10 συνεδρίες', 10, 90)];
    default: return [P('5 επισκέψεις', 5, 60), P('10 επισκέψεις', 10, 90)];
  }
}

const cents = (v: string) => Math.round(parseFloat(v.replace(',', '.')) * 100);
export const priceOk = (v: string) => v.trim() !== '' && !isNaN(cents(v));
/* Τι λείπει από τη φόρμα (κενό = όλα καλά). */
export const packMissing = (f: PackForm) => (!f.name.trim() ? 'Γράψε όνομα' : !priceOk(f.price) ? 'Γράψε τιμή' : '');

/* Η γραμμή για τη βάση. service_ids μόνο όταν το πακέτο ισχύει για μερικά μαθήματα (015_pack_services). */
export function packRow(f: PackForm, business: string, allSvcs: number) {
  const row: any = { business_id: business, name: f.name.trim(), kind: f.kind, price_cents: cents(f.price),
    sessions: f.sessions ? +f.sessions : null, days: f.days ? +f.days : null, active: true };
  if (f.only.length && f.only.length < allSvcs) row.service_ids = f.only;
  else if (f.id) row.service_ids = null;
  return row;
}
export const toForm = (p: any): PackForm => ({ id: p.id, name: p.name ?? '', kind: p.kind ?? 'pack', price: p.price_cents != null ? String(p.price_cents / 100).replace('.', ',') : '',
  sessions: p.sessions ? String(p.sessions) : '', days: p.days ? String(p.days) : '', only: p.service_ids ?? [] });

/* Αποθήκευση: νέο (insert) ή αλλαγή (update). Χωρίς τη στήλη service_ids (βάση πριν το 015) ξαναδοκιμάζει χωρίς αυτήν. */
export async function savePack(f: PackForm, business: string, allSvcs: number): Promise<string | null> {
  const row = packRow(f, business, allSvcs);
  const run = (r: any) => (f.id ? sb.from('packages').update(r).eq('id', f.id) : sb.from('packages').insert(r));
  let { error } = await run(row);
  if (error && /service_ids/.test(error.message)) {
    if (row.service_ids) return 'Για πακέτο σε συγκεκριμένα μαθήματα η βάση χρειάζεται την ενημέρωση 015. Διάλεξε «Όλα μαζί» ή τρέξε το 015.';
    delete row.service_ids; ({ error } = await run(row));
  }
  return error ? error.message : null;
}

/* Τα πεδία ενός πακέτου. svcs: τα μαθήματα/υπηρεσίες, για το «Ισχύει για» (μόνο όταν είναι πάνω από ένα). */
export function PackFields({ f, setF, svcs = [] }: { f: PackForm; setF: (f: PackForm) => void; svcs?: { id: string; name: string }[] }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
        {Object.entries(PLAN_KIND).map(([key, label]) => <Chip key={key} label={label} on={f.kind === key} onPress={() => setF({ ...f, kind: key })} />)}
      </View>
      <Input label="Όνομα" placeholder="π.χ. 10 επισκέψεις" value={f.name} onChangeText={(name) => setF({ ...f, name })} />
      <View style={[s.row, { gap: 10 }]}>
        <View style={{ flex: 1 }}><Input label="Τιμή €" keyboardType="decimal-pad" placeholder="π.χ. 50" value={f.price} onChangeText={(v) => setF({ ...f, price: v })} /></View>
        <View style={{ flex: 1 }}><Input label="Επισκέψεις" keyboardType="number-pad" placeholder="Απεριόριστες" value={f.sessions} onChangeText={(v) => setF({ ...f, sessions: v.replace(/\D/g, '') })} /></View>
        <View style={{ flex: 1 }}><Input label="Μέρες" keyboardType="number-pad" value={f.days} onChangeText={(v) => setF({ ...f, days: v.replace(/\D/g, '') })} /></View>
      </View>
      {svcs.length > 1 && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.mute, fontSize: 13, fontWeight: '700' }}>Ισχύει για</Text>
          <Text style={{ color: C.mute, fontSize: 12.5 }}>Διάλεξε ένα μάθημα ή περισσότερα μαζί.</Text>
          <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
            {svcs.map((x) => <Chip key={x.id} label={x.name} on={f.only.includes(x.id)}
              onPress={() => setF({ ...f, only: f.only.includes(x.id) ? f.only.filter((y) => y !== x.id) : [...f.only, x.id] })} />)}
            <Chip label={f.only.length === svcs.length ? 'Κανένα' : 'Όλα μαζί'} on={false}
              onPress={() => setF({ ...f, only: f.only.length === svcs.length ? [] : svcs.map((x) => x.id) })} />
          </View>
        </View>
      )}
    </View>
  );
}

/* Προειδοποίηση στο Πρόγραμμα: «Πακέτα κρατήσεων» ανοιχτά αλλά κανένα πακέτο = κανείς δεν μπορεί να κλείσει θέση. */
export function NoPacksNote({ biz }: { biz: any }) {
  const router = useRouter();
  const [n, setN] = useState<number | null>(null);
  useFocusEffect(useCallback(() => {
    if (!biz?.uses_credits) { setN(null); return; }
    sb.from('packages').select('id', { count: 'exact', head: true }).eq('business_id', biz.id).eq('active', true)
      .then(({ count, error }) => setN(error ? null : count ?? 0));
  }, [biz?.id, biz?.uses_credits]));
  if (!biz?.uses_credits || n !== 0) return null;
  return (
    <Pressable onPress={() => router.push('/owner/plans')} accessibilityRole="button"
      style={({ pressed }) => [s.row, { gap: 10, backgroundColor: alpha(C.bad, 0.08), borderRadius: 16, padding: 14, opacity: pressed ? 0.8 : 1 }]}>
      <Text style={{ flex: 1, color: C.bad, fontSize: 14, lineHeight: 20 }}>
        Οι πελάτες δεν μπορούν να κλείσουν θέση: δεν έχεις ακόμα πακέτα. <Text style={{ color: C.bad, fontWeight: '800' }}>Πρόσθεσε πακέτο</Text>
      </Text>
      <Icon name="chevron" size={14} color={C.bad} />
    </Pressable>
  );
}
