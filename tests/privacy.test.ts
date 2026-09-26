import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateSettings, PRIVACY_VERSION } from '@/store/settingsMigration';
import { fetchWalkingRoute, parseOsrmRoute } from '@/services/routing';
import { formatCarAccuracy } from '@/location/presentation';
import { offsetMeters } from '@/utils/geo';
import { TRUTH } from './helpers';
import type { Settings } from '@/types';

// Stub the network layer: any call is recorded, none goes out.
vi.mock('@/services/routing', async (orig) => {
  const real = await orig<typeof import('@/services/routing')>();
  return { ...real, fetchWalkingRoute: vi.fn(real.fetchWalkingRoute) };
});

const DEFAULTS: Settings = {
  themeMode: 'auto',
  glassEffects: true,
  animations: true,
  haptics: true,
  mapType: 'standard',
  headingUpMap: true,
  highAccuracy: true,
  stabilization: 'balanced',
  onlineRouting: false,
  onlineAddress: false,
  privacyVersion: PRIVACY_VERSION,
  parkingReminders: false,
  onboarded: false,
};

describe('Privacy defaults', () => {
  it('fresh install: every online service is off', () => {
    const { settings, changed } = migrateSettings(null, DEFAULTS);
    expect(settings.onlineRouting).toBe(false);
    expect(settings.onlineAddress).toBe(false);
    expect(changed).toBe(true);
  });
  it('v1 settings with routing on by default are reset to off', () => {
    const { settings, changed } = migrateSettings({ ...DEFAULTS, onlineRouting: true, privacyVersion: undefined as never }, DEFAULTS);
    expect(settings.onlineRouting).toBe(false);
    expect(settings.privacyVersion).toBe(PRIVACY_VERSION);
    expect(changed).toBe(true);
  });
  it('a choice made after v2 is respected', () => {
    const stored = { ...DEFAULTS, onlineRouting: true, onlineAddress: true };
    const { settings, changed } = migrateSettings(stored, DEFAULTS);
    expect(settings.onlineRouting).toBe(true);
    expect(settings.onlineAddress).toBe(true);
    expect(changed).toBe(false);
  });
});

describe('Routing never runs implicitly', () => {
  const car = { ...TRUTH, id: 'car_1' };
  const far = offsetMeters(TRUTH, 0, 300);

  beforeEach(async () => {
    vi.mocked(fetchWalkingRoute).mockClear();
    vi.mocked(fetchWalkingRoute).mockResolvedValue({ ok: false, reason: 'offline' });
    vi.resetModules();
  });

  it('disabled → no request, status "disabled"', async () => {
    const { useRouteStore } = await import('@/store/routeStore');
    useRouteStore.getState().update({ user: far, car, enabled: false });
    expect(fetchWalkingRoute).not.toHaveBeenCalled();
    expect(useRouteStore.getState().status).toBe('disabled');
    expect(useRouteStore.getState().route).toBeNull();
  });

  it('enabled by the user → one explicit request', async () => {
    const { useRouteStore } = await import('@/store/routeStore');
    useRouteStore.getState().update({ user: far, car, enabled: true });
    expect(fetchWalkingRoute).toHaveBeenCalledTimes(1);
  });

  it('enabled but too close (< 40 m) → no request', async () => {
    const { useRouteStore } = await import('@/store/routeStore');
    useRouteStore.getState().update({ user: offsetMeters(TRUTH, 0, 10), car, enabled: true });
    expect(fetchWalkingRoute).not.toHaveBeenCalled();
  });
});

describe('Routing results', () => {
  it('offline → reason "offline", no route', async () => {
    const res = await fetchWalkingRoute(TRUTH, offsetMeters(TRUTH, 0, 300), {
      fetchImpl: (() => Promise.reject(new Error('network down'))) as unknown as typeof fetch,
    });
    expect(res).toEqual({ ok: false, reason: 'offline' });
  });
  it('server says no route → no route', () => {
    expect(parseOsrmRoute({ code: 'NoRoute', routes: [] })).toBeNull();
  });
  it('valid route → real distance and duration', () => {
    const r = parseOsrmRoute({
      code: 'Ok',
      routes: [{ distance: 250, duration: 190, geometry: { coordinates: [[3.028, 50.7695], [3.029, 50.77]] } }],
    });
    expect(r?.distance).toBe(250);
    expect(r?.duration).toBe(190);
  });
});

describe('Car accuracy wording (shared by Find, Home, History)', () => {
  it('GPS value, hand-placed pin, unknown', () => {
    expect(formatCarAccuracy({ accuracy: 11.2 })).toBe('±12 m');
    expect(formatCarAccuracy({ accuracy: 3, adjusted: true })).toBe('placée à la main');
    expect(formatCarAccuracy({ accuracy: null })).toBe('—');
  });
});
