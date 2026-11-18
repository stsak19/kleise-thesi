import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../lib/Txt';
import { C, catLabel, s } from '../../lib/ui';
import { useWide } from '../../lib/wide';
import { rpc } from '../../lib/supabase';
import { RATINGS, ago, daysLeft, nameOf, rating, useAdmin } from '../../lib/admin/data';
import { Box, Cols, Kpi, Lead, Line, Loading, Page, Person, Search, ShopTag, Small } from '../../lib/admin/parts';

const DAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const MONTHS = ['Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'];
const n = (x: number | null | undefined) => (x ?? 0).toLocaleString('el-GR');

/* Επισκόπηση: αριθμοί για όλη την πλατφόρμα, κρατήσεις 14 ημερών, νέα καταστήματα, «θέλουν προσοχή», αιτήσεις διαγραφής.
   Η αναζήτηση πάνω δεξιά ψάχνει καταστήματα και λογαριασμούς μαζί. */
export default function Overview() {
  const router = useRouter();
  const wide = useWide();
  const { data: o, error } = useAdmin<any>('admin_overview');
  const [q, setQ] = useState('');
  const d = new Date();
  return (
    <Page title="Επισκόπηση" sub={`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`}
      right={<Search value={q} onChange={setQ} placeholder="Αναζήτηση καταστήματος, πελάτη, email, τηλεφώνου…" />}>
      {q.trim().length >= 2 ? <Results q={q.trim()} /> : !o ? <Loading error={error} /> : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Kpi n={n(o.businesses)} label="Καταστήματα" extra={o.businesses_week ? `+${o.businesses_week} εβδ.` : undefined} />
            <Kpi n={n(o.users)} label="Λογαριασμοί" extra={o.users_week ? `+${o.users_week} εβδ.` : undefined} />
            <Kpi n={n(o.bookings_today)} label="Κρατήσεις σήμερα" />
            {RATINGS && <Kpi n={rating(o.rating_avg)} label="Μέση βαθμολογία" />}
            <Kpi n={o.attention?.length ?? 0} label="Θέλουν προσοχή" bad={(o.attention?.length ?? 0) > 0} />
          </View>
          <Cols
            main={<>
              <Box title="Κρατήσεις · τελευταίες 14 μέρες" action="Όλες" onAction={() => router.push('/admin/bookings')}>
                <Chart data={o.chart ?? []} tall={wide ? 150 : 110} />
              </Box>
              <Box title="Νέα καταστήματα" action="Όλα" onAction={() => router.push('/admin/shops')}>
                {(o.new_businesses ?? []).length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Κανένα κατάστημα ακόμα.</Text>}
                {(o.new_businesses ?? []).map((b: any, i: number, a: any[]) => (
                  <Line key={b.id} last={i === a.length - 1} lead={<Lead name={b.name} color={b.brand_color} />}
                    title={b.name} sub={`${catLabel(b.category)} · ${b.city} · ${ago(b.created_at)}`}
                    onPress={() => router.push(`/admin/shop/${b.id}` as any)}
                    right={<>{wide && <ShopTag b={b} />}<Small title="Άνοιγμα" onPress={() => router.push(`/admin/shop/${b.id}` as any)} /></>} />
                ))}
              </Box>
            </>}
            side={<>
              <Box title="Θέλουν προσοχή">
                {(o.attention ?? []).length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Όλα καλά 👌</Text>}
                {(o.attention ?? []).map((x: any, i: number, a: any[]) => <Attention key={i} x={x} last={i === a.length - 1} />)}
              </Box>
              <Box title="Αιτήσεις διαγραφής" action={(o.deletions ?? []).length ? 'Όλες' : undefined} onAction={() => router.push('/admin/deletions')}>
                {(o.deletions ?? []).length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Καμία αίτηση.</Text>}
                {(o.deletions ?? []).map((u: any, i: number, a: any[]) => (
                  <Line key={u.id} last={i === a.length - 1} lead={<Person name={nameOf(u)} />}
                    title={nameOf(u) + (u.owns ? ' · ιδιοκτήτης' : '')}
                    sub={`Σβήνεται σε ${daysLeft(u.delete_on)} μέρες${u.owns ? ` · ${u.owns} κατάστημα` : ''}`}
                    right={<Small title="Δες" onPress={() => router.push(`/admin/person/${u.id}` as any)} />} />
                ))}
              </Box>
            </>} />
        </>
      )}
    </Page>
  );
}

