import { Linking, Platform } from 'react-native';

/* «Πρόσθεσε στο ημερολόγιο» μετά την κράτηση (app/booked.tsx). Χωρίς βάση και χωρίς βιβλιοθήκη:
   - Google Calendar: σύνδεσμος που ανοίγει έτοιμη την εκδήλωση (κινητό και web).
   - Apple / Outlook: αρχείο .ics που κατεβαίνει (μόνο στο web· στο κινητό δεν υπάρχει αρχείο χωρίς επιπλέον βιβλιοθήκη).
   Οι ώρες είναι ώρα Ελλάδας (Europe/Athens), όπως στη βάση. */
export type CalEvent = { title: string; date: string; time: string; minutes?: number; place?: string; details?: string };

const pad = (n: number) => String(n).padStart(2, '0');
/* «2026-11-21» + «14:20» + λεπτά → «20261121T142000» (τοπική ώρα, χωρίς ζώνη· η ζώνη πάει χωριστά). */
export function stamp(date: string, time: string, plus = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, h, mi + plus)); // UTC μόνο για να γίνει σωστά η πρόσθεση (αλλαγή μέρας)
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

export function googleUrl(e: CalEvent) {
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: e.title,
    dates: `${stamp(e.date, e.time)}/${stamp(e.date, e.time, e.minutes || 30)}`,
    ctz: 'Europe/Athens', ...(e.place ? { location: e.place } : {}), ...(e.details ? { details: e.details } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
export function ics(e: CalEvent, now = new Date()) {
  const utc = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SpotOn//GR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Athens',
    'BEGIN:STANDARD', 'DTSTART:19701025T040000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0200', 'TZNAME:EET', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T030000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0300', 'TZNAME:EEST', 'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${stamp(e.date, e.time)}-${Math.abs(hash(e.title + e.date + e.time))}@spoton`,
    `DTSTAMP:${utc}`,
    `DTSTART;TZID=Europe/Athens:${stamp(e.date, e.time)}`,
    `DTEND;TZID=Europe/Athens:${stamp(e.date, e.time, e.minutes || 30)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.place ? [`LOCATION:${esc(e.place)}`] : []),
    ...(e.details ? [`DESCRIPTION:${esc(e.details)}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

export const canDownloadIcs = Platform.OS === 'web';
export const openGoogle = (e: CalEvent) => Linking.openURL(googleUrl(e)).catch(() => {});
export function downloadIcs(e: CalEvent) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return openGoogle(e);
  const url = URL.createObjectURL(new Blob([ics(e)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'spoton-rantevou.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
