/* Οι επιχειρήσεις που «έχει» ο λογαριασμός χωρίς σύνδεση, μία για κάθε είδος επαγγέλματος.
   Κάθε μία έχει τη δική της δομή: ομάδα, υπηρεσίες, πακέτα/συνδρομές, ωράριο, πελάτες με στοιχεία
   που ταιριάζουν στη δουλειά (συνταγή βαφής, στόχος προπόνησης, διάγνωση, σχέδιο tattoo…).
   Τα δεδομένα των κρατήσεων παράγονται στο lib/demo.ts από αυτές τις περιγραφές. */

export type DStaff = { id: string; name: string; role: string; color: string; days: number[]; bio: string; photo?: string };
export type DService = { id: string; name: string; dur: number; price: number | null; cap?: number; staff?: string[] };
export type DPack = { id: string; name: string; kind: 'pack' | 'sub' | 'card' | 'deposit'; sessions: number | null; days: number | null; price: number; note: string; popular?: boolean };
export type DClass = { service: string; staff: string; days: number[]; time: string };
export type DOwn = {
  id: string;
  staff: DStaff[];
  services: DService[];
  hours: [number[], [string, string][]][];
  classes?: DClass[];
  packs: DPack[];
  clients: number;                                     // πόσοι πελάτες από τη λίστα ονομάτων
  fields: (i: number, staff: DStaff[]) => [string, string][];
  packFor?: (i: number) => { pack: string; left: number; total: number; days: number } | null;
  tags?: Record<number, string>;
  notes?: Record<number, string>;
  pending?: { name: string; phone: string; note?: string }[];
  busy?: number;                                        // πόσο γεμάτο είναι το πρόγραμμα (0–1)
};

const ph = (id: string) => `https://images.unsplash.com/${id}?w=200&h=200&fit=crop&crop=faces&q=70&auto=format`;
const at = <T,>(list: T[], i: number) => list[i % list.length];
const WK = [1, 2, 3, 4, 5], MS = [1, 2, 3, 4, 5, 6], TS = [2, 3, 4, 5, 6];

export const NAMES = [
  'Μαρία Παπαδάκη', 'Γιώργος Κωνσταντίνου', 'Ελένη Δημητρίου', 'Νίκος Αλεξίου', 'Σοφία Μιχαήλ', 'Κατερίνα Λάμπρου', 'Δημήτρης Ρήγας', 'Άννα Βλάχου',
  'Ιωάννα Σταύρου', 'Παναγιώτης Γεωργίου', 'Δέσποινα Καραλή', 'Αλέξανδρος Μαυρίδης', 'Βασιλική Τσολάκη', 'Στέλιος Πετρίδης', 'Χρύσα Οικονόμου', 'Θοδωρής Ζαχαρίου',
  'Ευαγγελία Ράπτη', 'Μιχάλης Σιδηρόπουλος', 'Αθηνά Κυριακίδου', 'Κώστας Μπαλτάς', 'Φωτεινή Αθανασίου', 'Λευτέρης Χατζής', 'Ειρήνη Παππά', 'Σπύρος Νικολαΐδης',
  'Αγγελική Ζερβού', 'Πέτρος Αναστασίου', 'Μαρίνα Τζιόλα', 'Ηλίας Καλογεράκης', 'Ζωή Μανωλάκη', 'Άρης Βασιλείου', 'Νεφέλη Χριστοδούλου', 'Χάρης Σαββίδης',
  'Δανάη Κοντού', 'Γιάννης Φραγκιαδάκης', 'Ραφαέλα Ιωαννίδου', 'Τάσος Λιάπης', 'Μυρτώ Αντωνιάδη', 'Βαγγέλης Πανάγου', 'Λίνα Μαργαρίτη', 'Αντώνης Δούκας',
  'Έφη Καλαμαρά', 'Μάριος Τσακίρης', 'Στέλλα Γαλάνη', 'Ορέστης Παυλίδης', 'Ναταλία Ρούσσου', 'Φίλιππος Μελάς', 'Κωνσταντίνα Ζαφειρίου', 'Λάμπρος Σπανός',
  'Τζένη Αλεξανδροπούλου', 'Ανδρέας Κουτσούκος', 'Ελπίδα Μπότση', 'Σάκης Δεληγιάννης', 'Ρένα Καρρά', 'Μανώλης Ξενάκης', 'Χαρά Σταματοπούλου', 'Μιλτιάδης Κόκκινος',
];

