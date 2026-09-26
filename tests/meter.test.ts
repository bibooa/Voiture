import { describe, it, expect } from 'vitest';
import { meterEnd, meterStatus, reminderDelayMin, formatMinutes, clock, type ParkingMeter } from '@/location/meter';

const start = new Date(2026, 8, 26, 13, 58, 0).getTime(); // 13:58 local
const m = (durationMin: number): ParkingMeter => ({ startedAt: start, durationMin, reminderId: null });
const at = (minutes: number) => start + minutes * 60_000;

describe('Paid-parking meter', () => {
  it('end time and wording', () => {
    expect(clock(meterEnd(m(32)))).toBe('14:30');
    expect(meterStatus(m(32), start).text).toBe('Payé jusqu’à 14:30 · reste 32 min');
    expect(meterStatus(m(120), start).text).toBe('Payé jusqu’à 15:58 · reste 2 h');
    expect(meterStatus(m(90), start).text).toContain('reste 1 h 30');
  });
  it('remaining is rounded UP: never "0 min" while time remains', () => {
    expect(meterStatus(m(30), at(29.9)).remainingMin).toBe(1);
    expect(meterStatus(m(30), at(29.9)).expired).toBe(false);
  });
  it('turns "soon" in the last 10 minutes, then expired', () => {
    expect(meterStatus(m(60), at(45)).tone).toBe('ok');
    expect(meterStatus(m(60), at(50)).tone).toBe('soon');
    expect(meterStatus(m(60), at(60)).text).toBe('Stationnement payé terminé');
    expect(meterStatus(m(60), at(65)).text).toBe('Stationnement expiré depuis 5 min');
    expect(meterStatus(m(60), at(65)).tone).toBe('expired');
  });
  it('reminder 10 min before the end, halfway for short stays', () => {
    expect(reminderDelayMin(30)).toBe(20);
    expect(reminderDelayMin(120)).toBe(110);
    expect(reminderDelayMin(15)).toBe(8);
    expect(reminderDelayMin(1)).toBe(1);
  });
  it('formats durations', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(125)).toBe('2 h 05');
  });
});
