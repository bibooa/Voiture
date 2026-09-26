import { useCarStore } from '@/store/carStore';
import { clock, meterEnd, reminderDelayMin, type ParkingMeter } from '@/location/meter';
import { cancelReminder, scheduleMeterReminder } from './notifications';

/**
 * Start (or replace) the paid-parking period of a car and its local reminder.
 * Resolves to true when the reminder could be scheduled (notifications allowed).
 */
export async function startMeter(carId: string, durationMin: number): Promise<boolean> {
  await stopMeter(carId);
  const meter: ParkingMeter = { startedAt: Date.now(), durationMin, reminderId: null };
  const delay = reminderDelayMin(durationMin);
  const reminderId = await scheduleMeterReminder(delay, clock(meterEnd(meter)), durationMin - delay);
  useCarStore.getState().setMeter(carId, { ...meter, reminderId });
  return reminderId != null;
}

export async function stopMeter(carId: string): Promise<void> {
  const car = useCarStore.getState().history.find((h) => h.id === carId);
  if (car?.meter?.reminderId) await cancelReminder(car.meter.reminderId);
  if (car?.meter) useCarStore.getState().setMeter(carId, null);
}
