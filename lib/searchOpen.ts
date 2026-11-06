import { useEffect, useState } from 'react';

/* Μικρή κοινή κατάσταση: αν είναι ανοιχτή η αναζήτηση της αρχικής (για να θολώνει και η κάτω μπάρα). */
let open = false;
const subs = new Set<(v: boolean) => void>();
export const setSearchOpen = (v: boolean) => { if (v !== open) { open = v; subs.forEach((f) => f(v)); } };
export function useSearchOpen() {
  const [v, setV] = useState(open);
  useEffect(() => { subs.add(setV); return () => { subs.delete(setV); }; }, []);
  return v;
}
