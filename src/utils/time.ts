/**
 * Date/time formatting helpers in French.
 *
 * Implemented without `Intl.RelativeTimeFormat` / `Intl.DateTimeFormat`, because
 * the Hermes engine on Android does not ship those APIs by default — using them
 * crashes at module load. These hand-rolled formatters are fully offline and
 * deterministic.
 */

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const hhmm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** "à l'instant", "il y a 8 min", "il y a 2 h", "hier", "il y a 3 j"… */
export function timeAgo(epochMs: number, now: number = Date.now()): string {
  const diffSec = Math.round((now - epochMs) / 1000);

  if (diffSec < 0) return "à l'instant";
  if (diffSec < 60) return "à l'instant";

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `il y a ${diffHour} h`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay === 1) return 'hier';
  if (diffDay < 30) return `il y a ${diffDay} j`;

  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `il y a ${diffMonth} mois`;

  const diffYear = Math.round(diffMonth / 12);
  return `il y a ${diffYear} an${diffYear > 1 ? 's' : ''}`;
}

/** "Aujourd'hui — 14:32" / "Hier — 18:47" / "lundi 3 mars — 09:10". */
export function formatHistoryDate(epochMs: number, now: number = Date.now()): string {
  const d = new Date(epochMs);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = hhmm(d);
  if (sameDay(d, today)) return `Aujourd'hui — ${time}`;
  if (sameDay(d, yesterday)) return `Hier — ${time}`;

  const label = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  return `${label} — ${time}`;
}

/** Compact "when": "14:32" today, "hier" yesterday, else "3 mars". */
export function formatShortWhen(epochMs: number, now: number = Date.now()): string {
  const d = new Date(epochMs);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return hhmm(d);
  if (same(d, yesterday)) return 'hier';
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** "à 12:28" today, "hier à 12:28", else "le 3 mars à 12:28". */
export function formatSavedAt(epochMs: number, now: number = Date.now()): string {
  const d = new Date(epochMs);
  const when = formatShortWhen(epochMs, now);
  const time = hhmm(d);
  if (when === time) return `à ${time}`;
  if (when === 'hier') return `hier à ${time}`;
  return `le ${when} à ${time}`;
}
