/* Οι κανόνες του κωδικού χωρίς κανένα κομμάτι οθόνης (τα δοκιμάζει το tests/passRules.test.ts). Η οθόνη είναι στο lib/password.tsx. */
export const PASS_MIN = 8;
const SYMBOLS = /[!@#$%^&*()_+\-=\[\]{};':"|<>?,./`~\\]/;
export const RULES: { label: string; ok: (p: string) => boolean }[] = [
  { label: `Τουλάχιστον ${PASS_MIN} χαρακτήρες`, ok: (p) => p.length >= PASS_MIN },
  { label: 'Ένα κεφαλαίο γράμμα (A–Z)', ok: (p) => /[A-Z]/.test(p) },
  { label: 'Ένα μικρό γράμμα (a–z)', ok: (p) => /[a-z]/.test(p) },
  { label: 'Έναν αριθμό (0–9)', ok: (p) => /[0-9]/.test(p) },
  { label: 'Ένα σύμβολο (π.χ. ! @ # ?)', ok: (p) => SYMBOLS.test(p) },
];
export const passOk = (p: string) => RULES.every((r) => r.ok(p));

/* Το πρώτο πρόβλημα του κωδικού, για μήνυμα λάθους (ή null αν είναι εντάξει). */
export function passProblem(p: string, again?: string): string | null {
  const miss = RULES.find((r) => !r.ok(p));
  if (miss) return 'Ο κωδικός θέλει: ' + miss.label.charAt(0).toLowerCase() + miss.label.slice(1);
  if (again !== undefined && p !== again) return 'Οι δύο κωδικοί δεν είναι ίδιοι';
  return null;
}

/* Δύναμη 0–4: κανόνες που τηρούνται, μήκος, και ποινή για εύκολα μοτίβα. */
const COMMON = /(password|qwerty|12345|11111|abcde|spoton|kodikos)/i;
export function strength(p: string) {
  if (!p) return 0;
  const met = RULES.filter((r) => r.ok(p)).length;
  let sc = met <= 2 ? 1 : met <= 4 ? 2 : 3;
  if (met === RULES.length && p.length >= 12) sc = 4;
  if (COMMON.test(p) || /^(.)\1+$/.test(p)) sc = Math.min(sc, 1);
  return sc;
}
