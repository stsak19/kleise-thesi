/* Η «οθόνη» κάθε είδους επιχείρησης: πώς μοιάζει η σελίδα του καταστήματος για τον πελάτη.
   Η ροή κράτησης (πρόγραμμα / ραντεβού / κατάλογος) έρχεται από τη διάταξη (lib/presets.ts).
   Εδώ ορίζεται η ταυτότητα της σελίδας: κορυφή, σκούρο ή ανοιχτό φόντο, τίτλοι και τα «γρήγορα στοιχεία».
     photo   = μεγάλη φωτογραφία από άκρη σε άκρη με το όνομα πάνω της (γυμναστήριο, κομμωτήριο, spa…)
     profile = στρογγυλή φωτογραφία στη μέση, σαν προφίλ ανθρώπου (personal trainer, φυσικοθεραπευτής)
     clinic  = ήρεμη λευκή κορυφή με κάρτα ιατρείου, χωρίς μεγάλη φωτογραφία (ιατρείο, οδοντίατρος)
     night   = σκούρα σελίδα με τιμοκατάλογο (κουρείο, tattoo) */

export type Hero = 'photo' | 'profile' | 'clinic' | 'night';
export type Fact = 'open' | 'from' | 'count' | 'group' | 'duration';
export type BizScreen = {
  hero: Hero;
  kicker: string;     // μικρή γραμμή πάνω από το όνομα
  services: string;   // τίτλος λίστας υπηρεσιών
  times: string;      // τίτλος ωρών
  cta: string;        // κουμπί κράτησης
  facts: Fact[];
  unit: string;       // πώς λέγεται μία υπηρεσία (για το «N …»)
};

const S: Record<string, BizScreen> = {
  gym:               { hero: 'photo',   kicker: 'Γυμναστήριο',       services: 'Τμήματα',               times: 'Πρόγραμμα ημέρας',   cta: 'Κράτηση θέσης',      facts: ['open', 'count', 'group'], unit: 'τμήματα' },
  pilates_yoga:      { hero: 'photo',   kicker: 'Studio',            services: 'Μαθήματα',              times: 'Πρόγραμμα ημέρας',   cta: 'Κράτηση θέσης',      facts: ['open', 'group', 'from'], unit: 'μαθήματα' },
  personal_training: { hero: 'profile', kicker: 'Personal trainer',  services: 'Προπονήσεις',           times: 'Ελεύθερες ώρες',     cta: 'Κλείσε προπόνηση',   facts: ['from', 'duration', 'open'], unit: 'προπονήσεις' },
  physio:            { hero: 'profile', kicker: 'Φυσικοθεραπευτήριο', services: 'Συνεδρίες',            times: 'Ελεύθερες ώρες',     cta: 'Κλείσε συνεδρία',    facts: ['open', 'duration', 'from'], unit: 'συνεδρίες' },
  medical:           { hero: 'clinic',  kicker: 'Ιατρείο',           services: 'Είδος επίσκεψης',       times: 'Ελεύθερα ραντεβού',  cta: 'Κλείσε ραντεβού',    facts: ['open', 'duration', 'from'], unit: 'είδη επίσκεψης' },
  dental:            { hero: 'clinic',  kicker: 'Οδοντιατρείο',      services: 'Θεραπείες',             times: 'Ελεύθερα ραντεβού',  cta: 'Κλείσε ραντεβού',    facts: ['open', 'duration', 'from'], unit: 'θεραπείες' },
  hair:              { hero: 'photo',   kicker: 'Κομμωτήριο',        services: 'Υπηρεσίες',             times: 'Διάλεξε ώρα',        cta: 'Κλείσε ραντεβού',    facts: ['from', 'count', 'open'], unit: 'υπηρεσίες' },
  nails:             { hero: 'photo',   kicker: 'Nail studio',       services: 'Περιποιήσεις',          times: 'Διάλεξε ώρα',        cta: 'Κλείσε ραντεβού',    facts: ['from', 'count', 'open'], unit: 'περιποιήσεις' },
  beauty:            { hero: 'photo',   kicker: 'Αισθητική',         services: 'Θεραπείες',             times: 'Διάλεξε ώρα',        cta: 'Κλείσε ραντεβού',    facts: ['from', 'count', 'open'], unit: 'θεραπείες' },
  massage_spa:       { hero: 'photo',   kicker: 'Spa',               services: 'Μασάζ & θεραπείες',     times: 'Διάλεξε ώρα',        cta: 'Κλείσε ραντεβού',    facts: ['from', 'duration', 'open'], unit: 'θεραπείες' },
  barber:            { hero: 'night',   kicker: 'Barber shop',       services: 'Τιμοκατάλογος',         times: 'Ελεύθερες ώρες'    , cta: 'Κλείσε ραντεβού',    facts: ['from', 'duration', 'open'], unit: 'υπηρεσίες' },
  tattoo:            { hero: 'night',   kicker: 'Tattoo studio',     services: 'Συνεδρίες',             times: 'Διαθέσιμες ώρες',    cta: 'Κλείσε συνεδρία',    facts: ['from', 'duration', 'open'], unit: 'συνεδρίες' },
  other:             { hero: 'photo',   kicker: 'Κατάστημα',         services: 'Υπηρεσίες',             times: 'Διάλεξε ώρα',        cta: 'Κλείσε ραντεβού',    facts: ['open', 'from', 'count'], unit: 'υπηρεσίες' },
};
export const screenFor = (category?: string | null) => S[category ?? ''] ?? S.other;
