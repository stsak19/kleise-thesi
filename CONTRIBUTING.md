# Πώς κάνω μια αλλαγή

1. Τράβηξε το τελευταίο `main` και τρέξε `npm run allages` για να δεις τι έκανε ο άλλος.
2. **Λεωνίδας:** νέο branch `leonidas/<θέμα>` (ή `claude/…`) από το `main`. **Στάθης:** κατευθείαν στο `main` (ή branch αν θέλει δεύτερη ματιά).
3. Κάνε την αλλαγή ακολουθώντας τους κανόνες του [CLAUDE.md](CLAUDE.md) (χρώματα στο `lib/theme.ts`, κείμενο από `lib/Txt.tsx`, χωρίς demo).
4. Αλλαγή στη βάση; Νέο αρχείο `supabase/migrations/NNN_<όνομα>.sql` με τον επόμενο αριθμό (δες [docs/features/vasi.md](docs/features/vasi.md)).
5. Ενημέρωσε στο ίδιο commit: `CHANGELOG.md` (με [Στάθης]/[Λεωνίδας]), το `docs/features/<λειτουργία>.md`, το `README.md` αν χρειάζεται.
6. `npm run typecheck`.
7. Commit με γραμμή `Από: Στάθης` ή `Από: Λεωνίδας` στο τέλος του μηνύματος.
8. PR (Λεωνίδας): συμπλήρωσε το template. Ο έλεγχος και η προεπισκόπηση τρέχουν μόνα τους. Μετά το Merge: τρέξε το migration στη Supabase αν υπάρχει, και «Delete branch».

Σφάλματα και ιδέες: GitHub → Issues → New issue.
