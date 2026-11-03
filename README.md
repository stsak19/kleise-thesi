# Κλείσε Θέση — εφαρμογή κρατήσεων για iOS & Android

Νέα εφαρμογή που κρατάει **μόνο τη λογική κρατήσεων** του Gym_Schedule και
την ανοίγει σε κάθε επιχείρηση στην Ελλάδα που δουλεύει με ραντεβού ή θέσεις:
γυμναστήρια, personal, pilates/yoga, νυχάδικα, κομμωτήρια, κουρεία,
αισθητική, μασάζ/spa, φυσικοθεραπεία, ιατρεία, οδοντιατρεία, tattoo κ.ά.
Το πρόγραμμα γυμναστικής (καρνέ, στόχοι, προγράμματα γυμναστή) **δεν υπάρχει** εδώ.

Τεχνολογία: **Expo / React Native** (ένας κώδικας → iOS + Android) + **Supabase**.

## Τι μεταφέρθηκε από το Gym_Schedule

| Gym_Schedule | Εδώ |
|---|---|
| `day_availability`, `create_booking`, `cancel_booking` | ίδια, ανά **υπηρεσία** επιχείρησης |
| Δήλωση ενδιαφέροντος + `promote_waitlist()` + εναλλακτική κράτηση | `join_waitlist`, `promote_waitlist_slot` (triggers σε ακύρωση/αλλαγή θέσεων) |
| Πακέτο 30 ημερών, `expire_packages()` κάθε 5′ | ίδιο, προαιρετικό ανά επιχείρηση (`uses_credits`, `package_days`) |
| Έγκριση νέων πελατών | `requires_approval`, `owner_pending`, `owner_set_member` |
| Αλλαγή θέσεων ανά ώρα | `capacity_overrides` |
| Σημείωμα ημέρας / αργίες | `day_overrides` (note / closed) |
| admin: πρόγραμμα ημέρας, check-in, ακύρωση | `owner_day`, `owner_set_status` (ήρθε / δεν ήρθε / ακύρωση) |
| Ειδοποιήσεις | πίνακας `notifications` (push: βλ. παρακάτω) |
| Κινητό + 4ψήφιο PIN | **Supabase Auth** (email + κωδικός) |

Νέο: πολλές επιχειρήσεις (multi-tenant), κατηγορίες, αναζήτηση ανά πόλη,
υπηρεσίες με διάρκεια/τιμή/θέσεις (1 θέση = ατομικό ραντεβού), εβδομαδιαίο ωράριο,
όριο ακύρωσης σε λεπτά, RLS με `auth.uid()` αντί για `p_client_id`.

## Δομή

```
supabase/schema.sql    ← όλο το σχήμα, RLS, RPC, triggers, cron
app/login.tsx          ← σύνδεση / εγγραφή με email + κωδικό
app/index.tsx          ← αναζήτηση: κατηγορία / πόλη / όνομα
app/business/[id].tsx  ← υπηρεσίες, μέρες, ώρες, κράτηση / ενδιαφέρον
app/bookings.tsx       ← οι κρατήσεις μου, ειδοποιήσεις, πακέτα, ιστορικό
app/profile.tsx        ← όνομα / κινητό
app/owner/index.tsx    ← πίνακας επιχείρησης (το πρώην admin)
app/owner/setup.tsx    ← στοιχεία, υπηρεσίες, ωράριο, κανόνες
lib/                   ← supabase client, auth, UI
```

## Στήσιμο

1. Νέο project στη Supabase (όχι το παλιό του γυμναστηρίου). SQL Editor → τρέξε το `supabase/schema.sql`.
   Authentication → Sign In / Providers → Email: κλειστό το «Confirm email» (για δοκιμές).
2. Στο `app.json` → `extra` βάλε `supabaseUrl` και `supabaseAnonKey`.
3. Τοπικά:
   ```bash
   cd kleise-thesi
   npm install
   npx expo start
   ```
   Άνοιξε με το Expo Go σε κινητό.
4. Ανέβασμα στα stores:
   ```bash
   npm i -g eas-cli && eas login
   eas build -p android && eas build -p ios
   eas submit -p android && eas submit -p ios
   ```
   Χρειάζονται λογαριασμός Apple Developer (99$/έτος) και Google Play Console (25$ εφάπαξ).

## Τι μένει για την κυκλοφορία

- **Push ειδοποιήσεις**: `expo-notifications` + αποθήκευση `profiles.push_token` +
  Edge Function που στέλνει σε κάθε insert στο `notifications`.
- **Υπενθύμιση** πριν το ραντεβού (cron + push).
- **Προσωπικό / πολλοί εργαζόμενοι** (π.χ. 3 κομμώτριες): πίνακας `staff` και θέσεις ανά εργαζόμενο.
- Φωτογραφίες / λογότυπο επιχείρησης (Supabase Storage), χάρτης, αξιολογήσεις.
- Πολιτική απορρήτου & όροι (GDPR — υποχρεωτικά για τα stores), διαγραφή λογαριασμού μέσα από την εφαρμογή (απαίτηση Apple).
- Συνδρομή επιχειρήσεων (π.χ. Stripe / Viva Wallet) αν θέλετε έσοδα.

## Αυτόματα χτισίματα (GitHub Actions)

Σε κάθε push στο `main`:
- **Android APK** → Actions → «Android APK» → Artifacts → `kleise-thesi-apk`.
- **Web (για iPhone / browser)** → https://stsak19.github.io/kleise-thesi/
  Μία φορά: Settings → Pages → Source: **GitHub Actions**.
