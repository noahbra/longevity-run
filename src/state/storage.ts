// ── Persistence wrapper (§1) ─────────────────────────────────────────────────
// The ONLY place that touches localStorage. Swap this one file for a real
// backend later. The engine never imports this.

import type { AppData } from '../types';
import { APP_DATA_VERSION, seedAppData } from './seed';

// Bumped v1 → v2 when the seed dropped its starting deload; invalidates the
// old persisted deload state so clients reseed into a normal training week.
const KEY = 'run.appData.v2';

function isAppData(x: unknown): x is AppData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Partial<AppData>;
  return (
    typeof d.version === 'number' &&
    !!d.state &&
    Array.isArray(d.workouts) &&
    Array.isArray(d.dailyLogs) &&
    !!d.settings
  );
}

export function loadAppData(today: string): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = seedAppData(today);
      saveAppData(seeded);
      return seeded;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isAppData(parsed)) throw new Error('shape mismatch');
    return parsed;
  } catch {
    const seeded = seedAppData(today);
    saveAppData(seeded);
    return seeded;
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

// Parse + validate an imported blob. Throws on malformed / wrong-version input
// so the caller can show a clear error rather than corrupting state.
export function parseImport(json: string): AppData {
  const parsed: unknown = JSON.parse(json);
  if (!isAppData(parsed)) throw new Error('Not a valid Run export.');
  if (parsed.version !== APP_DATA_VERSION) {
    throw new Error(
      `Export version ${parsed.version} does not match app version ${APP_DATA_VERSION}.`,
    );
  }
  return parsed;
}

export function resetAppData(today: string): AppData {
  const seeded = seedAppData(today);
  saveAppData(seeded);
  return seeded;
}
