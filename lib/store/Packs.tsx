import { View } from 'react-native';
import { Text } from '../Txt';
import { Btn, C, Card, Pill, price, s } from '../ui';
import { PLAN_KIND } from '../owner/kinds';
import { useStore, type Package } from './data';

/* Τα πακέτα του καταστήματος, όπως τα έφτιαξε ο ιδιοκτήτης. Ο πελάτης πατά «Το θέλω» και το κατάστημα
   το ενεργοποιεί όταν πληρωθεί (στο κατάστημα). Ένα αίτημα τη φορά· το ζητημένο δείχνει «Απόσυρση». */
export const packLine = (p: Package) => [
  p.sessions ? `${p.sessions} ${p.sessions === 1 ? 'επίσκεψη' : 'επισκέψεις'}` : p.kind === 'sub' ? 'Απεριόριστα' : null,
  p.days ? (p.days >= 365 ? 'ισχύει 1 χρόνο' : `ισχύει ${p.days} μέρες`) : null,
].filter(Boolean).join(' · ');

export function StorePacks({ title = 'Πακέτα' }: { title?: string }) {
  const S = useStore();
  if (!S.packages.length) return null;
  const color = S.st?.color ?? C.accent;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, marginTop: 10 }}>{title}</Text>
      {S.packages.map((p) => {
        const asked = S.pendingPack?.id === p.id;
        const line = packLine(p);
        return (
          <Card key={p.id} style={[{ gap: 8 }, asked ? { borderColor: color, borderWidth: 1.5 } : {}]}>
            <View style={[s.row, { gap: 8 }]}>
              <Pill text={PLAN_KIND[p.kind] ?? 'Πακέτο'} />
              {p.popular && <Pill text="Το πιο δημοφιλές" color={color} />}
              {asked && <Pill text="Το ζήτησες" tone="accent" />}
            </View>
            <View style={[s.row, { alignItems: 'flex-end', gap: 10 }]}>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>{p.name}</Text>
                {!!line && <Text style={{ color: C.mute, fontSize: 13.5 }}>{line}</Text>}
              </View>
              <Text style={{ color: C.text, fontWeight: '900', fontSize: 22, letterSpacing: -0.5 }}>{p.price_cents ? price(p.price_cents) : 'Δωρεάν'}</Text>
            </View>
            {!!p.note && <Text style={{ color: C.mute, fontSize: 13.5, lineHeight: 19 }}>{p.note}</Text>}
            {asked ? (
              <View style={[s.row, { gap: 10, marginTop: 2 }]}>
                <Text style={{ flex: 1, color: C.mute, fontSize: 13 }}>Ενεργοποιείται όταν το πληρώσεις στο κατάστημα.</Text>
                <Btn size="sm" kind="ghost" title="Απόσυρση" onPress={S.cancelPack} />
              </View>
            ) : (
              <Btn size="sm" color={color} title="Το θέλω" onPress={() => S.choosePack(p)} style={{ marginTop: 2 }} />
            )}
          </Card>
        );
      })}
    </View>
  );
}