export const OWN: DOwn[] = [
  /* ---------- Κομμωτήριο με τρία άτομα ---------- */
  {
    id: 'b-eleni', clients: 42, busy: 0.72,
    staff: [
      { id: 'st-eleni', name: 'Ελένη Καραγιάννη', role: 'Ιδιοκτήτρια · χρώμα', color: '#8a5a64', days: TS, bio: '15 χρόνια στο χρώμα, ανταύγειες balayage και διορθώσεις.', photo: ph('photo-1580489944761-15a19d654956') },
      { id: 'st-maria', name: 'Μαρία Τσιρίγου', role: 'Κομμώτρια · χτενίσματα', color: '#5a6f8a', days: [2, 3, 4, 5, 6], bio: 'Κουρέματα, νυφικά και βραδινά χτενίσματα.', photo: ph('photo-1544005313-94ddf0286df2') },
      { id: 'st-dimitris', name: 'Δημήτρης Λαζαρίδης', role: 'Ανδρικά κουρέματα', color: '#4f6b5a', days: [3, 4, 5, 6], bio: 'Ανδρικά, fade και περιποίηση γενειάδας.', photo: ph('photo-1506794778202-cad84cf45f1d') },
    ],
    services: [
      { id: 's-cut', name: 'Γυναικείο κούρεμα', dur: 45, price: 22, staff: ['st-eleni', 'st-maria'] },
      { id: 's-mcut', name: 'Ανδρικό κούρεμα', dur: 30, price: 14, staff: ['st-dimitris', 'st-maria'] },
      { id: 's-color', name: 'Βαφή ρίζας', dur: 90, price: 40, staff: ['st-eleni'] },
      { id: 's-balay', name: 'Ανταύγειες / balayage', dur: 150, price: 95, staff: ['st-eleni'] },
      { id: 's-blow', name: 'Χτένισμα (πιστολάκι)', dur: 30, price: 15, staff: ['st-maria', 'st-eleni'] },
      { id: 's-updo', name: 'Βραδινό χτένισμα', dur: 60, price: 35, staff: ['st-maria'] },
      { id: 's-kera', name: 'Θεραπεία κερατίνης', dur: 120, price: 80, staff: ['st-eleni', 'st-maria'] },
    ],
    hours: [[TS, [['09:00', '14:00'], ['17:00', '21:00']]]],
    packs: [
      { id: 'pk-e1', name: 'Κάρτα 5 χτενισμάτων', kind: 'card', sessions: 5, days: 90, price: 65, note: 'Το 5ο σχεδόν δώρο · ισχύει 3 μήνες' },
      { id: 'pk-e2', name: 'Δωροκάρτα 50€', kind: 'card', sessions: null, days: 365, price: 50, note: 'Για οποιαδήποτε υπηρεσία', popular: true },
      { id: 'pk-e3', name: 'Νυφικό πακέτο', kind: 'pack', sessions: 2, days: 60, price: 140, note: 'Δοκιμή + ημέρα γάμου, μαζί με μακιγιάζ' },
    ],
    fields: (i, st) => [
      ['Κομμώτρια', at(st, i).name.split(' ')[0]],
      ['Χρώμα', at(['7.1 + 6% οξυζενέ', '6.3 ζεστό καφέ', 'Φυσικό, χωρίς βαφή', '5.0 κάλυψη λευκών', '9.1 ξανθό σταχτί', 'Balayage μελί'], i)],
      ['Μαλλιά', at(['Λεπτά, ίσια', 'Σγουρά, πυκνά', 'Κυματιστά', 'Πολύ λεπτά, πέφτουν', 'Χοντρά, ατίθασα'], i)],
    ],
    packFor: (i) => (i % 7 === 2 ? { pack: 'Κάρτα 5 χτενισμάτων', left: (i % 4) + 1, total: 5, days: 20 + i } : null),
    tags: { 0: 'VIP', 3: 'Κάθε 4 εβδομάδες', 7: 'Νυφικό 14/12', 11: 'Από σύσταση', 15: 'VIP' },
    notes: { 0: 'Πίνει καφέ σκέτο. Θέλει πάντα την Ελένη.', 7: 'Γάμος 14 Δεκεμβρίου, δοκιμή χτενίσματος πριν.', 11: 'Ήρθε από σύσταση της Μαρίας Π.' },
    pending: [{ name: 'Βασίλης Νικολάου', phone: '6977123456' }, { name: 'Χριστίνα Ιωάννου', phone: '6944987654' }],
  },

  /* ---------- Personal trainer, μόνος του ---------- */
  {
    id: 'b-pt', clients: 16, busy: 0.6,
    staff: [{ id: 'st-kostas', name: 'Κώστας Μαργαρίτης', role: 'Personal trainer · NASM', color: '#7a5236', days: MS, bio: 'Δύναμη, απώλεια βάρους, αποκατάσταση μετά από τραυματισμό.', photo: ph('photo-1567013127542-490d757e51fc') }],
    services: [
      { id: 's-pt', name: 'Ατομική προπόνηση', dur: 60, price: 30 },
      { id: 's-duo', name: 'Προπόνηση για δύο', dur: 60, price: 40, cap: 2 },
      { id: 's-eval', name: 'Αξιολόγηση & μετρήσεις', dur: 30, price: null },
      { id: 's-online', name: 'Online κλήση προγράμματος', dur: 30, price: 15 },
    ],
    hours: [[MS, [['07:00', '12:00'], ['16:00', '21:00']]]],
    packs: [
      { id: 'pk-p1', name: '8 προπονήσεις / μήνα', kind: 'pack', sessions: 8, days: 30, price: 200, note: '2 φορές την εβδομάδα · 25€ η προπόνηση', popular: true },
      { id: 'pk-p2', name: '12 προπονήσεις / μήνα', kind: 'pack', sessions: 12, days: 30, price: 270, note: '3 φορές την εβδομάδα · 22,5€ η προπόνηση' },
      { id: 'pk-p3', name: 'Online πρόγραμμα', kind: 'sub', sessions: null, days: 30, price: 45, note: 'Πρόγραμμα στο κινητό + μία κλήση την εβδομάδα' },
      { id: 'pk-p4', name: 'Πρώτη γνωριμία', kind: 'pack', sessions: 1, days: 14, price: 0, note: 'Αξιολόγηση και δοκιμαστική προπόνηση δωρεάν' },
    ],
    fields: (i) => [
      ['Στόχος', at(['Απώλεια βάρους', 'Δύναμη και μυϊκή μάζα', 'Αγώνας 10 χλμ τον Μάρτιο', 'Αποκατάσταση μέσης', 'Γενική φυσική κατάσταση', 'Προετοιμασία για Σχολή'], i)],
      ['Πρόοδος', at(['82 → 76,5 κιλά', 'Squat 60 → 90 κιλά', '10 χλμ σε 58΄', 'Χωρίς πόνο 3 εβδομάδες', 'Λίπος 28% → 23%', 'Έλξεις 2 → 9'], i)],
      ['Υγεία', at(['Χωρίς θέματα', 'Πόνος στο αριστερό γόνατο', 'Υπέρταση, με φάρμακα', 'Δισκοκήλη Ο4–Ο5', 'Χωρίς θέματα', 'Άσθμα ήπιο'], i)],
      ['Πρόγραμμα', at(['Πλήρες σώμα 2×', 'Πάνω/κάτω 3×', 'Τρέξιμο + δύναμη', 'Κινητικότητα 2×'], i)],
    ],
    packFor: (i) => (i % 5 === 4 ? { pack: 'Online πρόγραμμα', left: 0, total: 0, days: 9 + i } : { pack: i % 3 ? '8 προπονήσεις / μήνα' : '12 προπονήσεις / μήνα', left: [1, 5, 2, 7, 0, 3, 6, 1][i % 8], total: i % 3 ? 8 : 12, days: [4, 19, 2, 25, 1, 12, 22, 6][i % 8] }),
    tags: { 0: 'Από 2024', 2: 'Αγώνας Μαρτίου', 5: 'Πρωινές ώρες' },
    notes: { 0: 'Προτιμά πρωινές ώρες πριν τη δουλειά.', 3: 'Όχι άλματα μέχρι νεωτέρας, οδηγία φυσικοθεραπευτή.' },
    pending: [{ name: 'Ραφαήλ Δρόσος', phone: '6981234567', note: 'Θέλει να χάσει 10 κιλά ως το καλοκαίρι' }, { name: 'Ιφιγένεια Λάλου', phone: '6932112233', note: 'Ζήτησε δοκιμαστική προπόνηση' }],
  },

  /* ---------- Νυχάδικο με δύο τεχνίτριες ---------- */
  {
    id: 'b-niki', clients: 34, busy: 0.7,
    staff: [
      { id: 'st-niki', name: 'Νίκη Αποστόλου', role: 'Ιδιοκτήτρια · nail art', color: '#8a5a64', days: MS, bio: 'Nail art, chrome και γαλλικό με λεπτομέρεια.', photo: ph('photo-1508214751196-bcfd4ca60f91') },
      { id: 'st-ioanna', name: 'Ιωάννα Μπέη', role: 'Τεχνίτρια · πεντικιούρ', color: '#6b5b73', days: [2, 3, 4, 5, 6], bio: 'Spa πεντικιούρ και θεραπείες ποδιών.', photo: ph('photo-1534528741775-53994a69daeb') },
    ],
    services: [
      { id: 's-mani', name: 'Ημιμόνιμο χέρια', dur: 60, price: 20 },
      { id: 's-gel', name: 'Τεχνητά νύχια gel', dur: 90, price: 35, staff: ['st-niki'] },
      { id: 's-fill', name: 'Συντήρηση gel', dur: 75, price: 28, staff: ['st-niki'] },
      { id: 's-pedi', name: 'Spa πεντικιούρ', dur: 60, price: 25, staff: ['st-ioanna', 'st-niki'] },
      { id: 's-pedis', name: 'Ημιμόνιμο πόδια', dur: 45, price: 18 },
      { id: 's-art', name: 'Nail art (όλα τα νύχια)', dur: 20, price: 8, staff: ['st-niki'] },
      { id: 's-off', name: 'Αφαίρεση', dur: 15, price: 5 },
    ],
    hours: [[MS, [['10:00', '20:00']]]],
    packs: [
      { id: 'pk-n1', name: 'Κάρτα 5 μανικιούρ', kind: 'card', sessions: 5, days: 120, price: 90, note: 'Γλιτώνεις 10€', popular: true },
      { id: 'pk-n2', name: 'Χέρια + πόδια', kind: 'pack', sessions: 1, days: null, price: 40, note: 'Ημιμόνιμο χέρια και spa πεντικιούρ μαζί' },
      { id: 'pk-n3', name: 'Δωροκάρτα', kind: 'card', sessions: null, days: 180, price: 30, note: 'Σε όποιο ποσό θέλεις' },
    ],
    fields: (i, st) => [
      ['Τεχνίτρια', at(st, i).name.split(' ')[0]],
      ['Σχήμα', at(['Αμύγδαλο, μεσαίο', 'Τετράγωνο κοντό', 'Οβάλ', 'Coffin μακρύ', 'Στρογγυλό φυσικό'], i)],
      ['Αγαπημένα', at(['Nude, γαλακτερό', 'Γαλλικό', 'Κόκκινο κλασικό', 'Chrome ασημί', 'Παστέλ', 'Μαύρο ματ'], i)],
      ['Προσοχή', at(['—', '—', 'Ευαισθησία στο gel', '—', 'Δεν κόβουμε επωνυχίδια', '—'], i)],
    ],
    packFor: (i) => (i % 6 === 1 ? { pack: 'Κάρτα 5 μανικιούρ', left: (i % 5) + 1, total: 5, days: 30 + i * 2 } : null),
    tags: { 1: 'Κάθε 3 εβδομάδες', 4: 'VIP', 9: 'Nail art' },
    notes: { 4: 'Φέρνει δικά της σχέδια από Instagram, κράτα 20΄ παραπάνω.' },
  },

  /* ---------- Γυμναστήριο με τμήματα ---------- */
  {
    id: 'b-fit', clients: 56, busy: 0.8,
    staff: [
      { id: 'st-alex', name: 'Αλέξης Ντόκος', role: 'Head coach · cross training', color: '#2f5d50', days: WK, bio: 'CrossFit L2, 10 χρόνια προπονητής.', photo: ph('photo-1500648767791-00dcc994a43e') },
      { id: 'st-dora', name: 'Δώρα Σπανού', role: 'Spinning · HIIT', color: '#8a5a3a', days: [1, 2, 3, 4, 5, 6], bio: 'Ενέργεια, μουσική και πολύ ιδρώτας.', photo: ph('photo-1438761681033-6461ffad8d80') },
      { id: 'st-mixalis', name: 'Μιχάλης Ρούσσος', role: 'Boxing · functional', color: '#3a4a6b', days: [1, 3, 5], bio: 'Πρώην αθλητής πυγμαχίας.', photo: ph('photo-1472099645785-5658abf4ff4e') },
      { id: 'st-lena', name: 'Λένα Χατζή', role: 'Yoga · mobility', color: '#6b5b73', days: [2, 4, 6], bio: 'Vinyasa και κινητικότητα για αθλητές.', photo: ph('photo-1544005313-94ddf0286df2') },
    ],
    services: [
      { id: 's-cross', name: 'Cross Training', dur: 60, price: null, cap: 12 },
      { id: 's-spin', name: 'Spinning', dur: 45, price: null, cap: 14 },
      { id: 's-hiit', name: 'HIIT', dur: 45, price: null, cap: 16 },
      { id: 's-box', name: 'Boxing', dur: 60, price: null, cap: 10 },
      { id: 's-func', name: 'Functional', dur: 60, price: null, cap: 12 },
      { id: 's-gyoga', name: 'Yoga', dur: 60, price: null, cap: 15 },
    ],
    hours: [[WK, [['07:00', '22:00']]], [[6], [['09:00', '14:00']]]],
    classes: [
      { service: 's-cross', staff: 'st-alex', days: WK, time: '07:00' },
      { service: 's-cross', staff: 'st-alex', days: WK, time: '09:00' },
      { service: 's-spin', staff: 'st-dora', days: [1, 3, 5], time: '08:15' },
      { service: 's-func', staff: 'st-mixalis', days: [1, 3, 5], time: '10:30' },
      { service: 's-gyoga', staff: 'st-lena', days: [2, 4], time: '10:30' },
      { service: 's-hiit', staff: 'st-dora', days: WK, time: '14:00' },
      { service: 's-spin', staff: 'st-dora', days: WK, time: '18:00' },
      { service: 's-box', staff: 'st-mixalis', days: [1, 3, 5], time: '19:00' },
      { service: 's-cross', staff: 'st-alex', days: WK, time: '19:00' },
      { service: 's-gyoga', staff: 'st-lena', days: [2, 4], time: '20:15' },
      { service: 's-cross', staff: 'st-alex', days: [6], time: '10:00' },
      { service: 's-gyoga', staff: 'st-lena', days: [6], time: '11:30' },
    ],
    packs: [
      { id: 'pk-f1', name: 'Μηνιαία συνδρομή', kind: 'sub', sessions: null, days: 30, price: 45, note: 'Απεριόριστα τμήματα και ελεύθερο', popular: true },
      { id: 'pk-f2', name: 'Τρίμηνη συνδρομή', kind: 'sub', sessions: null, days: 90, price: 120, note: '40€ τον μήνα' },
      { id: 'pk-f3', name: 'Ετήσια συνδρομή', kind: 'sub', sessions: null, days: 365, price: 390, note: 'Με πάγωμα έως 30 μέρες' },
      { id: 'pk-f4', name: '10 είσοδοι', kind: 'pack', sessions: 10, days: 60, price: 60, note: 'Για όσους έρχονται πότε πότε' },
      { id: 'pk-f5', name: 'Φοιτητική', kind: 'sub', sessions: null, days: 30, price: 35, note: 'Με πάσο' },
    ],
    fields: (i) => [
      ['Αγαπημένο τμήμα', at(['Cross Training', 'Spinning', 'Boxing', 'HIIT', 'Yoga', 'Functional'], i)],
      ['Είσοδοι τον μήνα', String(at([14, 9, 4, 18, 11, 6, 21, 2], i))],
      ['Ιατρική βεβαίωση', at(['Ισχύει έως 03/2027', 'Λείπει', 'Ισχύει έως 09/2027', 'Ισχύει έως 01/2027'], i)],
    ],
    packFor: (i) => {
      const p = at([['Μηνιαία συνδρομή', 30], ['Τρίμηνη συνδρομή', 90], ['Ετήσια συνδρομή', 365], ['10 είσοδοι', 60], ['Φοιτητική', 30]] as [string, number][], i);
      return p[0] === '10 είσοδοι' ? { pack: p[0], left: (i % 4) + 1, total: 10, days: 12 + i } : { pack: p[0], left: 0, total: 0, days: [3, 18, 6, 27, 1, 44, 12, 200][i % 8] };
    },
    tags: { 0: 'Από το 2019', 6: 'Πάγωμα έως 20/11', 13: 'Φοιτητής' },
    notes: { 6: 'Χειρουργείο στο χέρι, πάγωμα συνδρομής 3 εβδομάδες.' },
  },

  /* ---------- Pilates studio με πακέτα μαθημάτων ---------- */
  {
    id: 'b-zen', clients: 30, busy: 0.85,
    staff: [
      { id: 'st-anna', name: 'Άννα Κοσμίδου', role: 'Ιδιοκτήτρια · reformer', color: '#6b5b73', days: WK, bio: 'Πιστοποίηση STOTT, ειδίκευση σε πρόληψη τραυματισμών.', photo: ph('photo-1487412720507-e7ab37603c6f') },
      { id: 'st-iris', name: 'Ίρις Δημάκη', role: 'Mat pilates · yoga', color: '#3f6b6a', days: [1, 2, 3, 4], bio: 'Hatha yoga και mat για αρχάριους.', photo: ph('photo-1531123897727-8f129e1688ce') },
    ],
    services: [
      { id: 's-ref', name: 'Reformer', dur: 50, price: 15, cap: 6 },
      { id: 's-refp', name: 'Reformer προχωρημένο', dur: 50, price: 15, cap: 6 },
      { id: 's-mat', name: 'Mat pilates', dur: 50, price: 10, cap: 10 },
      { id: 's-yoga', name: 'Yoga', dur: 60, price: 12, cap: 10 },
      { id: 's-prenatal', name: 'Pilates εγκυμοσύνης', dur: 50, price: 15, cap: 5 },
    ],
    hours: [[WK, [['08:00', '13:00'], ['17:00', '21:00']]]],
    classes: [
      { service: 's-ref', staff: 'st-anna', days: WK, time: '08:00' },
      { service: 's-ref', staff: 'st-anna', days: WK, time: '09:00' },
      { service: 's-mat', staff: 'st-iris', days: [1, 3], time: '10:00' },
      { service: 's-prenatal', staff: 'st-anna', days: [2, 4], time: '11:00' },
      { service: 's-ref', staff: 'st-anna', days: WK, time: '18:00' },
      { service: 's-refp', staff: 'st-anna', days: [1, 3, 5], time: '19:00' },
      { service: 's-yoga', staff: 'st-iris', days: [2, 4], time: '19:00' },
      { service: 's-mat', staff: 'st-iris', days: [1, 2, 3, 4], time: '20:00' },
    ],
    packs: [
      { id: 'pk-z1', name: '4 μαθήματα', kind: 'pack', sessions: 4, days: 30, price: 56, note: '14€ το μάθημα' },
      { id: 'pk-z2', name: '8 μαθήματα', kind: 'pack', sessions: 8, days: 30, price: 100, note: '12,5€ το μάθημα', popular: true },
      { id: 'pk-z3', name: '12 μαθήματα', kind: 'pack', sessions: 12, days: 45, price: 135, note: '11,25€ το μάθημα' },
      { id: 'pk-z4', name: 'Δοκιμαστικό', kind: 'pack', sessions: 1, days: 7, price: 10, note: 'Μία φορά ανά πελάτη' },
    ],
    fields: (i) => [
      ['Επίπεδο', at(['Αρχάριο', 'Μέσο', 'Προχωρημένο', 'Μέσο'], i)],
      ['Προσοχή', at(['—', 'Δισκοκήλη Ο5, όχι κάμψεις', 'Εγκυμοσύνη 24 εβδομάδων', '—', 'Χειρουργείο γόνατου 2025', '—'], i)],
      ['Αγαπημένη ώρα', at(['Πρωί 08:00', 'Απόγευμα 18:00', 'Μεσημέρι', 'Βράδυ 20:00'], i)],
    ],
    packFor: (i) => ({ pack: at(['8 μαθήματα', '4 μαθήματα', '12 μαθήματα', '8 μαθήματα'], i), left: at([6, 1, 9, 0, 3, 2, 7, 1], i), total: at([8, 4, 12, 8], i), days: at([18, 3, 30, 1, 11, 5, 24, 2], i) }),
    tags: { 2: 'Εγκυμοσύνη', 5: 'Μόνο πρωινά' },
  },

  /* ---------- Κουρείο με δύο καρέκλες ---------- */
  {
    id: 'b-barber', clients: 38, busy: 0.78,
    staff: [
      { id: 'st-stathis', name: 'Στάθης Μαυρίδης', role: 'Ιδιοκτήτης · fades', color: '#2b2b2e', days: MS, bio: 'Skin fade, κλασικό ψαλίδι, ζεστή πετσέτα.', photo: ph('photo-1500648767791-00dcc994a43e') },
      { id: 'st-giannis', name: 'Γιάννης Κόκκαλης', role: 'Barber', color: '#6b4a2b', days: [2, 3, 4, 5, 6], bio: 'Μοντέρνα κουρέματα και σχέδια.', photo: ph('photo-1507003211169-0a1dd7228f2d') },
    ],
    services: [
      { id: 's-barb', name: 'Κούρεμα + γένια', dur: 45, price: 18 },
      { id: 's-bcut', name: 'Κούρεμα', dur: 30, price: 12 },
      { id: 's-fade', name: 'Skin fade', dur: 40, price: 15 },
      { id: 's-beard', name: 'Γένια με ζεστή πετσέτα', dur: 20, price: 8 },
      { id: 's-kid', name: 'Παιδικό κούρεμα', dur: 20, price: 9 },
    ],
    hours: [[MS, [['09:00', '21:00']]]],
    packs: [
      { id: 'pk-b1', name: 'Μηνιαίο κούρεμα', kind: 'sub', sessions: 2, days: 30, price: 28, note: '2 κουρέματα + γένια τον μήνα', popular: true },
      { id: 'pk-b2', name: 'Πατέρας + γιος', kind: 'pack', sessions: 1, days: null, price: 18, note: 'Δύο κουρέματα μαζί' },
    ],
    fields: (i, st) => [
      ['Barber', at(st, i).name.split(' ')[0]],
      ['Κούρεμα', at(['Skin fade, 3 εκ. πάνω', 'Ψαλίδι κλασικό', 'Mid fade, χωρίστρα', 'Buzz cut 3mm', 'Crop μπροστά'], i)],
      ['Γένια', at(['Κοντά 3mm', 'Πλήρης περιποίηση', '—', 'Περίγραμμα μόνο'], i)],
    ],
    packFor: (i) => (i % 5 === 0 ? { pack: 'Μηνιαίο κούρεμα', left: i % 3 ? 1 : 2, total: 2, days: 8 + i } : null),
    tags: { 0: 'Κάθε 2 εβδομάδες', 4: 'Έρχεται με τον γιο του' },
  },

  /* ---------- Φυσικοθεραπευτήριο ---------- */
  {
    id: 'b-physio', clients: 24, busy: 0.65,
    staff: [
      { id: 'st-petros', name: 'Πέτρος Αλεξανδρής', role: 'Φυσικοθεραπευτής · αθλητικές κακώσεις', color: '#3d5f78', days: WK, bio: 'MSc αθλητική φυσικοθεραπεία, συνεργάτης ομάδων.', photo: ph('photo-1612349317150-e413f6a5b16d') },
      { id: 'st-katerina', name: 'Κατερίνα Ζήση', role: 'Φυσικοθεραπεύτρια · σπονδυλική στήλη', color: '#3f6a52', days: [1, 2, 4, 5], bio: 'Manual therapy, Mckenzie, κλινικό pilates.', photo: ph('photo-1559839734-2b71ea197ec2') },
    ],
    services: [
      { id: 's-phyeval', name: 'Αρχική αξιολόγηση', dur: 60, price: 40 },
      { id: 's-phy', name: 'Συνεδρία φυσικοθεραπείας', dur: 45, price: 30 },
      { id: 's-manual', name: 'Manual therapy', dur: 45, price: 35 },
      { id: 's-clin', name: 'Κλινικό pilates', dur: 50, price: 25, staff: ['st-katerina'] },
      { id: 's-sport', name: 'Αθλητικό μασάζ', dur: 30, price: 25, staff: ['st-petros'] },
    ],
    hours: [[WK, [['08:00', '15:00'], ['17:00', '21:00']]]],
    packs: [
      { id: 'pk-ph1', name: '10 συνεδρίες', kind: 'pack', sessions: 10, days: 60, price: 260, note: 'Με παραπεμπτικό, 26€ η συνεδρία', popular: true },
      { id: 'pk-ph2', name: '5 συνεδρίες', kind: 'pack', sessions: 5, days: 30, price: 140, note: '28€ η συνεδρία' },
      { id: 'pk-ph3', name: 'Αθλητικό πακέτο', kind: 'sub', sessions: 4, days: 30, price: 90, note: '4 αθλητικά μασάζ τον μήνα' },
    ],
    fields: (i, st) => [
      ['Θεραπευτής', at(st, i).name.split(' ')[0]],
      ['Διάγνωση', at(['Τενοντίτιδα ώμου', 'Οσφυαλγία', 'Μετά από χειρουργείο χιαστού', 'Αυχενικό σύνδρομο', 'Διάστρεμμα ποδοκνημικής', 'Επικονδυλίτιδα'], i)],
      ['Παραπομπή', at(['Δρ. Καραγιάννης, ορθοπαιδικός', 'Χωρίς παραπομπή', 'Δρ. Σωτηρίου, νευροχειρουργός', 'ΕΟΠΥΥ, 10 συνεδρίες'], i)],
      ['Πόνος (0–10)', at(['7 → 3', '5 → 2', '8 → 4', '4 → 1', '6 → 6', '3 → 1'], i)],
    ],
    packFor: (i) => ({ pack: i % 2 ? '10 συνεδρίες' : '5 συνεδρίες', left: at([4, 1, 7, 0, 2, 9], i), total: i % 2 ? 10 : 5, days: at([20, 4, 33, 2, 9, 51], i) }),
    tags: { 2: 'ΕΟΠΥΥ', 4: 'Ποδοσφαιριστής' },
    notes: { 2: 'Επόμενος έλεγχος στον ορθοπαιδικό 28/11, να σταλεί αναφορά.' },
  },

  /* ---------- Tattoo studio ---------- */
  {
    id: 'b-ink', clients: 20, busy: 0.55,
    staff: [
      { id: 'st-nikos', name: 'Νίκος «Ink» Βέργος', role: 'Blackwork · realism', color: '#33383f', days: TS, bio: 'Μεγάλα κομμάτια, μανίκια, realism.', photo: ph('photo-1504593811423-6dd665756598') },
      { id: 'st-sofia', name: 'Σοφία Λιάκου', role: 'Fine line · minimal', color: '#6b5b73', days: [3, 4, 5, 6], bio: 'Λεπτές γραμμές, λουλούδια, γράμματα.', photo: ph('photo-1529626455594-4ff0802cfb7e') },
    ],
    services: [
      { id: 's-consult', name: 'Συνάντηση σχεδίου', dur: 30, price: null },
      { id: 's-tat', name: 'Μικρό tattoo', dur: 120, price: 80 },
      { id: 's-tatm', name: 'Μεσαίο κομμάτι', dur: 180, price: 180 },
      { id: 's-tatl', name: 'Συνεδρία μεγάλου (4 ώρες)', dur: 240, price: 320, staff: ['st-nikos'] },
      { id: 's-touch', name: 'Διόρθωση / touch-up', dur: 60, price: null },
    ],
    hours: [[TS, [['12:00', '20:00']]]],
    packs: [
      { id: 'pk-i1', name: 'Προκαταβολή μικρού', kind: 'deposit', sessions: null, days: null, price: 30, note: 'Κρατά την ώρα· αφαιρείται από την τελική τιμή' },
      { id: 'pk-i2', name: 'Προκαταβολή συνεδρίας', kind: 'deposit', sessions: null, days: null, price: 80, note: 'Για κομμάτια άνω των 3 ωρών', popular: true },
      { id: 'pk-i3', name: 'Δωροκάρτα 100€', kind: 'card', sessions: null, days: 365, price: 100, note: 'Δώρο για tattoo' },
    ],
    fields: (i, st) => [
      ['Καλλιτέχνης', at(st, i).name.split(' ')[0]],
      ['Σχέδιο', at(['Fine line παιώνια στον καρπό', 'Μανίκι blackwork, 3η από 5 συνεδρίες', 'Ημερομηνία με λατινικούς', 'Λύκος realism στον πήχη', 'Μικρό κύμα στον αστράγαλο'], i)],
      ['Προκαταβολή', at(['Πληρώθηκε 80€', 'Εκκρεμεί', 'Πληρώθηκε 30€', '—'], i)],
      ['Δέρμα', at(['Χωρίς αλλεργίες', 'Ευαίσθητο, κοκκινίζει', 'Χωρίς αλλεργίες', 'Αλλεργία στο λάτεξ'], i)],
    ],
    tags: { 1: 'Μανίκι σε εξέλιξη', 3: 'Θέλει realism' },
    notes: { 1: 'Επόμενη συνεδρία σκίαση στον αγκώνα. Φέρε τις φωτογραφίες αναφοράς.' },
    pending: [{ name: 'Μελίνα Ρόκα', phone: '6988776655', note: 'Θέλει fine line στο πλάι, 10 εκ.' }],
  },
];
