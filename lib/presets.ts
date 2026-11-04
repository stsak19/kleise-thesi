/* Πρότυπα ανά είδος επιχείρησης και θέματα εμφάνισης.
   - Διάταξη (layout): πώς είναι στημένη η σελίδα κράτησης.
       classes      = πρόγραμμα μαθημάτων (γυμναστήριο, pilates): όλα τα τμήματα της μέρας σε μία λίστα με πληρότητα
       appointment  = ραντεβού (γιατρός, οδοντίατρος, φυσικοθεραπεία): «επόμενο διαθέσιμο» και ήρεμη, απλή σελίδα
       menu         = κατάλογος υπηρεσιών (κομμωτήριο, νύχια, spa): υπηρεσίες με τιμή σαν κάρτες, μετά μέρα και ώρα
   - Θέμα (theme): χρώμα, στυλ κορυφής σελίδας και στρογγύλεμα. Ο ιδιοκτήτης διαλέγει θέμα και μπορεί να αλλάξει το χρώμα.
   - Πρότυπο είδους: προτεινόμενα θέμα, διάταξη, κανόνες, υπηρεσίες και ωράριο για να ξεκινήσει γρήγορα. */

export type Layout = 'classes' | 'appointment' | 'menu';
export type Header = 'cover' | 'compact' | 'minimal';
export type ThemePreset = { key: string; name: string; emoji: string; color: string; header: Header; radius: number };

export const LAYOUTS: { key: Layout; name: string; emoji: string; text: string }[] = [
  { key: 'classes', name: 'Πρόγραμμα μαθημάτων', emoji: '🏋️', text: 'Όλα τα τμήματα της μέρας σε μία λίστα, με πληρότητα (π.χ. 7/12).' },
  { key: 'appointment', name: 'Ραντεβού', emoji: '🩺', text: 'Πρώτα το επόμενο διαθέσιμο ραντεβού, μετά μέρα και ώρα. Απλό και ήρεμο.' },
  { key: 'menu', name: 'Κατάλογος υπηρεσιών', emoji: '💅', text: 'Οι υπηρεσίες με τιμή και διάρκεια σαν κάρτες· διαλέγεις υπηρεσία, μέρα, ώρα.' },
];

export const THEMES: ThemePreset[] = [
  { key: 'energy', name: 'Ενέργεια', emoji: '⚡', color: '#f97316', header: 'cover', radius: 14 },
  { key: 'sport', name: 'Σπορ', emoji: '🏁', color: '#16161a', header: 'compact', radius: 8 },
  { key: 'clinic', name: 'Ιατρείο', emoji: '🩺', color: '#1d85ed', header: 'minimal', radius: 12 },
  { key: 'fresh', name: 'Φρεσκάδα', emoji: '🌿', color: '#14b8a6', header: 'minimal', radius: 16 },
  { key: 'elegance', name: 'Κομψό', emoji: '🌸', color: '#d946ef', header: 'cover', radius: 24 },
  { key: 'classic', name: 'Κλασικό', emoji: '💈', color: '#840b29', header: 'compact', radius: 10 },
  { key: 'calm', name: 'Χαλάρωση', emoji: '🕯️', color: '#a855f7', header: 'cover', radius: 26 },
  { key: 'bold', name: 'Έντονο', emoji: '🖋️', color: '#334155', header: 'compact', radius: 4 },
];
export const themeOf = (key?: string | null) => THEMES.find((t) => t.key === key);

type SvcPreset = { name: string; duration_min: number; price: number | null; capacity: number };
type TypePreset = {
  layout: Layout; theme: string;
  rules: { max_days_ahead: number; cancel_before_min: number; requires_approval: boolean; uses_credits: boolean };
  services: SvcPreset[];
  hours: { days: number[]; spans: [string, string][] }[];
};
const WEEKDAYS = [1, 2, 3, 4, 5];
const MON_SAT = [1, 2, 3, 4, 5, 6];
const TUE_SAT = [2, 3, 4, 5, 6];

