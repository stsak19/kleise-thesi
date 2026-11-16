/* Πώς δουλεύουν οι υπηρεσίες σε κάθε είδος καταστήματος.
   Ένα κουρείο έχει ραντεβού (ένας πελάτης, διάρκεια, ποιος το κάνει), ένα γυμναστήριο μαθήματα (θέσεις, εβδομαδιαίο πρόγραμμα),
   ένας personal trainer συνεδρίες (ένας-ένας, ζευγάρι, μικρή ομάδα), ένα ιατρείο είδη επίσκεψης (αμοιβή ή «κατόπιν εκτίμησης»).
   Η οθόνη Υπηρεσίες και ο οδηγός «Νέα επιχείρηση» παίρνουν από εδώ λέξεις, επιλογές και ομάδες. */
import type { Svc } from './save';

export type SvcMode = 'appt' | 'class' | 'session' | 'visit';

export type SvcKind = {
  mode: SvcMode;
  title: string;          // τίτλος οθόνης: «Υπηρεσίες», «Μαθήματα», «Συνεδρίες», «Είδη επίσκεψης»
  one: string;            // μία: «υπηρεσία», «μάθημα»…
  many: string;           // πολλές, σε πλάγια πτώση: «υπηρεσίες», «μαθήματα»…
  add: string;            // κουμπί: «Νέα υπηρεσία»
  badge: string;          // μία γραμμή στο παράθυρο επεξεργασίας: τι είναι αυτό που φτιάχνεις
  hint: string;           // παράδειγμα ονόματος
  durs: number[];         // διάρκειες σε κουμπιά
  durLabel: string;       // ερώτηση διάρκειας
  priceLabel: string;
  noPrice: string;        // τι γράφει η κάρτα όταν δεν έχει τιμή
  people: string;         // ποιος την κάνει: «Ποιος την κάνει;», «Προπονητές», «Γιατρός»
  groups: string[];       // προτεινόμενες ομάδες
  guess: (s: Svc) => string; // ομάδα όταν ο ιδιοκτήτης δεν έχει διαλέξει
  sizes?: { v: number; label: string }[]; // συνεδρίες: πόσα άτομα
  fromPrice?: boolean;    // επιτρέπεται «από …€»
  note?: string;          // ετικέτα για οδηγία προς τον πελάτη
};

const by = (rules: [string, RegExp][], fallback: string) => (s: Svc) => {
  const n = s.name.toLowerCase();
  return rules.find(([, re]) => re.test(n))?.[0] ?? fallback;
};

const APPT: SvcKind = {
  mode: 'appt', title: 'Υπηρεσίες', one: 'υπηρεσία', many: 'υπηρεσίες', add: 'Νέα υπηρεσία',
  badge: 'Ραντεβού · ένας πελάτης τη φορά', hint: 'π.χ. Κούρεμα', durs: [15, 30, 45, 60, 90, 120, 150, 180],
  durLabel: 'Πόσο διαρκεί;', priceLabel: 'Τιμή', noPrice: 'Κατόπιν συνεννόησης', people: 'Ποιος την κάνει;',
  groups: ['Υπηρεσίες'], guess: () => 'Υπηρεσίες', fromPrice: true,
};

const CLASS: SvcKind = {
  mode: 'class', title: 'Μαθήματα', one: 'μάθημα', many: 'μαθήματα', add: 'Νέο μάθημα',
  badge: 'Ομαδικό μάθημα · με θέσεις και πρόγραμμα', hint: 'π.χ. Cross Training', durs: [30, 45, 50, 60, 75, 90],
  durLabel: 'Διάρκεια', priceLabel: 'Τιμή μεμονωμένου μαθήματος', noPrice: 'Με συνδρομή', people: 'Προπονητές',
  groups: ['Ομαδικά μαθήματα', 'Ατομικές προπονήσεις'],
  guess: (s) => ((+s.capacity || 1) > 1 ? 'Ομαδικά μαθήματα' : 'Ατομικές προπονήσεις'),
};

