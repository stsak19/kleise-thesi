import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './Txt';
import { useAuth } from './auth';
import { useMode } from './mode';
import { useSwitchTo } from './SwitchMode';
import { styleOf } from './presets';
import { BizLogo } from './bookings/parts';
import { fetchMyBizList, setActiveBiz } from './owner/active';
import { C, Icon, alpha, catLabel, s } from './ui';

/* Το κουμπί «η επιχείρησή μου» (κάτω μπάρα στο κινητό, πάνω δεξιά στον υπολογιστή).
   Μία επιχείρηση → μπαίνεις κατευθείαν. Δύο ή περισσότερες → πρώτα διαλέγεις σε ποια.
   Φαίνεται μόνο σε όποιον έχει επιχείρηση. */

/* Οι επιχειρήσεις του χρήστη (κενή λίστα για επισκέπτη). Ξαναφορτώνει όταν αλλάζει σύνδεση ή λειτουργία,
   ώστε να εμφανιστεί το κουμπί μόλις κάποιος φτιάξει την πρώτη του επιχείρηση. */
let cache: any[] = [];
export function useMyBizzes() {
  const { session } = useAuth();
  const { mode } = useMode();
  const uid = session?.user.id;
  const [list, setList] = useState<any[]>(uid ? cache : []);
  useEffect(() => {
    if (!uid) { cache = []; setList([]); return; }
    let live = true;
    fetchMyBizList(uid).then((l) => { if (live) { cache = l; setList(l); } }).catch(() => {});
    return () => { live = false; };
  }, [uid, mode]);
  return list;
}

/* Πάτημα του κουμπιού: με μία επιχείρηση πάει κατευθείαν, με περισσότερες ανοίγει την επιλογή. */
export function useOpenMyBiz() {
  const list = useMyBizzes();
  const switchTo = useSwitchTo();
  const [choosing, setChoosing] = useState(false);
  const enter = (b: any) => { setChoosing(false); setActiveBiz(b.id); switchTo('biz'); };
  const open = () => (list.length === 1 ? enter(list[0]) : list.length > 1 && setChoosing(true));
  return { list, open, enter, choosing, close: () => setChoosing(false) };
}

/* Η επιλογή επιχείρησης: φύλλο από κάτω στο κινητό, μενού κάτω από το κουμπί στον υπολογιστή. */
export function BizChooser({ list, visible, onClose, onPick, desk }:
  { list: any[]; visible: boolean; onClose: () => void; onPick: (b: any) => void; desk?: boolean }) {
  const router = useRouter();
  const Item = ({ b }: { b: any }) => (
    <Pressable onPress={() => onPick(b)} accessibilityRole="button" accessibilityLabel={b.name}
      style={({ pressed, hovered }: any) => [s.row, { gap: 12, padding: desk ? 8 : 10, borderRadius: 16, backgroundColor: pressed || hovered ? C.soft : 'transparent' }]}>
      <BizLogo biz={b} name={b.name} color={styleOf(b).color} size={desk ? 38 : 44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: desk ? 15 : 16 }} numberOfLines={1}>{b.name}</Text>
        <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{[catLabel(b.category), b.city].filter(Boolean).join(' · ')}</Text>
      </View>
      <Icon name="chevron" size={14} color={C.mute} />
    </Pressable>
  );
  const add = (
    <Pressable onPress={() => { onClose(); router.push('/new-business'); }} accessibilityRole="button"
      style={({ pressed, hovered }: any) => [s.row, { gap: 12, padding: desk ? 8 : 10, borderRadius: 16, backgroundColor: pressed || hovered ? C.soft : 'transparent' }]}>
      <View style={{ width: desk ? 38 : 44, height: desk ? 38 : 44, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={16} color={C.mute} />
      </View>
      <Text style={{ color: C.mute, fontWeight: '700', fontSize: 15 }}>Νέα επιχείρηση</Text>
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: alpha('#000000', desk ? 0.12 : 0.35), justifyContent: desk ? 'flex-start' : 'flex-end' }}>
        {desk ? (
          <Pressable onPress={() => {}} style={{ position: 'absolute', top: 70, right: 24, width: 340, backgroundColor: C.bg, borderRadius: 18, padding: 10,
            borderWidth: 1, borderColor: C.line, boxShadow: `0px 18px 50px ${alpha('#000000', 0.18)}` }}>
            <Text style={{ color: C.mute, fontWeight: '800', fontSize: 12, letterSpacing: 0.5, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 6 }}>ΟΙ ΕΠΙΧΕΙΡΗΣΕΙΣ ΜΟΥ</Text>
            {list.map((b) => <Item key={b.id} b={b} />)}
            {add}
          </Pressable>
        ) : (
          <Pressable onPress={() => {}} style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingBottom: 34, maxHeight: '80%' }}>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 14 }} />
            <Text style={{ color: C.text, fontSize: 20, fontWeight: '800', paddingHorizontal: 20 }}>Σε ποια επιχείρηση;</Text>
            <Text style={{ color: C.mute, fontSize: 14, paddingHorizontal: 20, marginTop: 2, marginBottom: 8 }}>Διάλεξε για να μπεις στη διαχείριση</Text>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 10 }}>
              {list.map((b) => <Item key={b.id} b={b} />)}
              {add}
            </ScrollView>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

/* Πάνω δεξιά στον υπολογιστή (λειτουργία πελάτη): «Η επιχείρησή μου». */
export function MyBizTopButton() {
  const { list, open, enter, choosing, close } = useOpenMyBiz();
  if (!list.length) return null;
  return <>
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Η επιχείρησή μου"
      style={({ pressed, hovered }: any) => [s.row, { gap: 8, height: 42, paddingHorizontal: 14, borderRadius: 12,
        backgroundColor: pressed || hovered || choosing ? C.accent : C.soft }]}>
      <Icon name="store" size={17} color={C.text} />
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>{list.length > 1 ? 'Οι επιχειρήσεις μου' : 'Η επιχείρησή μου'}</Text>
    </Pressable>
    <BizChooser desk list={list} visible={choosing} onClose={close} onPick={enter} />
  </>;
}

/* Πάνω δεξιά στον υπολογιστή (λειτουργία επιχείρησης): «Μετάβαση σε πελάτη». */
export function ToClientTopButton() {
  const switchTo = useSwitchTo();
  return (
    <Pressable onPress={() => switchTo('client')} accessibilityRole="button" accessibilityLabel="Μετάβαση σε πελάτη"
      style={({ pressed, hovered }: any) => [s.row, { gap: 8, height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: pressed || hovered ? C.accent : C.soft }]}>
      <Icon name="swap" size={17} color={C.text} />
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 14 }}>Μετάβαση σε πελάτη</Text>
    </Pressable>
  );
}
