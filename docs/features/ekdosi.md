# Έκδοση, CI και προεπισκοπήσεις

| Workflow | Πότε | Τι κάνει |
|---|---|---|
| `check.yml` «Έλεγχος PR» | κάθε PR προς `main` | `tsc --noEmit` + build για web. Προειδοποιεί αν άλλαξε κώδικας χωρίς CHANGELOG/docs. |
| `sql.yml` «Έλεγχος SQL» | PR που αλλάζει το `supabase/` | `schema.sql` + όλα τα migrations δύο φορές σε άδειο Postgres (`scripts/elegxos-sql.sh`, stubs για auth/storage/cron στο `supabase/ci/stubs.sql`). Δεν αγγίζει την κανονική βάση. |
| `branches.yml` «Καθάρισμα branches» | Merge PR / με το χέρι | Σβήνει το branch μετά το Merge (PR του Λεωνίδα)· με το χέρι σβήνει όσα branches με ένα prefix έχουν γίνει Merge. |
| `preview.yml` «Προεπισκόπηση PR» | κάθε PR από branch του repo | Ζωντανή σελίδα στο `https://stsak19.github.io/kleise-thesi/pr-preview/pr-<N>/`, σύνδεσμος σε σχόλιο. Σβήνεται όταν κλείσει. **Μιλάει με την κανονική βάση.** |
| `web.yml` «Web (GitHub Pages)» | push στο `main` | Ανεβάζει τη σελίδα στο branch `gh-pages` (χωρίς να πειράζει το `pr-preview/`). |
| `android.yml` «Android APK» | push στο `main`, tag `v*` | APK ως artifact `kleise-thesi-apk` (30 μέρες)· με tag `v1.2.0` και GitHub Release με το APK. |

- Σελίδα: https://stsak19.github.io/kleise-thesi/ (Settings → Pages → «Deploy from a branch» → `gh-pages` / root).
- Η διεύθυνση βάσης (`/kleise-thesi`) είναι στο `app.json` → `experiments.baseUrl`· το `app.config.js` την αλλάζει για τις προεπισκοπήσεις (`EXPO_BASE_URL`).
- Το `.github/pages/404.html` κάνει τα deep links (π.χ. `/store/<slug>`) να δουλεύουν στο GitHub Pages.
- Νέα έκδοση: άλλαξε το `version` στο `app.json`, και μετά GitHub → Releases → «Draft a new release» → tag `v1.2.0` (ή `git tag v1.2.0 && git push origin v1.2.0`).
- Dependabot (`.github/dependabot.yml`) ανοίγει μία φορά τον μήνα PR μόνο για τις εκδόσεις των Actions.
- iOS / Play Store: υπάρχει `eas.json` (`npm run build:android`, `build:ios`), δεν έχει στηθεί ακόμα.

## Εγκατάσταση ως εφαρμογή (PWA)
- `public/manifest.webmanifest` και `public/icons/` (από το `assets/icon.png`, και «maskable» με περιθώριο) βγαίνουν δίπλα στο `index.html` με το `expo export`. Όλα σχετικά (`./`), άρα δουλεύουν και στο `pr-preview/pr-N`.
- `lib/pwa.ts` (`setupPwa()` στο `app/_layout.tsx`, μόνο web): βάζει `<link rel=manifest>`, apple-touch-icon, `theme-color` από το θέμα (αλλάζει με την εμφάνιση), `lang=el`, και κρατά το `beforeinstallprompt`.
- Κουμπί «Εγκατάσταση στη συσκευή» στις Ρυθμίσεις (κινητό web) και «Εγκατάσταση στον υπολογιστή» στη Βοήθεια του Προφίλ (υπολογιστής). Στο iPhone (Safari) δείχνει οδηγία «Κοινοποίηση → Προσθήκη στην οθόνη Αφετηρίας». Κρύβεται όταν είναι ήδη εγκατεστημένη.
- Χωρίς service worker (δεν χρειάζεται για εγκατάσταση και δεν κρατά παλιές εκδόσεις στην cache).