function Attention({ x, last }: { x: any; last: boolean }) {
  const router = useRouter();
  if (x.kind === 'review') return <Line last={last} title={`Κριτική με ${x.stars}★ στο ${x.business}`} sub={x.comment ? `«${x.comment}»` : 'Χωρίς σχόλιο'}
    right={<Small title="Δες" onPress={() => router.push(`/admin/shop/${x.business_id}` as any)} />} />;
  if (x.kind === 'no_show') return <Line last={last} title={`Πελάτης με ${x.n} «δεν ήρθε»`} sub={`${nameOf(x)} · ${x.shops} ${x.shops === 1 ? 'κατάστημα' : 'καταστήματα'} · 60 μέρες`}
    right={<Small title="Δες" onPress={() => router.push(`/admin/person/${x.id}` as any)} />} />;
  if (x.kind === 'cancels') return <Line last={last} title={`${x.rate}% ακυρώσεις στο ${x.business}`} sub={`${x.n} κρατήσεις τις τελευταίες 30 μέρες`}
    right={<Small title="Δες" onPress={() => router.push(`/admin/shop/${x.business_id}` as any)} />} />;
  return null;
}

/* Στήλες κρατήσεων ανά μέρα· η σημερινή πράσινη. */
function Chart({ data, tall }: { data: { date: string; n: number }[]; tall: number }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: tall, paddingTop: 10 }}>
        {data.map((d, i) => (
          <Pressable key={d.date} onHoverIn={() => setHover(i)} onHoverOut={() => setHover(null)} onPress={() => setHover(i)}
            style={{ flex: 1, height: `${Math.max(3, (d.n / max) * 100)}%` as any, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
              backgroundColor: i === data.length - 1 ? '#00e676' : hover === i ? C.mute : C.text }} />
        ))}
      </View>
      <View style={[s.row, { justifyContent: 'space-between', marginTop: 8 }]}>
        <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>{data[0] ? short(data[0].date) : ''}</Text>
        <Text style={{ color: C.text, fontSize: 12, fontWeight: '800' }}>{hover != null && data[hover] ? `${short(data[hover].date)} · ${data[hover].n} κρατήσεις` : ''}</Text>
        <Text style={{ color: C.mute, fontSize: 12, fontWeight: '600' }}>Σήμερα</Text>
      </View>
    </View>
  );
}
const short = (t: string) => { const d = new Date(t + 'T00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; };

/* Αναζήτηση σε καταστήματα και λογαριασμούς μαζί. */
function Results({ q }: { q: string }) {
  const router = useRouter();
  const [res, setRes] = useState<{ shops: any[]; people: any[] } | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      Promise.all([rpc<any[]>('admin_businesses', { p_q: q }), rpc<any[]>('admin_users', { p_q: q })])
        .then(([shops, people]) => live && setRes({ shops: shops ?? [], people: people ?? [] })).catch(() => live && setRes({ shops: [], people: [] }));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  if (!res) return <Loading />;
  return (
    <Cols
      main={<Box title={`Καταστήματα · ${res.shops.length}`}>
        {res.shops.length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Κανένα.</Text>}
        {res.shops.slice(0, 30).map((b, i, a) => (
          <Line key={b.id} last={i === a.length - 1} lead={<Lead name={b.name} color={b.brand_color} />} title={b.name}
            sub={`${catLabel(b.category)} · ${b.city} · ${nameOf(b.owner)}`} right={<ShopTag b={b} />} onPress={() => router.push(`/admin/shop/${b.id}` as any)} />
        ))}
      </Box>}
      side={<Box title={`Λογαριασμοί · ${res.people.length}`}>
        {res.people.length === 0 && <Text style={{ color: C.mute, paddingVertical: 10 }}>Κανένας.</Text>}
        {res.people.slice(0, 30).map((u, i, a) => (
          <Line key={u.id} last={i === a.length - 1} lead={<Person name={nameOf(u)} />} title={nameOf(u)} sub={u.email}
            onPress={() => router.push(`/admin/person/${u.id}` as any)} />
        ))}
      </Box>} />
  );
}
