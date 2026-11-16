/* Demo του super admin (/open/admin): απαντά τις admin_* κλήσεις από τα δοκιμαστικά δεδομένα του lib/demo.ts.
   Οι ενέργειες (αναστολή, διαγραφή, ακύρωση…) αλλάζουν μόνο τη μνήμη της συσκευής. Στη βάση: 010_super_admin.sql. */

type Env = { db: Record<string, any[]>; clients: Record<string, { name: string; phone: string }>; demoUid: string; demoName: string; demoEmail: string;
  accounts: () => { id: string; email: string }[]; today: () => string };

const COMMENTS: [number, string | null][] = [
  [5, 'Τέλεια δουλειά, ευχαριστώ!'], [5, 'Πολύ ευγενικοί και στην ώρα τους.'], [4, 'Καλό, λίγη αναμονή.'], [5, null], [1, 'Δεν ήρθε κανείς στο ραντεβού.'],
  [4, 'Θα ξαναέρθω.'], [5, 'Η καλύτερη εμπειρία!'], [2, 'Ακριβό για αυτό που πήρα.'], [5, null], [3, 'Μέτριο.'], [5, 'Άψογοι!'], [4, null],
];
const OWNERS = ['Ελένη Μαυρίδου', 'Πέτρος Αλεξίου', 'Νίκη Τσακίρη', 'Νίκος Δρόσος', 'Ζωή Κανέλλη', 'Κώστας Ραφαηλίδης', 'Ιωάννα Ρήγα', 'Δημήτρης Σαββίδης',
  'Κατερίνα Παππά', 'Άρης Λαμπρόπουλος', 'Μαρίνα Δούκα', 'Στέλιος Ηλιάδης', 'Φωτεινή Κυρίτση', 'Αλέξης Μπαλτάς'];
