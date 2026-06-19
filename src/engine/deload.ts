// ── Deload (§3.3) ────────────────────────────────────────────────────────────
// checkDeload reads State and decides whether a deload is due. Entry/exit are
// pure state transitions. Deload is calendar-based (7 days) so a missed session
// can't trap you in a deload that never exits.

import type { LiftState, UserState } from '../types';
import { daysBetween } from '../lib/date';
import { roundLoad } from './util';

export const DELOAD_SESSION_BACKSTOP = 18; // 3 strength sessions/week × 6 weeks
export const DELOAD_RECOVERY_STREAK = 7; // red/yellow days in a row
export const DELOAD_DAYS = 7; // calendar length of a deload

export interface DeloadDecision {
  deload: boolean;
  reason: string | null;
}

// A recovery day is "red/yellow" if any governor input is off (§3.3 trigger 3).
// Zips the trend tails by position and counts the trailing consecutive flagged run.
export function recoveryFlagStreak(state: UserState): number {
  const { achilles, back, sleep } = state.trends;
  const n = Math.min(achilles.length, back.length, sleep.length);
  let streak = 0;
  for (let i = 1; i <= n; i++) {
    const a = achilles[achilles.length - i];
    const b = back[back.length - i];
    const s = sleep[sleep.length - i];
    const flagged =
      a === 'worse' ||
      a === 'worse_24h' ||
      b === 'tight' ||
      b === 'pain_24h' ||
      b === 'radiating' ||
      s === 'poor';
    if (flagged) streak++;
    else break;
  }
  return streak;
}

export function checkDeload(state: UserState): DeloadDecision {
  if (state.inDeload) return { deload: false, reason: null };

  if (state.strengthSessionsSinceDeload >= DELOAD_SESSION_BACKSTOP) {
    return {
      deload: true,
      reason: `${state.strengthSessionsSinceDeload} strength sessions since last deload (≥ ${DELOAD_SESSION_BACKSTOP}).`,
    };
  }

  const stalledMains = Object.values(state.lifts).filter(
    (l) => l.kind === 'main' && l.consecutiveStalls >= 2,
  ).length;
  if (stalledMains >= 2) {
    return { deload: true, reason: `${stalledMains} main lifts stalled for 2+ exposures.` };
  }

  if (recoveryFlagStreak(state) >= DELOAD_RECOVERY_STREAK) {
    return {
      deload: true,
      reason: `Recovery red/yellow for ${DELOAD_RECOVERY_STREAK}+ consecutive days.`,
    };
  }

  return { deload: false, reason: null };
}

// Deload prescription for one lift: ~60% load, 1–2 sets, no failure (§3.3).
export function deloadLoad(lift: LiftState): { weight: number; sets: number } {
  return {
    weight: roundLoad(lift.weight * 0.6, lift.increment),
    sets: Math.min(2, Math.max(1, lift.scheme.sets - 1)),
  };
}

// Triggered entry: bake the post-deload resume target (90–95% of working load)
// into stored weights now, clear stalls, reset the session counter (§3.3).
export function enterDeload(state: UserState, today: string): UserState {
  const lifts: Record<string, LiftState> = {};
  for (const [name, l] of Object.entries(state.lifts)) {
    lifts[name] = {
      ...l,
      weight: l.weight === 0 ? 0 : roundLoad(l.weight * 0.925, l.increment),
      consecutiveStalls: 0,
    };
  }
  return {
    ...state,
    inDeload: true,
    deloadStartDate: today,
    strengthSessionsSinceDeload: 0,
    lifts,
  };
}

// Exit once 7 calendar days have passed. Loads already sit at the resume target.
export function maybeExitDeload(state: UserState, today: string): UserState {
  if (!state.inDeload || !state.deloadStartDate) return state;
  if (daysBetween(state.deloadStartDate, today) >= DELOAD_DAYS) {
    return { ...state, inDeload: false };
  }
  return state;
}

// Run each session: exit a finished deload, else enter one if a trigger fires.
export function reconcileDeload(state: UserState, today: string): UserState {
  const exited = maybeExitDeload(state, today);
  if (exited.inDeload) return exited;
  const decision = checkDeload(exited);
  return decision.deload ? enterDeload(exited, today) : exited;
}
