# SpotOn — index για το Claude

Εφαρμογή κρατήσεων (Expo + Supabase), όλα στα ελληνικά. Διάβασε **μόνο** το αρχείο της λειτουργίας που αλλάζεις, όχι όλα.

## Πρώτα απ' όλα (κάθε session)
Δουλεύουν δύο: **Στάθης** (`stsak19`, ιδιοκτήτης) και **Λεωνίδας** (`LeoTheGreat777`). Στην αρχή κάθε session:
1. Δες τι έκανε ο άλλος: το αποτέλεσμα του `node scripts/allages.mjs` (τρέχει μόνο του από το `.claude/settings.json`· αλλιώς `npm run allages`).
2. Πες το στον άνθρωπό σου σύντομα. Στον Στάθη: για κάθε ανοιχτό PR του Λεωνίδα ρώτα αν θέλει να το δει και να το κάνει Merge ή όχι. Στον Λεωνίδα: τι άλλαξε ο Στάθης.
3. Όταν τα δει, ενημέρωσε το «είδε μέχρι» στο `docs/synergasia.md`.

Λεπτομέρειες: [`docs/synergasia.md`](docs/synergasia.md).

## Κανόνες
- **Στάθης**: κάθε αλλαγή, αφού γίνει commit, περνάει πάντα και στο `main` (ενημερώνονται η σελίδα GitHub Pages και το APK). Το έχει εγκρίνει μόνιμα.
- **Λεωνίδας**: ποτέ στο `main`. Νέο branch (`leonidas/<θέμα>` ή `claude/…`) από το τελευταίο `main` και PR για τον Στάθη.
- Ο καθένας σβήνει μόνο τα δικά του branches μετά το Merge (`.github/workflows/branches.yml`).
- Κάθε commit τελειώνει με `Από: Στάθης` ή `Από: Λεωνίδας`.
- Σε κάθε αλλαγή ενημερώνεις στο ίδιο commit: το `docs/features/<λειτουργία>.md`, το `CHANGELOG.md` (με [Στάθης]/[Λεωνίδας]) και το `README.md` αν χρειάζεται.
- Χρώματα (minimal μαύρο · λευκό, ανοιχτή και σκούρα εμφάνιση) μόνο στο `lib/theme.ts`.
- Κείμενο μόνο από `lib/Txt.tsx` (Manrope), όχι `Text` του `react-native`. Νέο κείμενο στην πλευρά του πελάτη → και στο λεξικό `lib/i18n/en.ts` (glossa.md). Χωρίς βιβλιοθήκες UI, animation μόνο με `Animated`.
- **Δεν υπάρχει demo**: από 2026-11-16 σβήστηκε οριστικά και δεν ξαναεμφανίζεται ποτέ. Μόνο δεδομένα από τη Supabase. Όχι δοκιμαστικά δεδομένα, demo λειτουργία ή κρυφοί σύνδεσμοι.
- Νέα χαρακτηριστικά βάσης = νέο αρχείο στο `supabase/migrations/` με τον επόμενο ελεύθερο αριθμό (κοίτα και τα ανοιχτά PR), που τελειώνει με `select mark_migration(N, 'NNN_όνομα');` (025· το ελέγχει το CI).
- Πριν από κάθε commit: `npm run typecheck`. Για αλλαγές στην εμφάνιση ο Στάθης θέλει πρώτα να βλέπει εκδοχές.

## Index λειτουργιών (`docs/features/`)
| Αρχείο | Τι έχει |
|---|---|
| [`domi.md`](docs/features/domi.md) | Φάκελοι, οι τρεις λειτουργίες (πελάτης/κατάστημα/επιχείρηση), πού είναι τι |
| [`emfanisi.md`](docs/features/emfanisi.md) | Θέμα, χρώματα, Txt, μπάρες, κινητό vs υπολογιστής |
| [`pelatis.md`](docs/features/pelatis.md) | Αρχική, αναζήτηση, αγαπημένα, Κρατήσεις, Προφίλ |
| [`katastima.md`](docs/features/katastima.md) | Σελίδα καταστήματος, κράτηση, πρόγραμμα, σύνδεσμος με όνομα (slug) |
| [`epixeirisi.md`](docs/features/epixeirisi.md) | Οδηγός νέας επιχείρησης, Πρόγραμμα, Μηνύματα, Πελάτες, Ρυθμίσεις |
| [`paketa-pliromes.md`](docs/features/paketa-pliromes.md) | Πακέτα, δοκιμαστική πληρωμή, Viva, προμήθεια |
| [`vathmologies.md`](docs/features/vathmologies.md) | Βαθμολογίες και κριτικές |
| [`ypalliloi.md`](docs/features/ypalliloi.md) | Ομάδα, προσκλήσεις, «Το πρόγραμμά μου» |
| [`logariasmoi.md`](docs/features/logariasmoi.md) | Σύνδεση, επισκέπτης, διαγραφή λογαριασμού, αφαίρεση επιχείρησης |
| [`admin.md`](docs/features/admin.md) | Super admin |
| [`glossa.md`](docs/features/glossa.md) | Ελληνικά/Αγγλικά: πώς μεταφράζεται, λεξικό `lib/i18n/en.ts` |
| [`vasi.md`](docs/features/vasi.md) | Supabase, λίστα migrations, σειρά, πώς τρέχουν |
| [`ekdosi.md`](docs/features/ekdosi.md) | GitHub Pages, προεπισκόπηση PR, APK, έλεγχος PR |

Εκκρεμότητες και ιδέες: [`docs/ekkremotites.md`](docs/ekkremotites.md). Ιστορικό αλλαγών: [`CHANGELOG.md`](CHANGELOG.md).
