import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../Txt';
import { useAuth } from '../auth';
import { Btn, C, Icon, alpha } from '../ui';
import { getReturnTo, setLoginOpen, setReturnTo, useLoginOpen } from '../guest';
import { useLogin } from './useLogin';
import { Fields, LinkText, Logo, Notice, Terms } from './parts';

/* Σύνδεση / εγγραφή σε παράθυρο στη μέση της ιστοσελίδας, πάνω από τη σελίδα που βλέπει ο επισκέπτης.
   Μόλις συνδεθεί, κλείνει και πηγαίνει εκεί που ήθελε (π.χ. Κρατήσεις)· αλλιώς μένει στη σελίδα που ήταν. */
export function LoginModal() {
  const open = useLoginOpen();
  const { session } = useAuth();
  const L = useLogin('in');
  const up = L.mode === 'up';
  const close = () => { setReturnTo(null); setLoginOpen(false); };

  useEffect(() => {
    if (!open || !session) return;
    const to = getReturnTo();
    setReturnTo(null); setLoginOpen(false);
    if (to) router.navigate(to as any);
  }, [open, session]);

  return (
    <Modal visible={open && !session} transparent animationType="fade" onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: alpha('#000000', 0.45), alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 440, maxHeight: '100%', backgroundColor: C.bg, borderRadius: 24,
          boxShadow: `0px 24px 60px ${alpha('#000000', 0.3)}` }}>
          <ScrollView contentContainerStyle={{ padding: 28, gap: 18 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><Logo size={22} /></View>
              <Pressable onPress={close} accessibilityLabel="Κλείσιμο" hitSlop={8}
                style={({ hovered }: any) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: hovered ? C.line : C.soft })}>
                <Icon name="close" size={15} color={C.text} />
              </Pressable>
            </View>

            {/* Σύνδεση | Εγγραφή */}
            <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderRadius: 14, padding: 4 }}>
              {(['in', 'up'] as const).map((m) => {
                const on = L.mode === m;
                return (
                  <Pressable key={m} onPress={() => L.setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: on ? C.bg : 'transparent',
                      boxShadow: on ? `0px 1px 4px ${alpha('#000000', 0.1)}` : undefined }}>
                    <Text style={{ color: on ? C.text : C.mute, fontWeight: '800', fontSize: 14 }}>{m === 'in' ? 'Σύνδεση' : 'Εγγραφή'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 24, letterSpacing: -0.5 }}>{up ? 'Νέος λογαριασμός' : 'Καλώς ήρθες ξανά'}</Text>
              <Text style={{ color: C.mute, fontSize: 15 }}>{up ? 'Λίγα στοιχεία και κλείνεις θέση.' : 'Συνδέσου για να κλείσεις θέση και να δεις τις κρατήσεις σου.'}</Text>
            </View>

            <Fields L={L} />
            {!up && <LinkText title="Ξέχασες τον κωδικό;" onPress={L.forgot} align="flex-end" />}
            <Notice L={L} />
            <Btn title={L.busy ? 'Μια στιγμή…' : up ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'} onPress={L.go} disabled={L.busy} />
            {up && <Terms />}
            <LinkText title="Δες το demo" onPress={L.guest} color={C.mute} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
