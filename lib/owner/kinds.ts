/* Πώς «μιλάει» η λειτουργία επιχείρησης σε κάθε επάγγελμα: τι λέγεται ομάδα, πελάτες, πακέτα.
   Ένα γυμναστήριο έχει προπονητές, μέλη και συνδρομές· ένα φυσικοθεραπευτήριο θεραπευτές, ασθενείς και πακέτα συνεδριών. */
export type Kind = {
  team: string;          // τίτλος της ομάδας
  solo: string;          // όταν δουλεύει ένα άτομο
  clients: string;       // πώς λέγονται οι πελάτες
  plans: string;         // πακέτα / συνδρομές / κάρτες
  plansText: string;     // μία γραμμή εξήγηση
  attention: string;     // τίτλος για πακέτα που τελειώνουν
  classes: boolean;      // δουλεύει με τμήματα (πληρότητα αντί για έσοδα)
};

const base: Kind = { team: 'Η ομάδα', solo: 'Δουλεύεις μόνος/η', clients: 'Πελάτες', plans: 'Πακέτα', plansText: 'Ό,τι πουλάς εκτός από μία επίσκεψη.',
  attention: 'Πακέτα που τελειώνουν', classes: false };

const K: Record<string, Partial<Kind>> = {
  hair: { team: 'Η ομάδα', plans: 'Κάρτες & δωροκάρτες', plansText: 'Κάρτες πολλών επισκέψεων, δωροκάρτες και νυφικά πακέτα.', attention: 'Κάρτες που τελειώνουν' },
  barber: { team: 'Barbers', plans: 'Συνδρομές', plansText: 'Σταθερό κούρεμα κάθε μήνα σε καλύτερη τιμή.', attention: 'Συνδρομές που λήγουν' },
  nails: { team: 'Τεχνίτριες', plans: 'Κάρτες περιποίησης', plansText: 'Κάρτες μανικιούρ, συνδυασμοί και δωροκάρτες.', attention: 'Κάρτες που τελειώνουν' },
  beauty: { team: 'Αισθητικοί', plans: 'Πακέτα θεραπειών' },
  massage_spa: { team: 'Θεραπευτές', plans: 'Πακέτα & δωροκάρτες' },
  personal_training: { team: 'Η ομάδα', solo: 'Προπονείς μόνος σου', clients: 'Αθλούμενοι', plans: 'Πακέτα προπονήσεων',
    plansText: 'Μηνιαία πακέτα, online πρόγραμμα και δωρεάν πρώτη γνωριμία.', attention: 'Πακέτα που τελειώνουν' },
  gym: { team: 'Προπονητές', clients: 'Μέλη', plans: 'Συνδρομές', plansText: 'Μηνιαίες, τρίμηνες και ετήσιες συνδρομές ή κάρτα εισόδων.',
    attention: 'Συνδρομές που λήγουν', classes: true },
  pilates_yoga: { team: 'Εκπαιδευτές', clients: 'Μέλη', plans: 'Πακέτα μαθημάτων', plansText: 'Πακέτα 4, 8 ή 12 μαθημάτων με ημερομηνία λήξης.',
    attention: 'Πακέτα που τελειώνουν', classes: true },
  physio: { team: 'Θεραπευτές', clients: 'Ασθενείς', plans: 'Πακέτα συνεδριών', plansText: 'Πακέτα συνεδριών με ή χωρίς παραπεμπτικό.',
    attention: 'Θεραπείες που τελειώνουν' },
  medical: { team: 'Γιατροί', clients: 'Ασθενείς', plans: 'Πακέτα εξετάσεων' },
  dental: { team: 'Οδοντίατροι', clients: 'Ασθενείς', plans: 'Σχέδια θεραπείας' },
  tattoo: { team: 'Καλλιτέχνες', plans: 'Προκαταβολές & δωροκάρτες', plansText: 'Η προκαταβολή κρατά την ώρα και αφαιρείται από την τελική τιμή.',
    attention: 'Εκκρεμότητες' },
};

export const kindOf = (category?: string | null): Kind => ({ ...base, ...(K[category ?? ''] ?? {}) });

export const PLAN_KIND: Record<string, string> = { pack: 'Πακέτο', sub: 'Συνδρομή', card: 'Κάρτα', deposit: 'Προκαταβολή' };
