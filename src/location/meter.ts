/**
 * Paid-parking meter (pure, unit-tested). No server: the end time lives with the
 * saved car, the reminder is a local notification.
 */

export type ParkingMeter = {
  /** Epoch ms when the paid period started. */
  startedAt: number;
  /** Paid duration in minutes. */
  durationMin: number;
  /** Id of the scheduled local notification, if one could be scheduled. */
  reminderId: string | null;
};

/** Durations offered in one tap (minutes). */
export const METER_PRESETS = [30, 60, 120, 180] as const;
/** Warn this many minutes before the paid period ends. */
export const REMIND_BEFORE_MIN = 10;

export function meterEnd(m: ParkingMeter): number {
  return m.startedAt + m.durationMin * 60_000;
}

/** Minutes after the start at which to remind (10 min before the end, or halfway for short stays). */
export function reminderDelayMin(durationMin: number): number {
  if (durationMin > REMIND_BEFORE_MIN * 2) return durationMin - REMIND_BEFORE_MIN;
  return Math.max(1, Math.round(durationMin / 2));
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m < 10 ? `0${m}` : m}`;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
export const clock = (epochMs: number) => {
  const d = new Date(epochMs);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export type MeterStatus = {
  expired: boolean;
  /** Whole minutes left, rounded UP (never "0 min" while time remains). */
  remainingMin: number;
  tone: 'ok' | 'soon' | 'expired';
  /** "Payé jusqu'à 14:30 · reste 32 min" / "Stationnement expiré depuis 5 min". */
  text: string;
};

export function meterStatus(m: ParkingMeter, now: number): MeterStatus {
  const end = meterEnd(m);
  if (now >= end) {
    const late = Math.floor((now - end) / 60_000);
    return {
      expired: true,
      remainingMin: 0,
      tone: 'expired',
      text: late < 1 ? 'Stationnement payé terminé' : `Stationnement expiré depuis ${formatMinutes(late)}`,
    };
  }
  const remainingMin = Math.ceil((end - now) / 60_000);
  return {
    expired: false,
    remainingMin,
    tone: remainingMin <= REMIND_BEFORE_MIN ? 'soon' : 'ok',
    text: `Payé jusqu’à ${clock(end)} · reste ${formatMinutes(remainingMin)}`,
  };
}
