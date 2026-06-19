// ── Weekly review recommendation (§5.2) ──────────────────────────────────────
// Returns EXACTLY ONE recommendation. Priority order, most serious first.

import type { UserState } from '../types';
import { checkDeload } from './deload';

export interface WeekSummary {
  redDietDays: number;
  achillesWorse: boolean;
  poorSleepDays: number;
  intervalsCut: boolean;
  strengthDone: number;
}

export function weeklyRecommendation(state: UserState, s: WeekSummary): string {
  if (checkDeload(state).deload) return 'Strength stalled — repeat or deload.';
  if (s.achillesWorse) return 'Achilles worse — bike only and reduce calf load.';
  if (s.poorSleepDays >= 3 || s.intervalsCut)
    return 'Cut intervals — fatigue accumulating; hold volume.';
  if (s.redDietDays >= 3) return 'Simplify diet — breakfast and lunch first; don’t restrict harder.';
  return 'Continue — the plan is working. Repeat next week.';
}