export const TYPE_PRESETS: Record<string, TypePreset> = {
  gym: { layout: 'classes', theme: 'energy', rules: { max_days_ahead: 7, cancel_before_min: 120, requires_approval: false, uses_credits: true },
    services: [{ name: 'Cross Training', duration_min: 60, price: null, capacity: 12 }, { name: 'Spinning', duration_min: 45, price: null, capacity: 10 }, { name: 'Functional', duration_min: 60, price: null, capacity: 12 }],
    hours: [{ days: WEEKDAYS, spans: [['07:00', '22:00']] }, { days: [6], spans: [['09:00', '14:00']] }] },
  personal_training: { layout: 'appointment', theme: 'sport', rules: { max_days_ahead: 14, cancel_before_min: 720, requires_approval: true, uses_credits: true },
    services: [{ name: 'Ατομική προπόνηση', duration_min: 60, price: 30, capacity: 1 }, { name: 'Προπόνηση σε ζευγάρι', duration_min: 60, price: 40, capacity: 2 }],
    hours: [{ days: MON_SAT, spans: [['07:00', '12:00'], ['16:00', '21:00']] }] },
  pilates_yoga: { layout: 'classes', theme: 'calm', rules: { max_days_ahead: 14, cancel_before_min: 360, requires_approval: false, uses_credits: true },
    services: [{ name: 'Reformer', duration_min: 50, price: 15, capacity: 6 }, { name: 'Mat Pilates', duration_min: 50, price: 10, capacity: 10 }, { name: 'Yoga', duration_min: 60, price: 12, capacity: 12 }],
    hours: [{ days: WEEKDAYS, spans: [['08:00', '13:00'], ['17:00', '21:00']] }] },
  nails: { layout: 'menu', theme: 'elegance', rules: { max_days_ahead: 30, cancel_before_min: 240, requires_approval: false, uses_credits: false },
    services: [{ name: 'Μανικιούρ ημιμόνιμο', duration_min: 60, price: 20, capacity: 1 }, { name: 'Πεντικιούρ', duration_min: 60, price: 25, capacity: 1 }, { name: 'Τεχνητά νύχια', duration_min: 90, price: 35, capacity: 1 }],
    hours: [{ days: MON_SAT, spans: [['10:00', '20:00']] }] },
  hair: { layout: 'menu', theme: 'elegance', rules: { max_days_ahead: 30, cancel_before_min: 180, requires_approval: false, uses_credits: false },
    services: [{ name: 'Κούρεμα', duration_min: 30, price: 15, capacity: 1 }, { name: 'Βαφή', duration_min: 90, price: 40, capacity: 1 }, { name: 'Χτένισμα', duration_min: 45, price: 20, capacity: 1 }],
    hours: [{ days: TUE_SAT, spans: [['09:00', '14:00'], ['17:00', '21:00']] }] },
  barber: { layout: 'menu', theme: 'classic', rules: { max_days_ahead: 14, cancel_before_min: 60, requires_approval: false, uses_credits: false },
    services: [{ name: 'Κούρεμα', duration_min: 30, price: 12, capacity: 1 }, { name: 'Κούρεμα + γένια', duration_min: 45, price: 18, capacity: 1 }, { name: 'Ξύρισμα', duration_min: 20, price: 8, capacity: 1 }],
    hours: [{ days: MON_SAT, spans: [['09:00', '21:00']] }] },
  beauty: { layout: 'menu', theme: 'elegance', rules: { max_days_ahead: 30, cancel_before_min: 240, requires_approval: false, uses_credits: false },
    services: [{ name: 'Καθαρισμός προσώπου', duration_min: 60, price: 35, capacity: 1 }, { name: 'Αποτρίχωση', duration_min: 30, price: 15, capacity: 1 }],
    hours: [{ days: TUE_SAT, spans: [['10:00', '19:00']] }] },
  massage_spa: { layout: 'menu', theme: 'calm', rules: { max_days_ahead: 30, cancel_before_min: 360, requires_approval: false, uses_credits: false },
    services: [{ name: 'Χαλαρωτικό μασάζ', duration_min: 60, price: 45, capacity: 1 }, { name: 'Θεραπευτικό μασάζ', duration_min: 45, price: 40, capacity: 1 }],
    hours: [{ days: [0, 1, 2, 3, 4, 5, 6], spans: [['11:00', '21:00']] }] },
  physio: { layout: 'appointment', theme: 'fresh', rules: { max_days_ahead: 21, cancel_before_min: 720, requires_approval: false, uses_credits: true },
    services: [{ name: 'Συνεδρία φυσικοθεραπείας', duration_min: 45, price: 30, capacity: 1 }, { name: 'Αξιολόγηση', duration_min: 30, price: 25, capacity: 1 }],
    hours: [{ days: WEEKDAYS, spans: [['08:00', '15:00'], ['17:00', '20:00']] }] },
  medical: { layout: 'appointment', theme: 'clinic', rules: { max_days_ahead: 30, cancel_before_min: 1440, requires_approval: false, uses_credits: false },
    services: [{ name: 'Εξέταση', duration_min: 20, price: 40, capacity: 1 }, { name: 'Συνταγογράφηση', duration_min: 10, price: null, capacity: 1 }],
    hours: [{ days: WEEKDAYS, spans: [['09:00', '13:00'], ['18:00', '20:00']] }] },
  dental: { layout: 'appointment', theme: 'clinic', rules: { max_days_ahead: 60, cancel_before_min: 1440, requires_approval: false, uses_credits: false },
    services: [{ name: 'Έλεγχος', duration_min: 20, price: 30, capacity: 1 }, { name: 'Καθαρισμός δοντιών', duration_min: 40, price: 50, capacity: 1 }],
    hours: [{ days: WEEKDAYS, spans: [['09:00', '15:00']] }] },
  tattoo: { layout: 'menu', theme: 'bold', rules: { max_days_ahead: 60, cancel_before_min: 2880, requires_approval: true, uses_credits: false },
    services: [{ name: 'Μικρό tattoo', duration_min: 120, price: 80, capacity: 1 }, { name: 'Συνάντηση σχεδίου', duration_min: 30, price: null, capacity: 1 }],
    hours: [{ days: TUE_SAT, spans: [['12:00', '20:00']] }] },
  other: { layout: 'menu', theme: 'fresh', rules: { max_days_ahead: 14, cancel_before_min: 120, requires_approval: false, uses_credits: false },
    services: [{ name: 'Ραντεβού', duration_min: 30, price: null, capacity: 1 }],
    hours: [{ days: WEEKDAYS, spans: [['09:00', '17:00']] }] },
};
export const presetFor = (category: string) => TYPE_PRESETS[category] ?? TYPE_PRESETS.other;

/* Η τελική εμφάνιση ενός καταστήματος: ό,τι διάλεξε ο ιδιοκτήτης, αλλιώς το πρότυπο του είδους του. */
export function styleOf(biz: any) {
  const p = presetFor(biz?.category);
  const t = themeOf(biz?.theme) ?? themeOf(p.theme)!;
  const layout: Layout = LAYOUTS.some((l) => l.key === biz?.layout) ? biz.layout : p.layout;
  return { layout, theme: t, header: t.header, radius: t.radius, color: (biz?.brand_color as string) || t.color };
}
