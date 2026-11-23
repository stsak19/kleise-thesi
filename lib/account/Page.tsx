import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../Txt';
import { C, Icon, ScreenHeader, s } from '../ui';
import { deskCol, useWide } from '../wide';
import { StaticTopBar } from '../client/desk';

/* Σελίδα έξω από τις καρτέλες (απόρρητο, πληρωμή, διαγραφή, πρόσκληση, Το πρόγραμμά μου, νέος κωδικός, αφαίρεση επιχείρησης):
   τίτλος με «Πίσω» από πάνω. Στον υπολογιστή έχει από πάνω την ίδια μπάρα με την υπόλοιπη ιστοσελίδα (εκδοχή Α, 2026-11-23). */
export function Page({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const wide = useWide();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const body = (
    <ScrollView style={s.screen} contentContainerStyle={[{ paddingBottom: 60 }, deskCol(wide, 680)]} keyboardShouldPersistTaps="handled">
      <View style={{ marginHorizontal: wide ? -20 : 0 }}>
        <ScreenHeader title={title} sub={sub} eyebrow={
          <Pressable onPress={back} hitSlop={10} style={({ pressed }) => [s.row, { gap: 4, alignSelf: 'flex-start', marginBottom: 6, opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="back" size={16} color={C.text} />
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>Πίσω</Text>
          </Pressable>} />
      </View>
      <View style={[s.pad, { paddingTop: 8, gap: 14 }]}>{children}</View>
    </ScrollView>
  );
  if (!wide) return body;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StaticTopBar />
      {body}
    </View>
  );
}
