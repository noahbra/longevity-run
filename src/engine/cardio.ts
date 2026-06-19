// ── Cardio ramp (§3.4) ───────────────────────────────────────────────────────
// Zone 2 durations and interval rounds scale with cardioPhase. Bike is the
// default; no impact modalities until the Achilles graduation rule (§4.5).

import type { TodayCardio, UserState } from '../types';

const ZONE2_SINGLE_MINUTES: Record<1 | 2 | 3, number> = { 1: 45, 2: 60, 3: 70 };
const ZONE2_WEEKLY: Record<1 | 2 | 3, string> = {
  1: '45 + 45 min across your two Zone 2 sessions',
  2: '45 + 60 min across your two Zone 2 sessions',
  3: '60 + 60–75 min (if recovery good)',
};
const INTERVAL_ROUNDS: Record<1 | 2 | 3, number> = { 1: 2, 2: 3, 3: 4 };

export function zone2Prescription(state: UserState): TodayCardio {
  return {
    type: 'Zone2',
    plannedDurationMinutes: ZONE2_SINGLE_MINUTES[state.cardioPhase],
    modalityDefault: 'Bike',
  };
}

export function intervalsPrescription(state: UserState): TodayCardio {
  return {
    type: 'Intervals',
    rounds: INTERVAL_ROUNDS[state.cardioPhase],
    workMinutes: 4,
    recoveryMinutes: 3,
    modalityDefault: 'Bike',
  };
}

export function recoveryPrescription(): TodayCardio {
  return { type: 'Recovery', plannedDurationMinutes: 30, modalityDefault: 'Walk' };
}

export function zone2WeeklyText(phase: 1 | 2 | 3): string {
  return ZONE2_WEEKLY[phase];
}

// Deload cardio: 1–2 easy Zone 2 walks (§3.3).
export function deloadCardio(): TodayCardio {
  return { type: 'Recovery', plannedDurationMinutes: 30, modalityDefault: 'Easy walk' };
}

export interface CardioResult {
  completedClean: boolean;
  recoveryGood: boolean;
  formIntact: boolean;
}

// Intervals: progress a phase only when completed cleanly with good recovery.
// Last-interval form breaks → repeat the phase (§3.4).
export function nextIntervalPhase(
  phase: 1 | 2 | 3,
  result: CardioResult,
): { phase: 1 | 2 | 3; note: string } {
  if (!result.formIntact) {
    return { phase, note: 'Form broke on the last interval — repeat this phase.' };
  }
  if (result.completedClean && result.recoveryGood && phase < 3) {
    return { phase: (phase + 1) as 1 | 2 | 3, note: 'Clean with good recovery — advance one phase.' };
  }
  return { phase, note: 'Hold this phase.' };
}

// Zone 2: talk-test fail → easier next time (hold volume, never advance) (§3.4).
export function nextZone2Phase(
  phase: 1 | 2 | 3,
  talkTest: 'passed' | 'too-easy' | 'too-hard',
  recoveryGood: boolean,
): { phase: 1 | 2 | 3; note: string } {
  if (talkTest === 'too-hard') {
    return { phase, note: 'Talk-test failed — keep it easier; hold this phase.' };
  }
  if (talkTest === 'too-easy' && recoveryGood && phase < 3) {
    return { phase: (phase + 1) as 1 | 2 | 3, note: 'Comfortably easy — advance one phase.' };
  }
  return { phase, note: 'Hold this phase.' };
}
