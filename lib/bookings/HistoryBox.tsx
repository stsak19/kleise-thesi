import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../Txt';
import { C, Icon, s } from '../ui';

/* Το Ιστορικό, σε πλαίσιο κάτω από τη λίστα: κλειστό στην αρχή, πάτημα → ανοίγει και δείχνει τα στοιχεία. */
export function HistoryBox({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 20, overflow: 'hidden', marginTop: 6 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={({ pressed }) => [s.row, { gap: 12, padding: 16, backgroundColor: pressed ? C.soft : 'transparent' }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="clock" size={19} color={C.text} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
          <Text style={{ color: C.mute, fontSize: 13 }}>{sub}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={15} color={C.mute} /></View>
      </Pressable>
      {open && <View style={{ paddingHorizontal: 16, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.line }}>{children}</View>}
    </View>
  );
}