const SESSION: SvcKind = {
  mode: 'session', title: 'Συνεδρίες', one: 'συνεδρία', many: 'συνεδρίες', add: 'Νέα συνεδρία',
  badge: 'Συνεδρία · ένας-ένας ή μικρή ομάδα', hint: 'π.χ. Ατομική προπόνηση', durs: [30, 45, 60, 75, 90],
  durLabel: 'Διάρκεια', priceLabel: 'Τιμή συνεδρίας', noPrice: 'Δωρεάν', people: 'Ποιος την κάνει;',
  groups: ['Προπονήσεις', 'Γνωριμία', 'Online'],
  guess: by([['Γνωριμία', /αξιολόγ|γνωριμ|μετρήσ/], ['Online', /online|κλήση|βίντεο/]], 'Προπονήσεις'),
  sizes: [{ v: 1, label: '👤 Ένας-ένας' }, { v: 2, label: '👥 Ζευγάρι' }, { v: 4, label: 'Μικρή ομάδα (έως 4)' }],
};

const VISIT: SvcKind = {
  mode: 'visit', title: 'Είδη επίσκεψης', one: 'είδος επίσκεψης', many: 'είδη επίσκεψης', add: 'Νέο είδος επίσκεψης',
  badge: 'Είδος επίσκεψης', hint: 'π.χ. Πρώτη επίσκεψη', durs: [10, 15, 20, 30, 45, 60],
  durLabel: 'Πόσο χρόνο να κρατάει το ραντεβού;', priceLabel: 'Αμοιβή', noPrice: 'Κατόπιν εκτίμησης', people: 'Γιατρός',
  groups: ['Επισκέψεις', 'Εξετάσεις'], guess: () => 'Επισκέψεις', note: 'Οδηγία προς τον ασθενή',
};

