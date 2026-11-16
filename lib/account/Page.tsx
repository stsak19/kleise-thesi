import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../Txt';
import { C, Icon, ScreenHeader, s } from '../ui';
import { deskCol, useWide } from '../wide';

/* Σελίδα έξω από τις καρτέλες (απόρρητο, διαγραφή, πρόσκληση): τίτλος με «Πίσω» από πάνω. */
export function Page({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <ScrollView style={s.screen} contentContainerStyle={[{ paddingBottom: 60 }, deskCol(useWide(), 680)]} keyboardShouldPersistTaps="handled">
      <View style={{ marginHorizontal: useWide() ? -20 : 0 }}>
        <ScreenHeader title={title} sub={sub} eyebrow={
          <Pressable onPress={back} hitSlop={10} style={({ pressed }) => [s.row, { gap: 4, alignSelf: 'flex-start', marginBottom: 6, opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="back" size={16} color={C.text} />
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>Πίσω</Text>
          </Pressable>} />
      </View>
      <View style={[s.pad, { paddingTop: 8, gap: 14 }]}>{children}</View>
    </ScrollView>
  );
}
