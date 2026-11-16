import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../lib/Txt';
import { promptText, say } from '../../../lib/alert';
import { rpc, sb } from '../../../lib/supabase';
import { styleOf } from '../../../lib/presets';
import { NoBiz, Stat, packLine, useClients, useMyBiz } from '../../../lib/owner/hub';
import { Avatar, Btn, C, Card, Icon, Input, Pill, Section, T, fmtDay, iso, price, s } from '../../../lib/ui';
import { StarInput, Stars, fmtAvg, useRateClient } from '../../../lib/reviews';

/* Η καρτέλα ενός πελάτη: στοιχεία, πακέτο, ό,τι χρειάζεται να θυμάται η επιχείρηση (π.χ. συνταγή βαφής,
   στόχος προπόνησης, διάγνωση) και το ιστορικό των επισκέψεων. */
const STATUS: Record<string, { text: string; tone: 'ok' | 'bad' | 'mute' | 'accent' }> = {
  attended: { text: 'Ήρθε', tone: 'ok' }, no_show: { text: 'Δεν ήρθε', tone: 'bad' }, cancelled: { text: 'Ακυρώθηκε', tone: 'mute' }, booked: { text: 'Κλεισμένο', tone: 'accent' },
};

export default function Client() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const biz = useMyBiz();
  const { list, reload } = useClients(biz);
  const [hist, setHist] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [picks, setPicks] = useState<any[] | null>(null);
  const [rating, setRating] = useState<any>(null);
  const c = (list ?? []).find((x) => x.user_id === id);
  useEffect(() => { if (c) setNote(c.note ?? ''); }, [c?.user_id, c?.note]);
  const loadHist = useCallback(() => {
    if (!biz || !id) return;
    rpc<any[]>('owner_client_history', { p_business: biz.id, p_user: id }).then((h) => setHist(h ?? [])).catch(() => setHist([]));
    rpc('owner_client_rating', { p_business: biz.id, p_user: id }).then(setRating).catch(() => setRating(null));
  }, [biz?.id, id]);
  useFocusEffect(loadHist);
  const R = useRateClient(biz?.id, () => { loadHist(); reload(); });

  if (biz === undefined) return <View style={s.screen} />;
  if (biz === null) return <NoBiz />;
  if (!c) return <View style={s.screen} />;
  const brand = styleOf(biz).color;
  const today = iso(new Date());
  const next = hist.filter((h) => h.status === 'booked' && h.date >= today).pop();
  const past = hist.filter((h) => !(h.status === 'booked' && h.date >= today));

  const saveNote = async () => { await rpc('owner_set_note', { p_business: biz.id, p_user: c.user_id, p_note: note }).catch(() => say('Δεν αποθηκεύτηκε')); reload(); };
  const manual = () => promptText('Ανανέωση πακέτου', `Πόσες επισκέψεις για ${c.name};`, async (v) => {
    const n = parseInt(v, 10); if (n > 0) { await rpc('owner_renew', { p_business: biz.id, p_user: c.user_id, p_credits: n }); reload(); say('Ανανεώθηκε'); }
  });
  /* Ανανέωση / νέο πακέτο: διάλεξε ένα από τα πακέτα σου (όπως αν το ζητούσε ο πελάτης), ή γράψε αριθμό επισκέψεων. */
  const renew = async () => {
    const { data } = await sb.from('packages').select('*').eq('business_id', biz.id).eq('active', true);
    const list = (data ?? []).filter((p: any) => p.sessions || p.kind === 'sub');
    if (!list.length) return manual();
    setPicks(list);
  };
  const give = async (p: any) => {
    const r = await rpc('owner_activate_package', { p_business: biz.id, p_user: c.user_id, p_package: p.id });
    setPicks(null);
    if (r?.ok === false) say('Δεν έγινε', r.error); else say('Ενεργοποιήθηκε ✓', `${c.name} · «${p.name}»`);
    reload();
  };
  const picker = !!picks && (
    <Card style={{ gap: 8 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>Ποιο πακέτο πλήρωσε;</Text>
      {picks.map((p) => (
        <Btn key={p.id} size="sm" kind="ghost" title={`${p.name}${p.price_cents ? ' · ' + price(p.price_cents) : ''}`} onPress={() => give(p)} />
      ))}
      <View style={[s.row, { gap: 10 }]}>
        <Btn size="sm" kind="ghost" title="Άλλος αριθμός…" style={{ flex: 1 }} onPress={() => { setPicks(null); manual(); }} />
        <Btn size="sm" kind="ghost" title="Άκυρο" style={{ flex: 1 }} onPress={() => setPicks(null)} />
      </View>
    </Card>
  );
  const pk = c.pack;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]}>
      <Stack.Screen options={{ title: '' }} />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Avatar name={c.name} color={brand} size={76} />
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 22, letterSpacing: -0.4, marginTop: 4 }}>{c.name}</Text>
        {!!c.phone && <T mute>{c.phone}</T>}
        {!!c.tag && <Pill text={c.tag} tone="accent" />}
      </View>
      <View style={[s.row, { gap: 10 }]}>
        <Btn kind="ghost" icon="mail" title="Μήνυμα" style={{ flex: 1 }} onPress={() => router.navigate({ pathname: '/inbox', params: { to: c.user_id } })} />
        {!!c.phone && <Btn kind="ghost" icon="phone" title="Κλήση" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${c.phone}`)} />}
      </View>

      <View style={[s.row, { gap: 10 }]}>
        <Stat n={c.visits ?? '–'} label="Επισκέψεις" />
        {c.spent_cents ? <Stat n={price(c.spent_cents)} label="Σύνολο" /> : <Stat n={c.last ? fmtDay(c.last).split(' ')[1] : '–'} label="Τελευταία" />}
        <Stat n={c.no_shows ?? 0} label="Δεν ήρθε" color={c.no_shows ? C.bad : undefined} />
      </View>

      {/* Βαθμολογία πελάτη: μέσος όρος από όλες τις επιχειρήσεις. Μόνο για επιχειρήσεις· ο πελάτης δεν τη βλέπει. */}
      <Card style={{ gap: 10 }}>
        <View style={[s.row, { gap: 14 }]}>
          <View style={{ alignItems: 'center', minWidth: 64 }}>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 30, letterSpacing: -0.8 }}>{rating?.count ? fmtAvg(rating.avg) : '–'}</Text>
            <Stars value={rating?.avg ?? 0} size={11} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15.5 }}>Βαθμολογία πελάτη</Text>
            <T mute style={{ fontSize: 13 }}>{rating?.count
              ? `${rating.count} ${rating.count === 1 ? 'βαθμολογία' : 'βαθμολογίες'} από ${rating.businesses} ${rating.businesses === 1 ? 'επιχείρηση' : 'επιχειρήσεις'}`
              : 'Δεν έχει βαθμολογηθεί ακόμα'}</T>
          </View>
        </View>
        <View style={[s.row, { gap: 6 }]}>
          <Icon name="lock" size={13} color={C.mute} />
          <T mute style={{ fontSize: 12, flex: 1 }}>Τη βλέπουν μόνο επιχειρήσεις. Ο πελάτης δεν τη βλέπει.</T>
        </View>
        {(rating?.mine ?? []).filter((m: any) => m.note).slice(0, 3).map((m: any) => (
          <View key={m.booking_id} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, gap: 2 }}>
            <View style={[s.row, { gap: 8 }]}><Stars value={m.stars} size={11} /><T mute style={{ fontSize: 12 }}>{fmtDay(m.date)} · εσύ</T></View>
            <Text style={{ color: C.text, fontSize: 14 }}>{m.note}</Text>
          </View>
        ))}
      </Card>

      {!!next && (
        <Card style={{ gap: 2 }}>
          <T mute style={{ fontSize: 13, fontWeight: '700' }}>Επόμενο ραντεβού</T>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{fmtDay(next.date)} · {next.time}</Text>
          <T mute style={{ fontSize: 14 }}>{[next.service, next.staff].filter(Boolean).join(' · ')}</T>
        </Card>
      )}

      {!!pk && (
        <Card style={{ gap: 8 }}>
          <View style={s.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{pk.name}</Text>
              <T mute style={{ fontSize: 14 }}>{packLine(pk)}</T>
            </View>
            <Btn size="sm" kind="ghost" title="Ανανέωση" onPress={renew} />
          </View>
          {pk.total > 0 && (
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.soft, overflow: 'hidden' }}>
              <View style={{ width: `${(pk.left / pk.total) * 100}%`, height: 6, backgroundColor: pk.left <= 1 ? C.bad : C.btn }} />
            </View>
          )}
        </Card>
      )}
      {!pk && !picks && biz.uses_credits && <Btn kind="ghost" icon="pack" title="Δώσε πακέτο" onPress={renew} />}
      {picker}

      {!!c.fields?.length && <>
        <Section title="Καρτέλα" />
        <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
          {c.fields.map(([k, v]: [string, string], i: number) => (
            <View key={k} style={[s.row, { padding: 14, gap: 12, alignItems: 'flex-start' }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <Text style={{ color: C.mute, fontSize: 14, fontWeight: '600', width: 120 }}>{k}</Text>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{v}</Text>
            </View>
          ))}
        </Card>
      </>}

      <Section title="Σημείωση" />
      <Input multiline placeholder="Ό,τι θέλεις να θυμάσαι για αυτόν τον πελάτη" value={note} onChangeText={setNote} onBlur={saveNote} />

      {past.length > 0 && <>
        <Section title="Ιστορικό" />
        <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
          {past.slice(0, 12).map((h, i) => (
            <View key={h.id} style={[s.row, { padding: 14, gap: 12 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{h.service}</Text>
                <T mute style={{ fontSize: 13 }}>{[`${fmtDay(h.date)} · ${h.time}`, h.staff?.split(' ')[0], h.price_cents ? price(h.price_cents) : null].filter(Boolean).join(' · ')}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Pill text={STATUS[h.status]?.text ?? h.status} tone={STATUS[h.status]?.tone} />
                {(h.status === 'attended' || h.status === 'no_show') && (
                  <StarInput value={h.my_stars ?? 0} onChange={(n) => R.rate({ ...h, client: c.name }, n)} size={15} gap={2} />
                )}
              </View>
            </View>
          ))}
        </Card>
      </>}
      {R.sheet}
    </ScrollView>
  );
}
