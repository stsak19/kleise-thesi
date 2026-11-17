import { View } from 'react-native';
import { Text } from '../Txt';
import { C, fmtDay } from '../ui';
import type { BookingsData } from './data';
import { packEnded } from './PackList';

/* Το Ιστορικό ως απλές προτάσεις (μία γραμμή για καθένα), μέσα στο πλαίσιο που ανοίγει στις Κρατήσεις. */
const Line = ({ text, note, first }: { text: string; note: string; first?: boolean }) => (
  <View style={[{ paddingVertical: 10, gap: 2 }, !first && { borderTopWidth: 1, borderTopColor: C.line }]}>
    <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{text}</Text>
    <Text style={{ color: C.mute, fontSize: 13 }}>{note}</Text>
  </View>
);
const Nothing = ({ text }: { text: string }) => <Text style={{ color: C.mute, fontSize: 14, paddingVertical: 8 }}>{text}</Text>;

const DID: Record<string, string> = { attended: 'Ήρθες', booked: 'Έγινε', no_show: 'Δεν ήρθες', cancelled: 'Ακυρώθηκε' };

export function BookingLines({ D }: { D: BookingsData }) {
  if (!D.past.length) return <Nothing text="Δεν έχεις παλιές κρατήσεις ακόμα." />;
  return <View>{D.past.map((b, i) => (
    <Line key={b.id} first={i === 0} text={`${b.service} στο ${b.business}`} note={`${fmtDay(b.date)} στις ${b.time} · ${DID[b.status] ?? b.status}`} />
  ))}</View>;
}

const count = (n: number, total: number | null) => (total == null ? 'χωρίς όριο κρατήσεων' : `έμειναν ${n} από ${total} κρατήσεις`);

export function PackLines({ D }: { D: BookingsData }) {
  const now = D.packs.filter(packEnded).map((m: any) => ({
    key: m.business_id, text: `${m.pack ?? 'Πακέτο'} στο ${m.business}`,
    note: `${m.expires && m.credits > 0 ? `Έληξε ${fmtDay(m.expires)}` : 'Τελείωσε'} · ${count(Math.max(m.credits ?? 0, 0), m.unlimited ? null : m.total ?? null)}`,
  }));
  const old = D.packHistory.map((h: any) => ({
    key: h.id, text: `${h.pack ?? 'Πακέτο'} στο ${h.business}`,
    note: `${h.reason === 'renewed' ? 'Ανανεώθηκε' : h.reason === 'used' ? 'Τελείωσε' : h.expires ? `Έληξε ${fmtDay(h.expires)}` : 'Έληξε'} · ξεκίνησε ${fmtDay(h.started)} · ${count(h.credits ?? 0, h.total ?? null)}`,
  }));
  const all = [...now, ...old];
  if (!all.length) return <Nothing text="Δεν έχεις παλιά πακέτα ακόμα." />;
  return <View>{all.map((x, i) => <Line key={x.key} first={i === 0} text={x.text} note={x.note} />)}</View>;
}
