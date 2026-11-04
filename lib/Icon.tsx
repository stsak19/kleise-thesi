import { View, ViewStyle } from 'react-native';
import { C } from './theme';

/* Μικρά εικονίδια γραμμής, φτιαγμένα μόνο με View (χωρίς βιβλιοθήκη εικονιδίων).
   Παίρνουν το χρώμα τους από το θέμα, οπότε αλλάζουν μαζί με το 🎨. */
export type IconName = 'search' | 'calendar' | 'user' | 'pin' | 'clock' | 'phone' | 'chevron' | 'bell' | 'check' | 'plus' | 'store' | 'close';

export function Icon({ name, size = 22, color = C.text, style }: { name: IconName; size?: number; color?: string; style?: ViewStyle }) {
  const s = size, w = Math.max(1.6, Math.round(s * 0.09 * 10) / 10);
  const abs = (x: number, y: number, extra: ViewStyle): ViewStyle => ({ position: 'absolute', left: x, top: y, ...extra });
  const bar = (cx: number, cy: number, len: number, deg: number) =>
    <View style={abs(cx - len / 2, cy - w / 2, { width: len, height: w, borderRadius: w, backgroundColor: color, transform: [{ rotate: `${deg}deg` }] })} />;
  let body: React.ReactNode = null;
  switch (name) {
    case 'search':
      body = <>
        <View style={abs(s * 0.08, s * 0.08, { width: s * 0.6, height: s * 0.6, borderRadius: s, borderWidth: w, borderColor: color })} />
        {bar(s * 0.76, s * 0.76, s * 0.3, 45)}
      </>; break;
    case 'calendar':
      body = <>
        <View style={abs(s * 0.1, s * 0.16, { width: s * 0.8, height: s * 0.74, borderRadius: s * 0.2, borderWidth: w, borderColor: color, overflow: 'hidden' })}>
          <View style={{ height: s * 0.16, backgroundColor: color }} />
        </View>
        <View style={abs(s * 0.3 - w / 2, s * 0.06, { width: w, height: s * 0.2, borderRadius: w, backgroundColor: color })} />
        <View style={abs(s * 0.7 - w / 2, s * 0.06, { width: w, height: s * 0.2, borderRadius: w, backgroundColor: color })} />
        <View style={abs(s * 0.3, s * 0.52, { width: s * 0.14, height: s * 0.14, borderRadius: 2, backgroundColor: color })} />
      </>; break;
    case 'user':
      body = <>
        <View style={abs(s * 0.31, s * 0.08, { width: s * 0.38, height: s * 0.38, borderRadius: s, borderWidth: w, borderColor: color })} />
        <View style={abs(s * 0.14, s * 0.56, { width: s * 0.72, height: s * 0.36, borderTopLeftRadius: s * 0.36, borderTopRightRadius: s * 0.36,
          borderBottomLeftRadius: s * 0.08, borderBottomRightRadius: s * 0.08, borderWidth: w, borderColor: color })} />
      </>; break;
    case 'pin':
      body = <>
        <View style={abs(s * 0.22, s * 0.1, { width: s * 0.56, height: s * 0.56, borderWidth: w, borderColor: color,
          borderTopLeftRadius: s, borderTopRightRadius: s, borderBottomLeftRadius: s, borderBottomRightRadius: 0, transform: [{ rotate: '45deg' }] })} />
        <View style={abs(s * 0.4, s * 0.28, { width: s * 0.2, height: s * 0.2, borderRadius: s, backgroundColor: color })} />
      </>; break;
    case 'clock':
      body = <>
        <View style={abs(s * 0.1, s * 0.1, { width: s * 0.8, height: s * 0.8, borderRadius: s, borderWidth: w, borderColor: color })} />
        <View style={abs(s * 0.5 - w / 2, s * 0.26, { width: w, height: s * 0.26, borderRadius: w, backgroundColor: color })} />
        <View style={abs(s * 0.5 - w / 2, s * 0.5 - w / 2, { width: s * 0.2, height: w, borderRadius: w, backgroundColor: color })} />
      </>; break;
    case 'phone':
      body = <>
        <View style={abs(s * 0.26, s * 0.08, { width: s * 0.48, height: s * 0.84, borderRadius: s * 0.13, borderWidth: w, borderColor: color })} />
        <View style={abs(s * 0.42, s * 0.74, { width: s * 0.16, height: w, borderRadius: w, backgroundColor: color })} />
      </>; break;
    case 'chevron':
      body = <View style={abs(s * 0.24, s * 0.32, { width: s * 0.36, height: s * 0.36, borderTopWidth: w, borderRightWidth: w, borderColor: color, borderTopRightRadius: 2, transform: [{ rotate: '45deg' }] })} />;
      break;
    case 'bell':
      body = <>
        <View style={abs(s * 0.2, s * 0.14, { width: s * 0.6, height: s * 0.6, borderTopLeftRadius: s * 0.3, borderTopRightRadius: s * 0.3, borderWidth: w, borderBottomWidth: 0, borderColor: color })} />
        {bar(s * 0.5, s * 0.74, s * 0.8, 0)}
        <View style={abs(s * 0.41, s * 0.8, { width: s * 0.18, height: s * 0.12, borderBottomLeftRadius: s, borderBottomRightRadius: s, backgroundColor: color })} />
        <View style={abs(s * 0.5 - w / 2, s * 0.04, { width: w, height: s * 0.12, borderRadius: w, backgroundColor: color })} />
      </>; break;
    case 'check':
      body = <View style={abs(s * 0.36, s * 0.14, { width: s * 0.28, height: s * 0.54, borderRightWidth: w * 1.2, borderBottomWidth: w * 1.2, borderColor: color, transform: [{ rotate: '45deg' }] })} />;
      break;
    case 'plus':
      body = <>{bar(s * 0.5, s * 0.5, s * 0.64, 0)}{bar(s * 0.5, s * 0.5, s * 0.64, 90)}</>; break;
    case 'close':
      body = <>{bar(s * 0.5, s * 0.5, s * 0.64, 45)}{bar(s * 0.5, s * 0.5, s * 0.64, -45)}</>; break;
    case 'store':
      body = <>
        <View style={abs(s * 0.06, s * 0.14, { width: s * 0.88, height: s * 0.24, borderRadius: s * 0.08, backgroundColor: color })} />
        <View style={abs(s * 0.14, s * 0.34, { width: s * 0.72, height: s * 0.54, borderWidth: w, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: s * 0.08, borderBottomRightRadius: s * 0.08 })} />
        <View style={abs(s * 0.4, s * 0.58, { width: s * 0.2, height: s * 0.3, borderWidth: w, borderBottomWidth: 0, borderColor: color, borderTopLeftRadius: 3, borderTopRightRadius: 3 })} />
      </>; break;
  }
  return <View style={[{ width: s, height: s }, style]} pointerEvents="none">{body}</View>;
}
