# Έκδοση, CI και προεπισκοπήσεις

| Workflow | Πότε | Τι κάνει |
|---|---|---|
| `check.yml` «Έλεγχος PR» | κάθε PR προς `main` | `tsc --noEmit` + build για web. Προειδοποιεί αν άλλαξε κώδικας χωρίς CHANGELOG/docs. |
| `preview.yml` «Προεπισκόπηση PR» | κάθε PR από branch του repo | Ζωντανή σελίδα στο `https://stsak19.github.io/kleise-thesi/pr-preview/pr-<N>/`, σύνδεσμος σε σχόλιο. Σβήνεται όταν κλείσει. **Μιλάει με την κανονική βάση.** |
| `web.yml` «Web (GitHub Pages)» | push στο `main` | Ανεβάζει τη σελίδα στο branch `gh-pages` (χωρίς να πειράζει το `pr-preview/`). |
| `android.yml` «Android APK» | push στο `main` | APK στο Actions → «Android APK» → artifact `kleise-thesi-apk` (30 μέρες). |

- Σελίδα: https://stsak19.github.io/kleise-thesi/ (Settings → Pages → «Deploy from a branch» → `gh-pages` / root).
- Η διεύθυνση βάσης (`/kleise-thesi`) είναι στο `app.json` → `experiments.baseUrl`· το `app.config.js` την αλλάζει για τις προεπισκοπήσεις (`EXPO_BASE_URL`).
- Το `.github/pages/404.html` κάνει τα deep links (π.χ. `/store/<slug>`) να δουλεύουν στο GitHub Pages.
- iOS / Play Store: υπάρχει `eas.json` (`npm run build:android`, `build:ios`), δεν έχει στηθεί ακόμα.
