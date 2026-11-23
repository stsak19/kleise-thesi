import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { LIGHT } from '../theme';
import { WEB_URL } from '../supabase';

/* QR του καταστήματος (app/(biz)/owner/qr.tsx): ο ιδιοκτήτης το τυπώνει για τον πάγκο ή τη βιτρίνα.
   Οδηγεί στη δημόσια σελίδα /store/<slug> της κανονικής ιστοσελίδας (όχι της προεπισκόπησης).
   Ζωγραφίζεται με απλά View (χωρίς SVG βιβλιοθήκη): κάθε σειρά = λωρίδες από συνεχόμενα μαύρα κουτάκια.
   Πάντα μαύρο σε λευκό (LIGHT), και στη σκούρα εμφάνιση, γιατί έτσι το διαβάζουν όλες οι κάμερες. */
export const storeUrl = (key: string) => `${WEB_URL}store/${encodeURIComponent(key)}`;

export function makeQr(text: string) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q;
}

export function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  const rows = useMemo(() => {
    const q = makeQr(value);
    const n = q.getModuleCount();
    const out: { x: number; w: number }[][] = [];
    for (let r = 0; r < n; r++) {
      const runs: { x: number; w: number }[] = [];
      for (let c = 0; c < n; c++) {
        if (!q.isDark(r, c)) continue;
        const last = runs[runs.length - 1];
        if (last && last.x + last.w === c) last.w++; else runs.push({ x: c, w: 1 });
      }
      out.push(runs);
    }
    return out;
  }, [value]);
  const n = rows.length, quiet = 4, cell = size / (n + quiet * 2);
  return (
    <View accessibilityRole="image" accessibilityLabel="QR με τον σύνδεσμο του καταστήματος"
      style={{ width: size, height: size, backgroundColor: LIGHT.bg, padding: cell * quiet }}>
      {rows.map((runs, r) => (
        <View key={r} style={{ height: cell, flexDirection: 'row' }}>
          {runs.map((x) => <View key={x.x} style={{ position: 'absolute', left: x.x * cell, width: x.w * cell + 0.3, height: cell + 0.3, backgroundColor: LIGHT.text }} />)}
        </View>
      ))}
    </View>
  );
}

/* Σελίδα για εκτύπωση (μόνο web): ανοίγει νέο παράθυρο με το QR σε SVG, το όνομα και τον σύνδεσμο, και καλεί print(). */
export function printQr(o: { name: string; url: string; line: string }) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const svg = makeQr(o.url).createSvgTag({ cellSize: 10, margin: 4, scalable: true });
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="el"><head><meta charset="utf-8"><title>${esc(o.name)} · QR</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm; }
  body { margin: 0; font-family: Manrope, system-ui, sans-serif; color: ${LIGHT.text}; background: ${LIGHT.bg}; text-align: center; }
  .card { max-width: 150mm; margin: 0 auto; padding: 10mm 0; }
  h1 { font-size: 30pt; font-weight: 800; margin: 0 0 4mm; letter-spacing: -0.5pt; }
  .line { font-size: 16pt; font-weight: 500; color: ${LIGHT.mute}; margin: 0 0 8mm; }
  .qr svg { width: 120mm; height: 120mm; }
  .qr svg rect[fill="white"], .qr svg path[fill="white"] { fill: ${LIGHT.bg}; }
  .url { font-size: 12pt; font-weight: 800; margin-top: 6mm; word-break: break-all; }
  .brand { font-size: 11pt; color: ${LIGHT.mute}; margin-top: 10mm; }
</style></head><body><div class="card">
  <h1>${esc(o.name)}</h1><p class="line">${esc(o.line)}</p>
  <div class="qr">${svg}</div>
  <div class="url">${esc(o.url.replace(/^https?:\/\//, ''))}</div>
  <div class="brand">SpotOn</div>
</div><script>document.fonts.ready.then(function(){ setTimeout(function(){ window.print(); }, 150); });</script></body></html>`);
  w.document.close();
  return true;
}

/* Κατέβασμα του QR ως εικόνα SVG (μόνο web), για όποιον το θέλει σε δικό του σχέδιο ή αυτοκόλλητο. */
export function downloadQr(o: { url: string; file: string }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const svg = makeQr(o.url).createSvgTag({ cellSize: 10, margin: 4 });
  const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = href; a.download = o.file; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
