# Δομή της εφαρμογής

Τρεις «λειτουργίες» με δικές τους μπάρες: **πελάτης**, **κατάστημα** (σαν ξεχωριστή εφαρμογή μέσα στο SpotOn) και **επιχείρηση**. Συν το **super admin**. Η επιλογή πελάτης/επιχείρηση μένει στη συσκευή (`lib/mode.ts`).

```
app/
  _layout.tsx        Ρίζα: θέμα, ξενάγηση πρώτης φοράς (lib/Intro), έλεγχος σύνδεσης (lib/guest.ts)
  login.tsx          Σύνδεση (κινητό)· στο web παράθυρο στη μέση (lib/login/LoginModal)
  (tabs)/            ΠΕΛΑΤΗΣ                         → pelatis.md
  store/[id]/        ΚΑΤΑΣΤΗΜΑ (id = slug ή uuid)    → katastima.md
  (biz)/             ΕΠΙΧΕΙΡΗΣΗ                      → epixeirisi.md
  new-business.tsx   Οδηγός νέας επιχείρησης         → epixeirisi.md
  checkout.tsx, paid.tsx   Πληρωμή πακέτου           → paketa-pliromes.md
  work.tsx, join.tsx       Υπάλληλος                 → ypalliloi.md
  booked.tsx         «Κλείστηκε!» μετά από κάθε κράτηση
  delete-account.tsx, remove-business.tsx, new-password.tsx, privacy.tsx → logariasmoi.md
  admin/             Super admin                     → admin.md
lib/
  theme.ts · Txt.tsx · ui.tsx · Icon.tsx · FloatBar.tsx · wide.ts   → emfanisi.md
  supabase.ts        Ο client (sb) και rpc()· URL/κλειδί από app.json → extra
  auth.tsx           Σύνδεση και προφίλ (useAuth)
  presets.ts · bizscreen.ts · owner/svcKind.ts · owner/kinds.ts   Τι αλλάζει ανά είδος επιχείρησης
  client/ bookings/ profile/   Πελάτης
  store/             Κατάστημα (data, book, Schedule, BookUI, Packs, StoreBar, key = slug)
  owner/             Επιχείρηση (save, settings, services, day, packs, hub, desk)
  admin/ account/ login/
supabase/            schema.sql, migrations/, functions/ → vasi.md
.github/workflows/   → ekdosi.md
scripts/allages.mjs  Τι άλλαξε και από ποιον → ../synergasia.md
```