const latin = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zα-ω ]/g, '')
  .replace(/[α-ω]/g, (c) => ({ α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o' } as any)[c] ?? c);
const mail = (name: string) => { const [a, b = ''] = latin(name).split(' '); return `${a}.${b.slice(0, 8)}@gmail.com`; };
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

export function adminRPC(env: Env): Record<string, (a: any) => any> {
  const { db } = env;
  const st = {
    susBiz: new Map<string, string | null>(), susUser: new Map<string, string | null>(), gone: new Set<string>(),
    deletion: new Map<string, string>([['u5', daysAgo(2)], ['u17', daysAgo(5)]]),
    log: [] as any[], reviews: null as any[] | null,
  };
  const live = () => db.businesses.filter((b) => !st.gone.has(b.id));
  const ownerId = (b: any) => 'o-' + b.id; // στο demo κάθε κατάστημα έχει δικό του (φανταστικό) ιδιοκτήτη
  const ownerName = (b: any) => OWNERS[db.businesses.indexOf(b) % OWNERS.length];
  const people = () => {
    const out = new Map<string, any>();
    out.set(env.demoUid, { id: env.demoUid, name: env.demoName, email: env.demoEmail, phone: '6945812304', created_at: '2026-01-01T09:00:00Z' });
    env.accounts().forEach((a) => out.has(a.id) || out.set(a.id, { id: a.id, name: (db.profiles.find((p) => p.id === a.id) as any)?.first_name || null, email: a.email, phone: null, created_at: daysAgo(1) }));
    Object.entries(env.clients).forEach(([id, c], i) => out.set(id, { id, name: c.name, email: mail(c.name), phone: c.phone, created_at: daysAgo(3 + ((i * 37) % 300)) }));
    db.businesses.forEach((b, i) => { const id = ownerId(b); if (!out.has(id)) out.set(id, { id, name: ownerName(b), email: mail(ownerName(b)), phone: '69' + String(71234560 + i * 1311), created_at: daysAgo(40 + i * 9) }); });
    st.gone.forEach((id) => out.delete(id));
    return out;
  };
  const person = (id: string) => { const p = people().get(id); return p ? { id: p.id, name: p.name, email: p.email, phone: p.phone } : null; };
  const bz = (id: string) => db.businesses.find((b) => b.id === id);
  const sv = (id: string) => db.services.find((s) => s.id === id);
  const bookings = () => db.bookings.filter((b) => !st.gone.has(b.business_id) && !st.gone.has(b.user_id));
  const reviews = () => {
    if (!st.reviews) {
      const past = db.bookings.filter((b) => b.status === 'attended' && b.user_id !== env.demoUid);
      st.reviews = past.filter((_, i) => i % 9 === 0).sort((x, y) => (x.id < y.id ? -1 : 1)).slice(0, 80).map((b, i) => {
        const [stars, comment] = COMMENTS[i % COMMENTS.length];
        return { id: 'r' + i, booking_id: b.id, business_id: b.business_id, user_id: b.user_id, stars, comment, created_at: new Date(b.date + 'T20:00').toISOString() };
      });
    }
    return st.reviews.filter((r) => !st.gone.has(r.business_id) && !st.gone.has(r.user_id));
  };
  const rating = (id: string) => { const r = reviews().filter((x) => x.business_id === id); return r.length ? { avg: Math.round((r.reduce((a, x) => a + x.stars, 0) / r.length) * 10) / 10, n: r.length } : { avg: null, n: 0 }; };
  const today = env.today();
  const shift = (n: number) => { const d = new Date(today + 'T00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const created = (b: any) => daysAgo(2 + db.businesses.indexOf(b) * 6);
  const shop = (b: any) => {
    const bk = bookings().filter((x) => x.business_id === b.id && x.date > shift(-30));
    const r = rating(b.id);
    return { id: b.id, name: b.name, category: b.category, city: b.city, address: b.address, phone: b.phone, logo_url: b.logo_url, brand_color: b.brand_color,
      created_at: created(b), is_published: b.is_published !== false, suspended: st.susBiz.has(b.id), suspend_reason: st.susBiz.get(b.id) ?? null,
      rating_avg: r.avg, rating_count: r.n, owner: person(ownerId(b)),
      services: db.services.filter((s) => s.business_id === b.id && s.active).length, staff: db.staff.filter((s) => s.business_id === b.id).length,
      clients: new Set(bookings().filter((x) => x.business_id === b.id).map((x) => x.user_id)).size,
      bookings_30: bk.filter((x) => x.status !== 'cancelled').length, cancelled_30: bk.filter((x) => x.status === 'cancelled').length };
  };
  const user = (p: any) => {
    const mine = bookings().filter((b) => b.user_id === p.id);
    return { ...p, last_sign_in_at: daysAgo((p.id.length * 7) % 12), suspended: st.susUser.has(p.id), suspend_reason: st.susUser.get(p.id) ?? null,
      delete_requested_at: st.deletion.get(p.id) ?? null, is_admin: false,
      owns: live().filter((b) => ownerId(b) === p.id).length,
      bookings: mine.filter((b) => b.status !== 'cancelled').length, no_shows: mine.filter((b) => b.status === 'no_show').length };
  };
  const note = (action: string, target: string, n?: string | null) => st.log.unshift({ target, action, note: n || null, created_at: new Date().toISOString(), by: 'Εσύ (demo)' });
  const logOf = (id: string) => st.log.filter((l) => l.target === id);
  const bkRow = (b: any) => { const z = bz(b.business_id), s = sv(b.service_id); const u = person(b.user_id);
    return { id: b.id, date: b.date, time: b.time, status: b.status, business_id: b.business_id, business: z?.name, brand_color: z?.brand_color, service: s?.name,
      user_id: b.user_id, user: u?.name ?? null, email: u?.email ?? null }; };
  const q = (t: any) => String(t ?? '').trim().toLowerCase();
  const has = (t: string, ...xs: any[]) => !t || xs.some((x) => String(x ?? '').toLowerCase().includes(t));

  return {
    is_super_admin: () => true,
    admin_overview: () => {
      const bk = bookings();
      const noShow = new Map<string, Set<string>>(); const ns = new Map<string, number>();
      bk.filter((b) => b.status === 'no_show' && b.date > shift(-60)).forEach((b) => { ns.set(b.user_id, (ns.get(b.user_id) ?? 0) + 1); (noShow.get(b.user_id) ?? noShow.set(b.user_id, new Set()).get(b.user_id)!).add(b.business_id); });
      const low = reviews().filter((r) => r.stars <= 2).slice(0, 3).map((r) => ({ kind: 'review', ...r, business: bz(r.business_id)?.name }));
      const ppl = people();
      return {
        businesses: live().length, published: live().filter((b) => !st.susBiz.has(b.id)).length, businesses_week: 2,
        users: ppl.size, users_week: Math.round(ppl.size / 12),
        bookings_today: bk.filter((b) => b.date === today && b.status !== 'cancelled').length,
        rating_avg: (() => { const r = reviews(); return r.length ? Math.round((r.reduce((a, x) => a + x.stars, 0) / r.length) * 10) / 10 : null; })(),
        chart: Array.from({ length: 14 }, (_, i) => { const d = shift(i - 13); return { date: d, n: bk.filter((b) => b.date === d && b.status !== 'cancelled').length }; }),
        new_businesses: [...live()].sort((a, z) => created(z).localeCompare(created(a))).slice(0, 6).map(shop),
        deletions: [...st.deletion.entries()].filter(([id]) => ppl.has(id)).map(([id, at]) => ({ ...person(id), requested_at: at, delete_on: new Date(new Date(at).getTime() + 7 * 864e5).toISOString(), owns: 0 })),
        attention: [...low, ...[...ns.entries()].filter(([, n]) => n >= 3).sort((a, z) => z[1] - a[1]).slice(0, 3)
          .map(([id, n]) => ({ kind: 'no_show', ...person(id), n, shops: noShow.get(id)!.size }))],
      };
    },
    admin_businesses: (a) => { const t = q(a.p_q); return live().map(shop).filter((b) => has(t, b.name, b.city, b.owner?.name, b.owner?.email)); },
    admin_business: (a) => {
      const b = bz(a.p_id); if (!b || st.gone.has(b.id)) return null;
      return { ...shop(b),
        services: db.services.filter((s) => s.business_id === b.id).map((s) => ({ name: s.name, price_cents: s.price_cents, duration_min: s.duration_min, active: s.active })),
        staff: db.staff.filter((s) => s.business_id === b.id).map((s) => ({ name: s.name, active: true })),
        bookings: bookings().filter((x) => x.business_id === b.id).sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time)).slice(0, 50).map(bkRow),
        reviews: reviews().filter((r) => r.business_id === b.id).map((r) => ({ ...r, user: person(r.user_id)?.name })), log: logOf(b.id) };
    },
    admin_users: (a) => { const t = q(a.p_q); return [...people().values()].map(user).filter((u) => has(t, u.name, u.email, u.phone)); },
    admin_user: (a) => {
      const p = people().get(a.p_user); if (!p) return null;
      return { ...user(p),
        bookings: bookings().filter((b) => b.user_id === p.id).sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time)).slice(0, 100).map(bkRow),
        packages: db.memberships.filter((m) => m.user_id === p.id).map((m) => ({ business_id: m.business_id, business: bz(m.business_id)?.name, credits: m.credits, status: m.status, pack_name: m.pack_name })),
        businesses: live().filter((b) => ownerId(b) === p.id).map((b) => ({ id: b.id, name: b.name, city: b.city, is_published: true, suspended: st.susBiz.has(b.id) })),
        reviews: reviews().filter((r) => r.user_id === p.id).map((r) => ({ ...r, business: bz(r.business_id)?.name })),
        rated: bookings().filter((b) => b.user_id === p.id && b.status !== 'booked' && b.status !== 'cancelled').slice(0, 6)
          .map((b, i) => ({ stars: b.status === 'no_show' ? 1 : 4 + (i % 2), note: b.status === 'no_show' ? 'Δεν ήρθε χωρίς να ενημερώσει' : null, created_at: new Date(b.date + 'T21:00').toISOString(), business: bz(b.business_id)?.name })),
        log: logOf(p.id) };
    },
    admin_bookings: (a) => bookings().filter((b) => b.date === (a.p_date || today)).map(bkRow).sort((x, y) => String(x.time).localeCompare(String(y.time))),
    admin_reviews: () => reviews().map((r) => ({ ...r, business: bz(r.business_id)?.name, user: person(r.user_id)?.name })),
    admin_suspend_business: (a) => { a.p_on ? st.susBiz.set(a.p_id, a.p_reason || null) : st.susBiz.delete(a.p_id); note(a.p_on ? 'Αναστολή καταστήματος' : 'Ενεργοποίηση καταστήματος', a.p_id, a.p_reason); return { ok: true }; },
    admin_suspend_user: (a) => { a.p_on ? st.susUser.set(a.p_user, a.p_reason || null) : st.susUser.delete(a.p_user); note(a.p_on ? 'Αναστολή λογαριασμού' : 'Άρση αναστολής', a.p_user, a.p_reason); return { ok: true }; },
    admin_message: (a) => { if (!q(a.p_text)) return { ok: false, error: 'Γράψε μήνυμα' }; note('Μήνυμα', a.p_user, String(a.p_text).trim()); return { ok: true }; },
    admin_cancel_booking: (a) => { const b = db.bookings.find((x) => x.id === a.p_booking); if (!b || b.status !== 'booked') return { ok: false, error: 'Η κράτηση δεν είναι ενεργή' }; b.status = 'cancelled'; note('Ακύρωση κράτησης', b.user_id, bz(b.business_id)?.name); return { ok: true }; },
    admin_delete_review: (a) => { st.reviews = (st.reviews ?? []).filter((r) => r.id !== a.p_id); return { ok: true }; },
    admin_delete_business: (a) => { st.gone.add(a.p_id); return { ok: true }; },
    admin_delete_user: (a) => { if (a.p_user === env.demoUid) return { ok: false, error: 'Δεν γίνεται για τον δικό σου λογαριασμό' }; st.gone.add(a.p_user); st.deletion.delete(a.p_user); return { ok: true }; },
    admin_cancel_deletion: (a) => { st.deletion.delete(a.p_user); note('Ακύρωση αίτησης διαγραφής', a.p_user); return { ok: true }; },
  };
}