const K: Record<string, SvcKind> = {
  hair: { ...APPT, groups: ['Κούρεμα', 'Χρώμα', 'Χτένισμα', 'Θεραπείες'],
    guess: by([['Χρώμα', /βαφ|χρώμ|ανταύγ|balay|ombre|μες/], ['Χτένισμα', /χτέν|πιστολ|updo|νυφ/], ['Θεραπείες', /θεραπ|κερατ|botox|μάσκ/]], 'Κούρεμα') },
  barber: { ...APPT, hint: 'π.χ. Κούρεμα + γένια', groups: ['Κούρεμα', 'Γένια', 'Περιποίηση'],
    guess: by([['Γένια', /γένι|ξύρισ|beard/], ['Κούρεμα', /κούρ|fade|cut/]], 'Περιποίηση') },
  nails: { ...APPT, hint: 'π.χ. Ημιμόνιμο χέρια', people: 'Ποια την κάνει;', groups: ['Χέρια', 'Πόδια', 'Τεχνητά νύχια', 'Άλλα'],
    guess: by([['Τεχνητά νύχια', /τεχνητ|gel|ακρυλ|τζελ|χτίσιμο/], ['Πόδια', /πόδι|πεντικ|pedi/], ['Χέρια', /χέρι|μανικ|mani|ημιμόν/]], 'Άλλα') },
  beauty: { ...APPT, hint: 'π.χ. Καθαρισμός προσώπου', groups: ['Πρόσωπο', 'Αποτρίχωση', 'Φρύδια & βλεφαρίδες', 'Σώμα'],
    guess: by([['Αποτρίχωση', /αποτρίχ|wax|laser|κερί/], ['Φρύδια & βλεφαρίδες', /φρύδ|βλεφαρ|lash|brow/], ['Πρόσωπο', /πρόσωπ|face|peel|μάσκ/]], 'Σώμα') },
  massage_spa: { ...APPT, hint: 'π.χ. Μασάζ σώματος', durs: [30, 45, 60, 75, 90, 120], groups: ['Μασάζ', 'Θεραπείες'],
    guess: by([['Μασάζ', /μασάζ|massage|stone|πλάτη|αυχέν/]], 'Θεραπείες') },
  tattoo: { ...APPT, hint: 'π.χ. Μικρό tattoo', durs: [30, 60, 120, 180, 240, 360], groups: ['Tattoo', 'Συναντήσεις', 'Piercing'], noPrice: 'Κατόπιν εκτίμησης',
    guess: by([['Συναντήσεις', /συνάντ|σχέδι|consult/], ['Piercing', /piercing|τρύπημα/]], 'Tattoo'), note: 'Τι να ξέρει ο πελάτης' },
  gym: CLASS,
  pilates_yoga: { ...CLASS, hint: 'π.χ. Reformer', groups: ['Μαθήματα', 'Ιδιαίτερα'], people: 'Εκπαιδευτές',
    guess: (s) => ((+s.capacity || 1) > 1 ? 'Μαθήματα' : 'Ιδιαίτερα') },
  personal_training: SESSION,
  physio: { ...SESSION, badge: 'Συνεδρία με θεραπευτή', hint: 'π.χ. Συνεδρία φυσικοθεραπείας', groups: ['Θεραπείες', 'Αξιολόγηση'], noPrice: 'Κατόπιν εκτίμησης', sizes: undefined,
    guess: by([['Αξιολόγηση', /αξιολόγ|εκτίμ/]], 'Θεραπείες'), people: 'Θεραπευτής', note: 'Οδηγία προς τον ασθενή' },
  medical: { ...VISIT, groups: ['Επισκέψεις', 'Εξετάσεις', 'Συνταγές & έγγραφα'],
    guess: by([['Συνταγές & έγγραφα', /συνταγ|πιστοποιητ|βεβαίω/], ['Εξετάσεις', /check|υπέρηχ|holter|καρδιογρ|σπιρομ|εξετάσεις/]], 'Επισκέψεις') },
  dental: { ...VISIT, people: 'Οδοντίατρος', hint: 'π.χ. Έλεγχος & καθαρισμός', groups: ['Έλεγχος', 'Θεραπείες', 'Αισθητική'],
    guess: by([['Έλεγχος', /έλεγχ|καθαρισ|εξέτασ|ακτινογρ/], ['Αισθητική', /λεύκαν|όψεις|αισθητ/]], 'Θεραπείες') },
};

export const svcKind = (category?: string | null): SvcKind => K[category ?? ''] ?? APPT;

/* Η ομάδα μιας υπηρεσίας: ό,τι διάλεξε ο ιδιοκτήτης, αλλιώς μια λογική πρόταση από το όνομα. */
export const groupOf = (k: SvcKind, s: Svc) => (s.grp && s.grp.trim()) || k.guess(s);

/* Οι υπηρεσίες σε ομάδες, με τη σειρά των προτεινόμενων ομάδων και μετά όσες έφτιαξε ο ιδιοκτήτης. */
export function grouped(k: SvcKind, list: Svc[]) {
  const m = new Map<string, Svc[]>();
  k.groups.forEach((g) => m.set(g, []));
  list.forEach((s) => { const g = groupOf(k, s); if (!m.has(g)) m.set(g, []); m.get(g)!.push(s); });
  return [...m.entries()].filter(([, v]) => v.length).map(([name, items]) => ({ name, items }));
}

export const durText = (m: number) => (m >= 60 ? (m % 60 ? `${Math.floor(m / 60)}ω ${m % 60}′` : `${m / 60} ${m === 60 ? 'ώρα' : 'ώρες'}`) : `${m}′`);

/* Νέα υπηρεσία με λογικές αρχικές τιμές για το είδος. */
export const blankFor = (k: SvcKind, key: string, grp?: string): Svc => ({
  key, name: '', price: '', grp: grp ?? '',
  duration_min: String(k.mode === 'visit' ? 20 : k.mode === 'class' ? 60 : k.durs.includes(60) ? 60 : k.durs[1]),
  capacity: k.mode === 'class' && (grp ?? k.groups[0]) === k.groups[0] ? '12' : '1',
});
