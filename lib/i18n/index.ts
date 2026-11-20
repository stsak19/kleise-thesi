import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { EN } from './en';

/* Δεύτερη γλώσσα: Αγγλικά (για τουρίστες και ξένους πελάτες). Ο κώδικας μένει γραμμένος στα ελληνικά·
   όταν η γλώσσα είναι «en», το κείμενο μεταφράζεται εκεί που ζωγραφίζεται: στο Text/TextInput του lib/Txt.tsx,
   στο say() του lib/alert.ts, στους τίτλους των οθονών (tr) και στις μέρες/μήνες του lib/ui.tsx.
   Λεξικό: lib/i18n/en.ts. Ό,τι δεν είναι εκεί φαίνεται όπως είναι (ελληνικά). Ονόματα, υπηρεσίες και κείμενα
   που γράφουν τα καταστήματα δεν μεταφράζονται (εκτός από τις έτοιμες υπηρεσίες του lib/presets.ts).
   Η λειτουργία επιχείρησης μένει στα ελληνικά. Η επιλογή μένει στη συσκευή (Ρυθμίσεις → Γλώσσα).
   Προεπιλογή: ελληνικά. Στην ιστοσελίδα, αν ο browser δεν έχει καθόλου ελληνικά στις γλώσσες του, αγγλικά. */
export type Lang = 'el' | 'en';
const KEY = 'lang.v1';
let lang: Lang = 'el';
let loaded = false;
const subs = new Set<() => void>();

const browserLang = (): Lang | null => {
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  const list: string[] = nav?.languages?.length ? nav.languages : nav?.language ? [nav.language] : [];
  if (!list.length || typeof document === 'undefined') return null; // μόνο στον browser
  return list.some((l) => /^el\b/i.test(l)) ? 'el' : 'en';
};

export const getLang = () => lang;
export async function loadLang() {
  if (loaded) return lang;
  loaded = true;
  try {
    const v = await AsyncStorage.getItem(KEY);
    const next: Lang = v === 'en' || v === 'el' ? v : browserLang() ?? 'el';
    if (next !== lang) { lang = next; subs.forEach((f) => f()); }
  } catch {}
  return lang;
}
export function setLang(v: Lang) {
  if (v === lang) return;
  lang = v; AsyncStorage.setItem(KEY, v).catch(() => {});
  subs.forEach((f) => f());
}
export const onLang = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useLang() {
  const [, setV] = useState(0);
  useEffect(() => onLang(() => setV((x) => x + 1)), []);
  return lang;
}

/* Τα κλειδιά με {0}, {1}… γίνονται μοτίβα: «Σε {0} μέρες» ταιριάζει με «Σε 3 μέρες» → «In 3 days». */
type Pat = { re: RegExp; out: string };
let pats: Pat[] | null = null;
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function patterns() {
  if (pats) return pats;
  pats = Object.keys(EN).filter((k) => /\{\d\}/.test(k))
    .sort((a, b) => b.replace(/\{\d\}/g, '').length - a.replace(/\{\d\}/g, '').length) // τα πιο συγκεκριμένα πρώτα
    .map((k) => {
      const order: number[] = [];
      const src = k.split(/(\{\d\})/).map((p) => { const m = p.match(/^\{(\d)\}$/); if (m) { order.push(Number(m[1])); return '([\\s\\S]*?)'; } return escRe(p); }).join('');
      return { re: new RegExp(`^${src}$`), out: EN[k].replace(/\{(\d)\}/g, (_, i) => `{@${order.indexOf(Number(i))}}`) };
    });
  return pats;
}
const GREEK = /[Ͱ-Ͽἀ-῿]/;
const memo = new Map<string, string>();

/* Μετάφραση ενός κειμένου στην τρέχουσα γλώσσα. Στα ελληνικά επιστρέφει το ίδιο. */
export function tr(s: string): string {
  if (lang === 'el' || !s || !GREEK.test(s)) return s;
  const hit = memo.get(s);
  if (hit !== undefined) return hit;
  const lead = s.match(/^\s*/)![0], tail = s.match(/\s*$/)![0], core = s.trim();
  let out = EN[core];
  if (out === undefined) {
    for (const p of patterns()) {
      const m = core.match(p.re);
      if (m) { out = p.out.replace(/\{@(\d+)\}/g, (_, i) => tr(m[Number(i) + 1] ?? '')); break; }
    }
  }
  const r = out === undefined ? s : lead + out + tail;
  if (memo.size > 5000) memo.clear();
  memo.set(s, r);
  return r;
}
/* Για τα children ενός Text: κείμενο → μετάφραση· πίνακας μόνο από κείμενα/αριθμούς → ενώνεται και μεταφράζεται ολόκληρος
   (π.χ. «Έκδοση {x}»), αλλιώς κάθε κομμάτι χωριστά. */
export function trNode(c: any): any {
  if (lang === 'el') return c;
  if (typeof c === 'string') return tr(c);
  if (Array.isArray(c)) {
    if (c.every((x) => typeof x === 'string' || typeof x === 'number')) {
      const joined = c.join('');
      const t = tr(joined);
      if (t !== joined) return t;
    }
    return c.map(trNode);
  }
  return c;
}
export const resetTr = () => memo.clear();
onLang(resetTr);
