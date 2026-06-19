// ── Seed data (§6) ───────────────────────────────────────────────────────────
// Boot with the user's real numbers, IN A DELOAD. The stored lift weights are
// the post-deload WORKING loads to resume at; the engine derives the ~60%
// deload prescription while inDeload === true.

import type { AppData, LiftState, UserState } from '../types';

// Lifts whose "load" is bodyweight, rendered as such (no number, no progression jump).
export const BODYWEIGHT_LIFTS = new Set(['Tibialis raise']);

type SeedRow = [
  name: string,
  weight: number,
  sets: number,
  repLow: number,
  repHigh: number,
  increment: number,
  kind: LiftState['kind'],
];

// [name, weight, sets, repLow, repHigh, increment, kind]
const SEED_LIFTS: SeedRow[] = [
  ['Back squat', 180, 3, 5, 5, 5, 'main'],
  ['Bench press', 140, 3, 5, 8, 5, 'main'],
  ['Overhead press', 95, 3, 5, 8, 5, 'main'],
  ['Deadlift / trap-bar', 205, 3, 3, 5, 5, 'main'],
  ['Chest-supported row', 85, 3, 8, 12, 5, 'accessory'],
  ['Romanian deadlift', 135, 3, 8, 10, 5, 'accessory'],
  ['Lat pulldown', 125, 3, 8, 12, 5, 'accessory'],
  ['Bulgarian split squat', 30, 3, 8, 10, 5, 'accessory'],
  ['Leg press', 275, 3, 8, 12, 10, 'accessory'],
  ['Incline DB press', 45, 3, 8, 12, 5, 'accessory'],
  ['Leg curl', 90, 3, 10, 15, 5, 'accessory'],
  ['Standing calf raise', 135, 3, 8, 12, 10, 'accessory'],
  ['Seated/bent-knee calf raise', 90, 3, 10, 15, 5, 'accessory'],
  ['Tibialis raise', 0, 3, 15, 25, 0, 'accessory'],
  ['Lateral raise', 15, 3, 12, 20, 2.5, 'accessory'],
  ['Face pulls', 50, 3, 12, 20, 5, 'accessory'],
  // In the StrengthC template but not in the §6 table; seeded to mirror the pulldown
  // so the engine can prescribe a load. Adjust in Settings.
  ['Row or pulldown', 125, 3, 8, 12, 5, 'accessory'],
];

function buildLifts(): Record<string, LiftState> {
  const lifts: Record<string, LiftState> = {};
  for (const [name, weight, sets, repLow, repHigh, increment, kind] of SEED_LIFTS) {
    lifts[name] = {
      weight,
      scheme: { sets, repLow, repHigh },
      increment,
      consecutiveStalls: 0,
      kind,
    };
  }
  return lifts;
}

export function seedState(today: string): UserState {
  return {
    schedule: ['StrengthA', 'Zone2', 'StrengthB', 'Intervals', 'Recovery', 'StrengthC', 'Zone2'],
    nextIndex: 0,
    inDeload: true,
    deloadStartDate: today,
    strengthSessionsSinceDeload: 0,
    cardioPhase: 1,
    lifts: buildLifts(),
    trends: { achilles: [], back: [], sleep: [], diffuseSoreness: [] },
    stepBaseline: 8000,
    lastSessionDate: null,
  };
}

export const APP_DATA_VERSION = 1;

export function seedAppData(today: string): AppData {
  return {
    version: APP_DATA_VERSION,
    state: seedState(today),
    workouts: [],
    dailyLogs: [],
    settings: {
      substitutions: {},
      showMedicalReminders: true,
      caffeineCutoffHour: 14,
    },
  };
}
