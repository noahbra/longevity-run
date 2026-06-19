// ── Resumption (§4.6) + Achilles graduation (§4.5) ───────────────────────────

import type { UserState } from '../types';
import { daysBetween } from '../lib/date';

export interface ResumptionAdjustment {
  factor: number; // multiply working loads by this on the comeback
  cardioPhaseDelta: number; // phases to drop
  recommendDeload: boolean;
  note: string | null;
}

// Based on the gap since lastSessionDate (§4.6).
export function resumptionAdjustment(state: UserState, today: string): ResumptionAdjustment {
  if (!state.lastSessionDate) {
    return { factor: 1, cardioPhaseDelta: 0, recommendDeload: false, note: null };
  }
  const gap = daysBetween(state.lastSessionDate, today);
  if (gap <= 7) {
    return { factor: 1, cardioPhaseDelta: 0, recommendDeload: false, note: null };
  }
  if (gap <= 21) {
    return {
      factor: 0.875, // 85–90%
      cardioPhaseDelta: 1,
      recommendDeload: false,
      note: 'Off 1–3 weeks — restart lifts at 85–90% and rebuild over 1–2 weeks; cardio drops one phase.',
    };
  }
  return {
    factor: 1, // a deload week governs the comeback loads
    cardioPhaseDelta: 1,
    recommendDeload: true,
    note: 'Off more than 3 weeks — take one deload week, then ramp.',
  };
}

// Impact modalities stay locked until next-morning Achilles has been
// same-or-better for 4–6 consecutive weeks (§4.5). 28 mornings ≈ 4 weeks.
export const ACHILLES_GRADUATION_MORNINGS = 28;

export function achillesCleanStreak(state: UserState): number {
  const a = state.trends.achilles;
  let streak = 0;
  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i] === 'same' || a[i] === 'better') streak++;
    else break;
  }
  return streak;
}

export function impactUnlocked(state: UserState): boolean {
  return achillesCleanStreak(state) >= ACHILLES_GRADUATION_MORNINGS;
}
