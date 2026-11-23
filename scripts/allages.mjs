#!/usr/bin/env node
// Τι άλλαξε στο repo και από ποιον (Στάθης ή Λεωνίδας). Το τρέχει αυτόματα το Claude στην αρχή κάθε session
// (.claude/settings.json → SessionStart) και όποιος θέλει με: npm run allages  (ή node scripts/allages.mjs --days 14)
//
// Πώς ξέρει ποιος έκανε τι (δες docs/synergasia.md):
//   1. γραμμή «Από: Λεωνίδας» ή «Από: Στάθης» στο μήνυμα του commit (ο κανόνας από 2026-11-20)
//   2. merge PR από branch leonidas/* ή squash commit του LeoTheGreat777 → Λεωνίδας
//   3. οτιδήποτε άλλο στο main → Στάθης
// Χωρίς εξαρτήσεις· αν δεν υπάρχει δίκτυο, δείχνει ό,τι ξέρει το τοπικό git.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const REPO = 'stsak19/kleise-thesi';
const args = process.argv.slice(2);
const hook = args.includes('--hook');
const daysArg = args.indexOf('--days');
const days = daysArg >= 0 ? Number(args[daysArg + 1]) || 7 : 7;

const sh = (cmd, timeout = 20000) => {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout }).trim(); }
  catch { return ''; }
};

sh('git fetch origin main --quiet', 30000);
const main = sh('git rev-parse --verify --quiet origin/main') ? 'origin/main' : 'HEAD';

// Μέχρι πού έχει δει ο καθένας (γράφεται στο docs/synergasia.md)
let seen = {};
try {
  const doc = readFileSync(new URL('../docs/synergasia.md', import.meta.url), 'utf8');
  for (const m of doc.matchAll(/<!--\s*seen:(leonidas|stathis)=([0-9a-f]{7,40})\s*-->/g)) seen[m[1]] = m[2];
} catch {}

