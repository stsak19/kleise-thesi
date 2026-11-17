import { useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Txt';
import { C, Icon, alpha } from './ui';

/* Φύλλο που ανεβαίνει από κάτω σε όλο σχεδόν το ύψος (κινητό). Κλείνει με το ✕ ή σέρνοντάς το προς τα κάτω
   (από πάνω, ή από το περιεχόμενο όταν είναι στην αρχή του). Το χρησιμοποιούν η προεπισκόπηση του οδηγού και το ⓘ του καταστήματος. */
export function DragSheet({ title, sub, onClose, footer, children }:
  { title: string; sub?: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }) {
  const { top, bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const y = useRef(new Animated.Value(0)).current;
  const atTop = useRef(true);
  const close = useRef(onClose); close.current = onClose;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => atTop.current && g.dy > 8 && g.dy > Math.abs(g.dx) * 1.5,
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 1) Animated.timing(y, { toValue: height, duration: 200, useNativeDriver: false }).start(() => close.current());
      else Animated.spring(y, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: false }).start(),
  })).current;
  const dim = y.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, paddingTop: top + 10 }}>
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: alpha('#000000', 0.35), opacity: dim }} />
        <Animated.View {...pan.panHandlers} style={{ flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', transform: [{ translateY: y }] }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginTop: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }} numberOfLines={1}>{title}</Text>
              {!!sub && <Text style={{ color: C.mute, fontSize: 13 }} numberOfLines={1}>{sub}</Text>}
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Κλείσιμο" hitSlop={8}
              style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Icon name="close" size={14} color={C.text} />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: footer ? 30 : bottom + 30 }} scrollEventThrottle={16}
            onScroll={(e) => { atTop.current = e.nativeEvent.contentOffset.y <= 0; }}>
            {children}
          </ScrollView>
          {!!footer && <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottom + 16, borderTopWidth: 1, borderTopColor: C.line }}>{footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  );
}

/* Το στρογγυλό κουμπί ⓘ (πληροφορίες) πάνω δεξιά. */
export function InfoButton({ onPress, size = 34, label = 'Πληροφορίες' }: { onPress: () => void; size?: number; label?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed, hovered }: any) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', opacity: pressed || hovered ? 0.8 : 1 })}>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: size * 0.5, lineHeight: size * 0.6, fontStyle: 'italic' }}>i</Text>
    </Pressable>
  );
}
