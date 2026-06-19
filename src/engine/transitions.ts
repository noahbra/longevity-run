// ── State transitions (pure) ─────────────────────────────────────────────────
// applyWorkout / applyDailyLog take state in → state out. No side effects, no
// clock. This is what makes "logging changes tomorrow's prescription" testable.

import type { DailyLog, SessionType, UserState, WorkoutLog } from '../types';
import { nextLoad } from './progression';

const STRENGTH_SESSIONS = new Set<SessionType>(['StrengthA', 'StrengthB', 'StrengthC']);
const TREND_CAP = 90;

export function isStrengthSession(t: SessionType): boolean {
  return STRENGTH_SESSIONS.has(t);
}

function advanceIndex(state: UserState): number {
  return (state.nextIndex + 1) % state.schedule.length;
}

// Logging a completed workout: progress each tracked lift, advance the schedule
// pointer, bump the deload counter (strength only, not during a deload).
export function applyWorkout(state: UserState, log: WorkoutLog): UserState {
  const lifts = { ...state.lifts };

  // No progression during a deload — loads are held at the resume target.
  if (!state.inDeload) {
    for (const ex of log.exercises) {
      const lift = lifts[ex.name];
      if (!lift) continue; // optional blocks / untracked
      const rec = nextLoad(ex.name, lift, ex.sets);
      lifts[ex.name] = {
        ...lift,
        weight: rec.newWeight,
        consecutiveStalls: rec.newConsecutiveStalls,
      };
    }
  }

  const strength = isStrengthSession(log.sessionType);
  const counter =
    strength && !state.inDeload
      ? state.strengthSessionsSinceDeload + 1
      : state.strengthSessionsSinceDeload;

  return {
    ...state,
    lifts,
    strengthSessionsSinceDeload: counter,
    nextIndex: advanceIndex(state),
    lastSessionDate: log.date,
  };
}

// Logging a cardio session advances the schedule pointer + lastSessionDate.
// (Phase changes are applied separately via cardio.nextIntervalPhase etc.)
export function applyCardioSession(state: UserState, date: string): UserState {
  return { ...state, nextIndex: advanceIndex(state), lastSessionDate: date };
}

// Rebuild the trend tails from the full daily-log history (date order). Used by
// the store so editing today's recovery card is idempotent rather than appending.
export function rebuildTrends(logs: DailyLog[]): UserState['trends'] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  return {
    achilles: sorted.map((l) => l.achilles),
    back: sorted.map((l) => l.back),
    sleep: sorted.filter((l) => l.sleepQuality).map((l) => l.sleepQuality!),
    diffuseSoreness: sorted.map((l) => l.diffuseSoreness),
  };
}

// Logging the morning recovery card accumulates trend history (drives governors
// and the deload recovery-streak trigger). Capped to the last 90 entries.
export function applyDailyLog(state: UserState, daily: DailyLog): UserState {
  const cap = (arr: unknown[]) => arr.slice(-TREND_CAP);
  return {
    ...state,
    trends: {
      achilles: cap([...state.trends.achilles, daily.achilles]) as UserState['trends']['achilles'],
      back: cap([...state.trends.back, daily.back]) as UserState['trends']['back'],
      sleep: cap(
        daily.sleepQuality ? [...state.trends.sleep, daily.sleepQuality] : state.trends.sleep,
      ) as UserState['trends']['sleep'],
      diffuseSoreness: cap([
        ...state.trends.diffuseSoreness,
        daily.diffuseSoreness,
      ]) as UserState['trends']['diffuseSoreness'],
    },
  };
}
