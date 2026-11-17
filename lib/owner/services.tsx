import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Text } from '../Txt';
import { Btn, C, Icon, Input, alpha, s } from '../ui';
import { TimeBtn } from '../TimePick';
import { Choice } from './steps';
import { type Hours, type Svc } from './save';
import { type SvcKind, blankFor, durText, groupOf, grouped, svcKind } from './svcKind';

/* Οι υπηρεσίες ενός καταστήματος ως κάρτες σε ομάδες (εκδοχή Β), και το παράθυρο επεξεργασίας μίας υπηρεσίας.
   Τι ρωτάει το παράθυρο εξαρτάται από το είδος (lib/owner/svcKind.ts): ραντεβού, μάθημα, συνεδρία ή είδος επίσκεψης. */

export type Person = { id: string; name: string; color?: string; services?: string[] };
/* Μία γραμμή του εβδομαδιαίου προγράμματος ενός μαθήματος: ίδια ώρα σε κάποιες μέρες. */
export type Sched = { time: string; days: number[] };

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const SHORT = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
const hm = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const tf = (m: number) => `${String(Math.min(23, Math.floor(m / 60))).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/* Το πρόγραμμα ενός μαθήματος από το ωράριο (ωράριο υπηρεσίας = οι ώρες που γίνεται). */
export function schedOf(hours: Hours, key: string): Sched[] {
  const m = new Map<string, number[]>();
  hours.filter((h) => h.svc === key).forEach((h) => m.set(h.opens, [...(m.get(h.opens) ?? []), h.weekday]));
  return [...m.entries()].sort(([a], [z]) => a.localeCompare(z)).map(([time, days]) => ({ time, days: WEEKDAYS.filter((d) => days.includes(d)) }));
}
/* Γράφει πίσω το πρόγραμμα στο ωράριο: κάθε μέρα/ώρα γίνεται ένα διάστημα όσο κρατά το μάθημα. */
export function withSched(hours: Hours, key: string, sched: Sched[], dur: number): Hours {
  const rows = sched.filter((x) => TIME.test(x.time)).flatMap((x) => x.days.map((d) => ({ weekday: d, opens: x.time, closes: tf(Math.min(hm(x.time) + (dur || 60), 23 * 60 + 59)), svc: key })));
  return [...hours.filter((h) => h.svc !== key), ...rows];
}
const daysText = (days: number[]) => {
  const w = WEEKDAYS.filter((d) => days.includes(d));
  if (w.length === 5 && [1, 2, 3, 4, 5].every((d) => w.includes(d))) return 'Δευ – Παρ';
  if (w.length === 7) return 'Κάθε μέρα';
  return w.map((d) => SHORT[d]).join(' · ');
};

const money = (p: string) => p.replace('.', ',');
export function priceText(k: SvcKind, x: Svc) {
  if (!x.price) return k.noPrice;
  if (+x.price === 0) return 'Δωρεάν';
  return `${x.from ? 'από ' : ''}${money(x.price)} €`;
}
export function metaText(k: SvcKind, x: Svc, hours: Hours) {
  const cap = +x.capacity || 1;
  const parts = [durText(+x.duration_min || 30)];
  if (k.mode === 'class') {
    if (cap > 1) {
      parts.push(`${cap} θέσεις`);
      const n = hours.filter((h) => h.svc === x.key).length;
      if (n) parts.push(`${n} ${n === 1 ? 'φορά' : 'φορές'}/εβδ.`);
    } else parts.push('ένας-ένας');
  } else if (k.mode === 'session') parts.push(cap === 1 ? 'ένας-ένας' : cap === 2 ? '2 άτομα' : `έως ${cap}`);
  else if (cap > 1) parts.push(`έως ${cap} άτομα`);
  return parts.join(' · ');
}

const initial = (n: string) => n.trim().split(' ').filter(Boolean)[0]?.[0]?.toUpperCase() ?? '•';
function Faces({ people }: { people: Person[] }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.slice(0, 4).map((p, i) => (
        <View key={p.id} style={{ width: 28, height: 28, borderRadius: 14, marginLeft: i ? -7 : 0, borderWidth: 2, borderColor: C.card,
          backgroundColor: p.color || C.mute, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{initial(p.name)}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------- Κάρτες σε ομάδες ---------- */
export function ServiceBoard({ svcs, category, hours, staff = [], onOpen, onAdd }:
  { svcs: Svc[]; category: string; hours: Hours; staff?: Person[]; onOpen: (key: string) => void; onAdd: (grp?: string) => void }) {
  const k = svcKind(category);
  const [w, setW] = useState(0);
  const cols = w >= 860 ? 3 : w >= 540 ? 2 : 1;
  const gap = 12;
  const cw = w ? (w - gap * (cols - 1)) / cols : undefined;
  const list = svcs.filter((x) => x.name.trim());
  const groups = grouped(k, list);
  const team = (x: Svc) => (staff.length > 1 && x.id ? staff.filter((p) => p.services?.includes(x.id!)) : []);

  const AddCard = ({ grp }: { grp?: string }) => (
    <Pressable onPress={() => onAdd(grp)} accessibilityRole="button"
      style={({ pressed, hovered }: any) => [{ width: cw, minHeight: cols > 1 ? 118 : 56, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed',
        borderColor: hovered ? C.mute : C.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="plus" size={14} color={C.mute} />
      <Text style={{ color: C.mute, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{grp ? `Πρόσθεσε στο «${grp}»` : k.add}</Text>
    </Pressable>
  );

  return (
    <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))} style={{ gap: 6 }}>
      {groups.map((g) => (
        <View key={g.name} style={{ gap: 10, marginBottom: 12 }}>
          <Text style={{ color: C.mute, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.5 }}>{caps(g.name)} · {g.items.length}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {g.items.map((x) => {
              const people = team(x);
              return (
                <Pressable key={x.key} onPress={() => onOpen(x.key)} accessibilityRole="button" accessibilityLabel={`${x.name}, ${priceText(k, x)}`}
                  style={({ pressed, hovered }: any) => [{ width: cw, borderRadius: 18, padding: 16, gap: 8, backgroundColor: C.card,
                    borderWidth: 1, borderColor: hovered ? alpha(C.text, 0.2) : C.line, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{x.name}</Text>
                  <Text style={{ color: C.mute, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{metaText(k, x, hours)}</Text>
                  {!!x.note?.trim() && <Text style={{ color: C.mute, fontSize: 12.5 }} numberOfLines={1}>📝 {x.note}</Text>}
                  <View style={[s.row, { justifyContent: 'space-between', minHeight: 28 }]}>
                    <Faces people={people} />
                    <Text style={{ color: x.price ? C.text : C.mute, fontWeight: '800', fontSize: x.price ? 18 : 14 }}>{priceText(k, x)}</Text>
                  </View>
                </Pressable>
              );
            })}
            {cols > 1 && <AddCard grp={g.name} />}
          </View>
        </View>
      ))}
      {(cols === 1 || !groups.length) && <AddCard />}
    </View>
  );
}
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/* Κεφαλαία χωρίς τόνους (ΚΟΥΡΕΜΑ, όχι ΚΟΎΡΕΜΑ). */
const caps = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/* Μικρά κομμάτια του παραθύρου (έξω από το ServiceFields, ώστε τα πεδία να μη χάνουν την εστίαση σε κάθε πλήκτρο). */
const Label = ({ t, sub }: { t: string; sub?: string }) => (
  <View style={{ gap: 2 }}>
    <Text style={{ color: C.text, fontWeight: '800', fontSize: 14.5 }}>{t}</Text>
    {!!sub && <Text style={{ color: C.mute, fontSize: 12.5 }}>{sub}</Text>}
  </View>
);
const Pill = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityState={{ selected: on }}
    style={({ pressed }) => ({ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 12, backgroundColor: on ? C.text : C.soft, opacity: pressed ? 0.8 : 1 })}>
    <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 13.5 }}>{label}</Text>
  </Pressable>
);
const Row = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>{children}</View>;


/* ---------- Τα πεδία μιας υπηρεσίας, ανάλογα με το είδος ---------- */
export function ServiceFields({ svc, onChange, category, groups = [], staff = [], picked, onPick, sched, onSched }: {
  svc: Svc; onChange: (p: Partial<Svc>) => void; category: string; groups?: string[];
  staff?: Person[]; picked?: string[]; onPick?: (ids: string[]) => void;
  sched?: Sched[]; onSched?: (x: Sched[]) => void;
}) {
  const k = svcKind(category);
  const dur = +svc.duration_min || 0;
  const cap = +svc.capacity || 1;
  const grp = groupOf(k, svc);
  const allGroups = [...new Set([...k.groups, ...groups, grp])];
  const isClass = k.mode === 'class' && cap > 1;
  const showTeam = staff.length > 1 && !!onPick;
  const [newGrp, setNewGrp] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  return (
    <View style={{ gap: 20 }}>
      <View style={{ alignSelf: 'flex-start', backgroundColor: alpha(C.ok, 0.12), borderRadius: 8, paddingVertical: 4, paddingHorizontal: 9 }}>
        <Text style={{ color: C.ok, fontWeight: '800', fontSize: 12 }}>{k.mode === 'class' && cap === 1 ? 'Ατομική προπόνηση' : k.badge}</Text>
      </View>
      <Input label="Όνομα" autoFocus={!svc.name} placeholder={k.hint} value={svc.name} onChangeText={(v) => onChange({ name: v })} style={{ fontSize: 17 }} />

      {k.mode !== 'class' && (
        <View style={{ gap: 9 }}>
          <Label t="Ομάδα" sub="Οι πελάτες βλέπουν τις υπηρεσίες χωρισμένες έτσι." />
          <Row>
            {allGroups.map((g) => <Pill key={g} on={g === grp} label={g} onPress={() => onChange({ grp: g })} />)}
            {newGrp === null
              ? <Pill on={false} label="+ Νέα" onPress={() => setNewGrp('')} />
              : <View style={{ width: 180 }}><Input autoFocus placeholder="Νέα ομάδα, Enter" value={newGrp} onChangeText={setNewGrp}
                  onSubmitEditing={() => { if (newGrp.trim()) onChange({ grp: newGrp.trim() }); setNewGrp(null); }}
                  onBlur={() => { if (newGrp.trim()) onChange({ grp: newGrp.trim() }); setNewGrp(null); }} /></View>}
          </Row>
        </View>
      )}

      {k.mode === 'class' && (
        <View style={{ gap: 9 }}>
          <Label t="Είδος" />
          <Row>
            <Pill on={cap > 1} label="👥 Ομαδικό μάθημα" onPress={() => onChange({ capacity: String(cap > 1 ? cap : 12), grp: '' })} />
            <Pill on={cap === 1} label="👤 Ατομική προπόνηση" onPress={() => onChange({ capacity: '1', grp: '' })} />
          </Row>
        </View>
      )}

      <View style={{ gap: 9 }}>
        <Label t={k.durLabel} />
        <Row>
          {k.durs.map((v) => <Pill key={v} on={v === dur} label={durText(v)} onPress={() => onChange({ duration_min: String(v) })} />)}
          {custom || (dur && !k.durs.includes(dur))
            ? <View style={{ width: 110 }}><Input autoFocus={custom} placeholder="λεπτά" keyboardType="number-pad" value={svc.duration_min}
                onChangeText={(v) => onChange({ duration_min: v.replace(/\D/g, '').slice(0, 3) })} /></View>
            : <Pill on={false} label="Άλλο…" onPress={() => setCustom(true)} />}
        </Row>
      </View>

      {isClass && (
        <View style={{ gap: 9 }}>
          <Label t="Θέσεις ανά μάθημα" sub="Όταν γεμίσει, οι υπόλοιποι μπαίνουν σε λίστα αναμονής." />
          <View style={[s.row, { gap: 12 }]}>
            <Step label="−" onPress={() => onChange({ capacity: String(Math.max(2, cap - 1)) })} />
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 20, minWidth: 34, textAlign: 'center' }}>{cap}</Text>
            <Step label="+" onPress={() => onChange({ capacity: String(Math.min(200, cap + 1)) })} />
          </View>
        </View>
      )}

      {k.mode === 'session' && k.sizes && (
        <View style={{ gap: 9 }}>
          <Label t="Πόσα άτομα;" />
          <Row>{k.sizes.map((o) => <Pill key={o.v} on={o.v === cap || (o.v === 4 && cap > 2)} label={o.label} onPress={() => onChange({ capacity: String(o.v) })} />)}</Row>
        </View>
      )}

      <View style={{ gap: 9 }}>
        <Label t={k.priceLabel} sub={`Αν το αφήσεις κενό, θα γράφει «${k.noPrice}».`} />
        <View style={[s.row, { gap: 10, flexWrap: 'wrap' }]}>
          <View style={{ width: 140 }}><Input placeholder="€" keyboardType="decimal-pad" value={svc.price} onChangeText={(v) => onChange({ price: v.replace(/[^\d.,]/g, '') })} /></View>
          {k.fromPrice && !!svc.price && (
            <Row>
              <Pill on={!svc.from} label="Σταθερή" onPress={() => onChange({ from: false })} />
              <Pill on={!!svc.from} label="Από…" onPress={() => onChange({ from: true })} />
            </Row>
          )}
          {k.mode === 'session' && <Pill on={svc.price === '0'} label="Δωρεάν (γνωριμία)" onPress={() => onChange({ price: svc.price === '0' ? '' : '0' })} />}
        </View>
      </View>

      {isClass && onSched && (
        <View style={{ gap: 9 }}>
          <Label t="Πρόγραμμα της εβδομάδας" sub="Οι μέρες και οι ώρες που γίνεται το μάθημα." />
          {(sched ?? []).map((row, i) => (
            <View key={i} style={{ backgroundColor: C.soft, borderRadius: 14, padding: 10, gap: 8 }}>
              <View style={[s.row, { gap: 8 }]}>
                <View style={{ width: 92 }}>
                  <TimeBtn value={row.time} title="Ώρα μαθήματος" onChange={(v) => onSched(sched!.map((r, j) => (j === i ? { ...r, time: v } : r)))}
                    style={{ backgroundColor: C.bg, borderColor: C.bg }} />
                </View>
                <Text style={{ flex: 1, color: C.mute, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{row.days.length ? daysText(row.days) : 'Διάλεξε μέρες'}</Text>
                <Pressable onPress={() => onSched(sched!.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Αφαίρεση ώρας">
                  <Icon name="close" size={14} color={C.mute} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                {WEEKDAYS.map((d) => {
                  const on = row.days.includes(d);
                  return (
                    <Pressable key={d} onPress={() => onSched(sched!.map((r, j) => (j === i ? { ...r, days: on ? r.days.filter((x) => x !== d) : [...r.days, d] } : r)))}
                      style={{ width: 42, paddingVertical: 7, borderRadius: 10, alignItems: 'center', backgroundColor: on ? C.text : C.bg }}>
                      <Text style={{ color: on ? C.bg : C.text, fontWeight: '700', fontSize: 12.5 }}>{SHORT[d]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Pressable onPress={() => onSched([...(sched ?? []), { time: '19:00', days: [1, 3, 5] }])} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
            <Text style={{ color: C.tint, fontWeight: '700', fontSize: 14 }}>+ Πρόσθεσε ώρα</Text>
          </Pressable>
        </View>
      )}

      {showTeam && (
        <View style={{ gap: 9 }}>
          <Label t={k.people} sub={k.mode === 'class' ? undefined : 'Ο πελάτης διαλέγει άτομο μόνο ανάμεσα σε όσους την κάνουν.'} />
          <Row>
            {staff.map((p) => {
              const on = (picked ?? []).includes(p.id);
              return <Pill key={p.id} on={on} label={`${on ? '✓ ' : ''}${p.name.split(' ')[0]}`}
                onPress={() => onPick!(on ? picked!.filter((x) => x !== p.id) : [...(picked ?? []), p.id])} />;
            })}
          </Row>
        </View>
      )}

      {!!k.note && (
        <Input label={`${k.note} (προαιρετικό)`} placeholder="π.χ. Φέρτε προηγούμενες εξετάσεις" multiline value={svc.note ?? ''} onChangeText={(v) => onChange({ note: v })} />
      )}
    </View>
  );
}
const Step = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
    <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{label}</Text>
  </Pressable>
);

/* ---------- Παράθυρο επεξεργασίας: στη μέση στον υπολογιστή, από κάτω στο κινητό ---------- */
export type SvcDraft = { svc: Svc; sched: Sched[]; staff: string[]; fresh: boolean };
export function ServiceModal({ draft, category, groups, staff, onClose, onSave, onDelete, busy }: {
  draft: SvcDraft | null; category: string; groups: string[]; staff: Person[]; busy?: boolean;
  onClose: () => void; onSave: (d: SvcDraft) => void; onDelete: (d: SvcDraft) => void;
}) {
  const [d, setD] = useState<SvcDraft | null>(draft);
  useEffect(() => setD(draft), [draft]);
  const { width, height } = useWindowDimensions();
  const wide = width >= 700;
  const k = svcKind(category);
  if (!d) return null;
  const ok = d.svc.name.trim().length > 0 && (+d.svc.duration_min || 0) > 0;
  return (
    <Modal visible transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: alpha('#000000', 0.42), alignItems: 'center', justifyContent: wide ? 'center' : 'flex-end', padding: wide ? 24 : 0 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: wide ? 580 : undefined, maxHeight: wide ? height - 48 : height - 40, backgroundColor: C.bg,
          borderRadius: wide ? 22 : 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', boxShadow: `0px 30px 80px ${alpha('#000000', 0.3)}` }}>
          <View style={[s.row, { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 8, gap: 12 }]}>
            <Text style={{ flex: 1, color: C.text, fontWeight: '800', fontSize: 20 }} numberOfLines={1}>{d.fresh ? k.add : d.svc.name || cap1(k.one)}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Κλείσιμο" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={14} color={C.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 12 }} keyboardShouldPersistTaps="handled">
            <ServiceFields svc={d.svc} category={category} groups={groups} staff={staff}
              onChange={(p) => setD({ ...d, svc: { ...d.svc, ...p } })}
              picked={d.staff} onPick={(ids) => setD({ ...d, staff: ids })}
              sched={d.sched} onSched={(x) => setD({ ...d, sched: x })} />
          </ScrollView>
          <View style={[s.row, { paddingHorizontal: 22, paddingVertical: 14, gap: 12, borderTopWidth: 1, borderTopColor: C.line }]}>
            {!d.fresh && (
              <Pressable onPress={() => onDelete(d)} hitSlop={8}>
                <Text style={{ color: C.bad, fontWeight: '800', fontSize: 14.5 }}>Διαγραφή</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 14.5 }}>Άκυρο</Text>
            </Pressable>
            <Btn title={busy ? 'Αποθήκευση…' : 'Αποθήκευση'} disabled={!ok || busy} onPress={() => onSave(d)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* Νέο πρόχειρο για μια υπηρεσία (ή καινούργια στην ομάδα grp). */
export function draftFor(category: string, svcs: Svc[], hours: Hours, staff: Person[], key: string | null, newKey: () => string, grp?: string): SvcDraft {
  const k = svcKind(category);
  const x = key ? svcs.find((y) => y.key === key) : null;
  if (x) return { svc: { ...x, grp: x.grp || groupOf(k, x) }, sched: schedOf(hours, x.key), staff: staff.filter((p) => x.id && p.services?.includes(x.id)).map((p) => p.id), fresh: false };
  const svc = blankFor(k, newKey(), grp);
  if (k.mode === 'class' && grp && grp !== k.groups[0]) svc.capacity = '1';
  return { svc, sched: svc.capacity !== '1' && k.mode === 'class' ? [{ time: '19:00', days: [1, 3, 5] }] : [], staff: staff.map((p) => p.id), fresh: true };
}
