/* Αναζήτηση καταστημάτων: κάθε λέξη ψάχνεται στο όνομα, στην πόλη, στη διεύθυνση και στο είδος.
   Έτσι το «κομμωτήριο» φέρνει τα κομμωτήρια, και το «κομμωτήριο θεσσαλονίκη» τα κομμωτήρια της Θεσσαλονίκης
   (κάθε λέξη πρέπει να ταιριάζει κάπου). */

/* Αρχές λέξεων (χωρίς τόνους, πεζά) που δείχνουν κάθε είδος. */
const WORDS: Record<string, string[]> = {
  gym: ['γυμναστ', 'gym', 'crossfit', 'προπονηση', 'fitness'],
  personal_training: ['personal', 'προσωπικ', 'προπονητ'],
  pilates_yoga: ['pilates', 'πιλατες', 'yoga', 'γιογκα'],
  nails: ['νυχ', 'nail', 'μανικιουρ', 'πεντικιουρ'],
  hair: ['κομμωτ', 'κομμωσ', 'μαλλι', 'hair'],
  barber: ['κουρ', 'barber', 'ξυρισ'],
  beauty: ['αισθητ', 'beauty', 'ομορφ', 'αποτριχ', 'laser', 'φρυδ'],
  massage_spa: ['μασαζ', 'massage', 'spa'],
  physio: ['φυσικοθ', 'φυσιοθ', 'physio'],
  medical: ['ιατρει', 'γιατρ', 'doctor'],
  dental: ['οδοντ', 'dentist', 'dental'],
  tattoo: ['tattoo', 'τατουαζ', 'τατου', 'piercing'],
};

export const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');

/* Ποια είδη ταιριάζουν σε μία λέξη (π.χ. «κουρείο» → barber, «νύχια» → nails). */
export function catsFor(word: string): string[] {
  const n = plain(word);
  if (n.length < 3) return [];
  return Object.keys(WORDS).filter((k) => WORDS[k].some((s) => { const w = plain(s); return n.startsWith(w) || w.startsWith(n); }));
}

/* Τα φίλτρα για το supabase: ένα .or(...) ανά λέξη (όλα μαζί = ΚΑΙ). */
export function searchFilters(q: string): string[] {
  return q.replace(/[,()*%\\]/g, ' ').split(/\s+/).filter(Boolean).map((w) => {
    const like = `%${w}%`;
    const parts = [`name.ilike.${like}`, `city.ilike.${like}`, `address.ilike.${like}`];
    const cats = catsFor(w);
    if (cats.length) parts.push(`category.in.(${cats.join(',')})`);
    return parts.join(',');
  });
}
