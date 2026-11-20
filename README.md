# SpotOn

Εφαρμογή κρατήσεων για κινητό (iOS/Android) και browser. Οι πελάτες βρίσκουν καταστήματα (γυμναστήρια, κομμωτήρια, νυχάδικα, κουρεία, pilates, ιατρεία κ.λπ.) και κλείνουν θέση σε μέρα και ώρα. Οι ιδιοκτήτες στήνουν το κατάστημά τους, βλέπουν το πρόγραμμα, τους πελάτες και τα πακέτα τους. Όλα στα ελληνικά.

- **Ιστοσελίδα:** https://stsak19.github.io/kleise-thesi/
- **APK Android:** Actions → «Android APK» → artifact `kleise-thesi-apk`
- **Προεπισκόπηση κάθε PR:** `https://stsak19.github.io/kleise-thesi/pr-preview/pr-<αριθμός>/`

## Τι κάνει
- **Πελάτης:** αναζήτηση ανά είδος και πόλη, αγαπημένα, κράτηση σε ώρα ή μάθημα, πακέτα, ιστορικό, βαθμολογίες.
- **Κατάστημα:** δική του σελίδα με σύνδεσμο από το όνομα (`/store/barber-nikos`), πρόγραμμα μαθημάτων ή ραντεβού, λίστα αναμονής.
- **Επιχείρηση:** οδηγός 8 βημάτων, πρόγραμμα ημέρας, μηνύματα σε ομάδες πελατών, καρτέλες πελατών, πακέτα, ομάδα και προσκλήσεις υπαλλήλων, πληρωμή πακέτων (δοκιμαστική μέχρι να μπει η Viva).
- **Super admin:** καταστήματα, πελάτες, κρατήσεις, βαθμολογίες, αιτήσεις διαγραφής, πληρωμές.

## Τεχνολογίες
Expo SDK 58 + expo-router (React Native 0.88, React 19, TypeScript) · Supabase (Postgres, Auth, Storage, Edge Functions) · χωρίς βιβλιοθήκες UI.

## Εκτέλεση
Χρειάζεται Node 22 (`.nvmrc`).
```bash
npm ci
npx expo start          # κινητό (Expo Go) ή browser
npm run typecheck       # έλεγχος τύπων, πριν από κάθε commit
npm run build:web       # build ιστοσελίδας στον φάκελο web/
npm run allages         # τι άλλαξε πρόσφατα και από ποιον
```
Η εφαρμογή συνδέεται στην κανονική βάση Supabase (στοιχεία στο `app.json` → `extra`). Δεν υπάρχει demo ή δοκιμαστικά δεδομένα.

## Οργάνωση
| | |
|---|---|
| `app/` | Οθόνες (expo-router) |
| `lib/` | Κοινός κώδικας, θέμα (`theme.ts`), κείμενο (`Txt.tsx`) |
| `supabase/` | `schema.sql`, `migrations/` (001–021), Edge Functions |
| `docs/features/` | Πώς δουλεύει κάθε λειτουργία ([index στο CLAUDE.md](CLAUDE.md)) |
| `docs/synergasia.md` | Πώς δουλεύουμε οι δύο μας και τα Claude μας |
| `CHANGELOG.md` | Τι άλλαξε, πότε και από ποιον |

## Συνεργασία
Ο **Στάθης** (`stsak19`) είναι ο ιδιοκτήτης και γράφει στο `main`. Ο **Λεωνίδας** (`LeoTheGreat777`) δουλεύει σε branches `leonidas/*` και ανοίγει PR που ελέγχει και κάνει Merge ο Στάθης. Κάθε αλλαγή ενημερώνει το `CHANGELOG.md` και τα σχετικά `docs/`. Λεπτομέρειες: [CONTRIBUTING.md](CONTRIBUTING.md) και [docs/synergasia.md](docs/synergasia.md).

## Άδεια
Δεν έχει οριστεί ακόμα άδεια χρήσης (απόφαση του Στάθη). Τα εικονίδια κατηγοριών είναι Microsoft Fluent Emoji 3D (MIT).
