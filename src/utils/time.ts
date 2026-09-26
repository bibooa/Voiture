/** Date/time formatting helpers in French. */

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

/** "il y a 8 min", "il y a 2 h", "hier"… relative to now. */
export function timeAgo(epochMs: number, now: number = Date.now()): string {
  const diffSec = Math.round((epochMs - now) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return "à l'instant";
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
  const diffMonth = Math.round(diffDay / 30);
  return rtf.format(diffMonth, 'month');
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const timeFmt = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

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

  const time = timeFmt.format(d);
  if (sameDay(d, today)) return `Aujourd'hui — ${time}`;
  if (sameDay(d, yesterday)) return `Hier — ${time}`;
  return `${dayFmt.format(d)} — ${time}`;
}
