/* Αναζήτηση καταστημάτων: κάθε λέξη ψάχνεται στο όνομα, στην πόλη, στη διεύθυνση και στο είδος.
   Έτσι το «κομμωτήριο» φέρνει τα κομμωτήρια, και το «κομμωτήριο θεσσαλονίκη» τα κομμωτήρια της Θεσσαλονίκης
   (κάθε λέξη πρέπει να ταιριάζει κάπου). */

/* Αρχές λέξεων (χωρίς τόνους, πεζά) που δείχνουν κάθε είδος. */
const WORDS: Record<string, string[]> = {
  gym: ['γυμναστ', 'gym', 'crossfit', 'προπονηση', 'fitness', 'workout'],
  personal_training: ['personal', 'προσωπικ', 'προπονητ', 'trainer'],
  pilates_yoga: ['pilates', 'πιλατες', 'yoga', 'γιογκα'],
  nails: ['νυχ', 'nail', 'μανικιουρ', 'πεντικιουρ', 'manicure', 'pedicure'],
  hair: ['κομμωτ', 'κομμωσ', 'μαλλι', 'hair', 'salon', 'haircut'],
  barber: ['κουρ', 'barber', 'ξυρισ', 'shave'],
  beauty: ['αισθητ', 'beauty', 'ομορφ', 'αποτριχ', 'laser', 'φρυδ', 'wax', 'brow', 'facial'],
  massage_spa: ['μασαζ', 'massage', 'spa'],
  physio: ['φυσικοθ', 'φυσιοθ', 'physio'],
  medical: ['ιατρει', 'γιατρ', 'doctor', 'clinic'],
  dental: ['οδοντ', 'dentist', 'dental', 'teeth'],
  tattoo: ['tattoo', 'τατουαζ', 'τατου', 'piercing'],
};

export const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');

/* Ποια είδη ταιριάζουν σε μία λέξη (π.χ. «κουρείο» → barber, «νύχια» → nails). */
export function catsFor(word: string): string[] {
  const n = plain(word);
  if (n.length < 3) return [];
  return Object.keys(WORDS).filter((k) => WORDS[k].some((s) => { const w = plain(s); return n.startsWith(w) || w.startsWith(n); }));
}

/* Αγγλικά (τουρίστες): μεγάλες πόλεις με λατινικά → όπως είναι γραμμένες στη βάση. */
const CITIES: Record<string, string> = {
  athens: 'Αθήνα', athina: 'Αθήνα', thessaloniki: 'Θεσσαλονίκη', salonica: 'Θεσσαλονίκη', patra: 'Πάτρα', patras: 'Πάτρα',
  heraklion: 'Ηράκλειο', iraklio: 'Ηράκλειο', larisa: 'Λάρισα', larissa: 'Λάρισα', volos: 'Βόλος', ioannina: 'Ιωάννινα',
  chania: 'Χανιά', rhodes: 'Ρόδος', rodos: 'Ρόδος', kalamata: 'Καλαμάτα', piraeus: 'Πειραιάς', kavala: 'Καβάλα', corfu: 'Κέρκυρα', kerkyra: 'Κέρκυρα',
};

/* Τα φίλτρα για το supabase: ένα .or(...) ανά λέξη (όλα μαζί = ΚΑΙ). */
export function searchFilters(q: string): string[] {
  return q.replace(/[,()*%\\]/g, ' ').split(/\s+/).filter(Boolean).map((w) => {
    const like = `%${w}%`;
    const parts = [`name.ilike.${like}`, `city.ilike.${like}`, `address.ilike.${like}`];
    const city = CITIES[plain(w)];
    if (city) parts.push(`city.ilike.%${city}%`);
    const cats = catsFor(w);
    if (cats.length) parts.push(`category.in.(${cats.join(',')})`);
    return parts.join(',');
  });
}
