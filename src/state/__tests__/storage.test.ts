import { describe, it, expect, beforeEach } from 'vitest';
import { exportJSON, loadAppData, parseImport, resetAppData, saveAppData } from '../storage';
import { seedAppData } from '../seed';

describe('storage — JSON export/import round-trip (§10)', () => {
  beforeEach(() => localStorage.clear());

  it('exporting then importing round-trips full state with no loss', () => {
    const data = seedAppData('2026-06-19');
    // mutate something so we are not just comparing the seed to itself
    data.dailyLogs.push({
      date: '2026-06-19', achilles: 'same', back: 'tight', diffuseSoreness: 'up',
      diet: { ldlBreakfast: true } as never, steps: 9123, sleepHours: 7.5, note: 'felt good',
    });
    data.state.strengthSessionsSinceDeload = 4;

    const json = exportJSON(data);
    const restored = parseImport(json);
    expect(restored).toEqual(data);
  });

  it('loadAppData seeds when storage is empty, then persists', () => {
    const a = loadAppData('2026-06-19');
    expect(a.state.inDeload).toBe(false); // seed now boots into a normal training week
    const b = loadAppData('2026-06-19');
    expect(b).toEqual(a); // second load reads what the first saved
  });

  it('reset returns a fresh seed (normal training week, no deload)', () => {
    const a = loadAppData('2026-06-19');
    a.state.inDeload = true; // dirty it
    saveAppData(a);
    const fresh = resetAppData('2026-06-19');
    expect(fresh.state.inDeload).toBe(false);
  });

  it('parseImport rejects malformed input', () => {
    expect(() => parseImport('{"nope":true}')).toThrow();
  });
});
