import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, C } from './ui';

/* Ξενάγηση που εμφανίζεται μόνο την πρώτη φορά που ανοίγει η εφαρμογή. */
const KEY = 'intro.seen.v1';
const STEPS = [
  { emoji: '📅', title: 'Καλώς ήρθες στο SpotOn', text: 'Κλείνεις ραντεβού σε γυμναστήρια, κομμωτήρια, νυχάδικα και ό,τι άλλο χρειάζεσαι — χωρίς τηλέφωνα.' },
  { emoji: '🔎', title: 'Βρες αυτό που θέλεις', text: 'Ψάξε με όνομα ή διάλεξε κατηγορία για να δεις τις επιχειρήσεις κοντά σου.' },
  { emoji: '🕒', title: 'Διάλεξε μέρα και ώρα', text: 'Βλέπεις τις ελεύθερες θέσεις live και κλείνεις με ένα πάτημα. Αν είναι γεμάτο, μπαίνεις σε λίστα ενδιαφέροντος.' },
  { emoji: '🔔', title: 'Όλα σε ένα σημείο', text: 'Στο «Οι κρατήσεις μου» βλέπεις τα ραντεβού σου, τις ειδοποιήσεις και μπορείς να ακυρώσεις.' },
  { emoji: '🏪', title: 'Έχεις επιχείρηση;', text: 'Από το «Επιχείρηση» στήνεις υπηρεσίες, ωράριο και θέσεις, και βλέπεις τις κρατήσεις σου.' },
];

export function useIntroSeen(): [boolean | null, () => void] {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => setSeen(v === '1')).catch(() => setSeen(true)); }, []);
  return [seen, () => { setSeen(true); AsyncStorage.setItem(KEY, '1').catch(() => {}); }];
}

export default function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const st = STEPS[i], last = i === STEPS.length - 1;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'flex-end', minHeight: 24 }}>
        {!last && <Pressable onPress={onDone}><Text style={{ color: C.mute, fontWeight: '600' }}>Παράλειψη</Text></Pressable>}
      </View>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 56 }}>{st.emoji}</Text>
        </View>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', textAlign: 'center' }}>{st.title}</Text>
        <Text style={{ color: C.mute, fontSize: 16, textAlign: 'center', lineHeight: 23 }}>{st.text}</Text>
      </View>
      <View style={{ gap: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {STEPS.map((_, k) => <Pressable key={k} onPress={() => setI(k)}
            style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? C.accent : C.line }} />)}
        </View>
        <Btn title={last ? 'Ξεκίνα' : 'Επόμενο'} onPress={() => (last ? onDone() : setI(i + 1))} />
        {i > 0 && <Btn kind="ghost" title="Πίσω" onPress={() => setI(i - 1)} />}
      </View>
    </View>
  );
}