const who = (c) => {
  let body = c.body;
  // Merge PR: η γραμμή «Από:» είναι στα commits που μπήκαν, όχι στο ίδιο το merge
  if (/^Merge /.test(c.subject)) body += '\n' + sh(`git log ${c.hash}^1..${c.hash}^2 --format=%b`);
  const by = body.match(/^Από:\s*(\S+)/m)?.[1] ?? '';
  if (/^Λε/i.test(by)) return 'leonidas';
  if (/^Στ/i.test(by)) return 'stathis';
  if (/from stsak19\/leonidas\//.test(c.subject) || /leonidas\//.test(c.subject)) return 'leonidas';
  if (c.author === 'LeoTheGreat777') return 'leonidas';
  return 'stathis';
};

const SEP = '\u001e', END = '\u001f';
const raw = sh(`git log ${main} --first-parent --since="${days} days ago" --date=short --format="%h${SEP}%ad${SEP}%an${SEP}%s${SEP}%b${END}"`);
const commits = raw.split(END).map((s) => s.trim()).filter(Boolean).map((s) => {
  const [hash, date, author, subject, body = ''] = s.split(SEP);
  return { hash, date, author, subject, body };
});

// Νέο για τον ΑΛΛΟΝ = δεν είναι μέσα στο seen του. Χωρίς seen, όλα είναι νέα.
const isNew = (hash, reader) => !seen[reader] || !!sh(`git merge-base --is-ancestor ${hash} ${seen[reader]} || echo new`);
const label = { leonidas: 'Λεωνίδα', stathis: 'Στάθη' }; // αιτιατική: «για τον …»
const out = [`# Αλλαγές στο ${REPO} (τελευταίες ${days} μέρες, ${main})`];
for (const p of ['stathis', 'leonidas']) {
  const reader = p === 'stathis' ? 'leonidas' : 'stathis';
  const all = commits.filter((c) => who(c) === p);
  const fresh = all.filter((c) => isNew(c.hash, reader));
  out.push('', `## Από ${p === 'stathis' ? 'τον Στάθη' : 'τον Λεωνίδα'} στο main: ${fresh.length} νέα για τον ${label[reader]}` +
    (seen[reader] ? ` (έχει δει μέχρι ${seen[reader]}· ${all.length - fresh.length} παλιότερα δεν δείχνονται)` : ''));
  for (const c of fresh.slice(0, 30)) out.push(`- ${c.date} ${c.hash} ${c.subject.slice(0, 120)}`);
  if (fresh.length > 30) out.push(`- … και ${fresh.length - 30} ακόμα (git log ${seen[reader] ?? ''}..${main} --first-parent --oneline)`);
}

// Ανοιχτά PR: gh → curl στο δημόσιο API → (χωρίς δίκτυο) branches που δεν έχουν μπει στο main
let prs = null;
const ghOut = sh(`gh pr list -R ${REPO} --state open --json number,title,author,headRefName,url`);
try { if (ghOut) prs = JSON.parse(ghOut).map((p) => ({ n: p.number, t: p.title, a: p.author?.login, b: p.headRefName, u: p.url })); } catch {}
if (!prs) {
  const api = sh(`curl -sf --max-time 15 https://api.github.com/repos/${REPO}/pulls?state=open`);
  try { if (api) prs = JSON.parse(api).map((p) => ({ n: p.number, t: p.title, a: p.user?.login, b: p.head?.ref, u: p.html_url })); } catch {}
}
out.push('', '## Ανοιχτά Pull Requests (περιμένουν έλεγχο / Merge)');
if (prs) {
  if (!prs.length) out.push('- Κανένα.');
  for (const p of prs) out.push(`- #${p.n} ${p.t} — ${p.a === 'LeoTheGreat777' || /^leonidas\//.test(p.b) ? 'Λεωνίδας' : p.a} (${p.b}) ${p.u}`);
} else {
  const branches = sh(`git branch -r --no-merged ${main}`).split('\n').map((s) => s.trim()).filter((b) => /origin\/leonidas\//.test(b));
  out.push('- (δεν βρέθηκε GitHub· branches leonidas/* που δεν έχουν μπει στο main — μπορεί κάποια να έγιναν ήδη squash merge)');
  for (const b of branches) out.push(`- ${b}`);
}

// Migrations: ποια αρχεία του main δεν έχουν τρέξει ακόμα στη βάση (πίνακας applied_migrations, migration 025).
// Διαβάζει με το δημόσιο κλειδί του app.json. Χωρίς δίκτυο προς τη Supabase, απλώς το λέει.
out.push('', '## Migrations στη βάση Supabase');
const files = sh(`git ls-tree --name-only ${main} supabase/migrations/`).split('\n').map((f) => f.split('/').pop()).filter((f) => /^\d+_.*\.sql$/.test(f));
const local = files.length ? files : (() => { try { return readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((f) => /^\d+_.*\.sql$/.test(f)); } catch { return []; } })();
let applied = null;
try {
  const extra = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra;
  const res = sh(`curl -sf --max-time 8 -X POST "${extra.supabaseUrl}/rest/v1/rpc/applied_migrations_list" -H "apikey: ${extra.supabaseAnonKey}" -H "Content-Type: application/json" -d "{}"`, 12000);
  if (res) applied = JSON.parse(res);
} catch {}
if (!Array.isArray(applied)) {
  out.push('- Δεν μπόρεσα να ρωτήσω τη βάση (χωρίς δίκτυο ή δεν έχει τρέξει ακόμα το 025). Κοίτα τη λίστα στο docs/features/vasi.md.');
} else {
  const done = new Set(applied.map((a) => a.num));
  const todo = local.filter((f) => !done.has(Number(f.split('_')[0])));
  out.push(todo.length ? `- **Δεν έχουν τρέξει ακόμα** (${main}): ${todo.join(', ')} — να τρέξουν με τη σειρά στο SQL Editor.` : `- Όλα τα migrations του ${main} έχουν τρέξει (τελευταίο: ${applied.at(-1)?.name ?? '—'}).`);
}

out.push('', 'Κανόνας (CLAUDE.md): πες στον άνθρωπό σου τι έκανε ο άλλος από το τελευταίο «seen», και για κάθε ανοιχτό PR του άλλου ρώτα αν θέλει να το δει / κάνει Merge. Μετά ενημέρωσε το seen στο docs/synergasia.md.');
console.log(out.join('\n'));
if (hook) process.exit(0);
