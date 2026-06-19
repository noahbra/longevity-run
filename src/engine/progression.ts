// ── Strength progression (§3.2) ──────────────────────────────────────────────
// Pure. Given a lift and its last sets, returns the next recommendation.
// The caller applies newWeight / newConsecutiveStalls to state.

import type { BackTrend, LiftState, SetEntry } from '../types';
import { HINGE_LIFTS } from './reference';
import { roundLoad } from './util';

export type ProgressionAction = 'add' | 'repeat' | 'reduce' | 'substitute';

export interface Recommendation {
  action: ProgressionAction;
  newWeight: number;
  newConsecutiveStalls: number;
  progressed: boolean;
  flagSubstitution: boolean;
  note: string;
}

export interface ProgressionContext {
  // For hinge lifts only: the back trend logged the morning AFTER this session.
  backResponseNextDay?: BackTrend;
}

// Definition of "clean" (§3.2): correct quality, no pain, and (for main lifts) RIR ≥ 1.
export function isCleanSet(set: SetEntry, isMain: boolean): boolean {
  if (set.quality !== 'clean') return false;
  if (set.pain !== 'none') return false;
  if (isMain && (set.rir ?? 0) < 1) return false;
  return true;
}

function worstPain(sets: SetEntry[]): 'none' | 'discomfort' | 'pain' {
  if (sets.some((s) => s.pain === 'pain')) return 'pain';
  if (sets.some((s) => s.pain === 'discomfort')) return 'discomfort';
  return 'none';
}

function reduceWeight(lift: LiftState): number {
  // Reduce 5–10%; take ~10% (conservative end) and round to the lift's step.
  return roundLoad(lift.weight * 0.9, lift.increment);
}

export function nextLoad(
  name: string,
  lift: LiftState,
  lastSets: SetEntry[],
  ctx: ProgressionContext = {},
): Recommendation {
  const isMain = lift.kind === 'main';
  const isHinge = HINGE_LIFTS.has(name);
  const isBodyweight = lift.increment === 0 && lift.weight === 0;
  const { repLow, repHigh } = lift.scheme;
  const stalls = lift.consecutiveStalls;

  // No sets logged → nothing changes.
  if (lastSets.length === 0) {
    return {
      action: 'repeat',
      newWeight: lift.weight,
      newConsecutiveStalls: stalls,
      progressed: false,
      flagSubstitution: false,
      note: 'No sets logged — hold.',
    };
  }

  // 1) Pain precedence (strict, overrides progression).
  const pain = worstPain(lastSets);
  if (pain === 'pain') {
    if (isHinge) {
      return {
        action: 'substitute',
        newWeight: reduceWeight(lift),
        newConsecutiveStalls: 0,
        progressed: false,
        flagSubstitution: true,
        note: 'Pain on the hinge — substitute (RDL / trap-bar / hip-thrust) and reduce load.',
      };
    }
    return {
      action: 'reduce',
      newWeight: reduceWeight(lift),
      newConsecutiveStalls: 0,
      progressed: false,
      flagSubstitution: true,
      note: 'Pain flagged — reduce load and consider a substitution. Do not progress.',
    };
  }
  if (pain === 'discomfort') {
    return {
      action: 'repeat',
      newWeight: lift.weight,
      newConsecutiveStalls: stalls + 1,
      progressed: false,
      flagSubstitution: false,
      note: 'Discomfort — hold; do not progress this exposure.',
    };
  }

  // 2) Form breakdown blocks progression and flags a possible reduction next time.
  if (lastSets.some((s) => s.quality === 'breakdown')) {
    return {
      action: 'repeat',
      newWeight: lift.weight,
      newConsecutiveStalls: stalls + 1,
      progressed: false,
      flagSubstitution: true,
      note: 'Form broke down — hold; consider reducing next time.',
    };
  }

  // 3) Hinge-specific next-day back response (most conservative).
  if (isHinge && ctx.backResponseNextDay) {
    const b = ctx.backResponseNextDay;
    if (b === 'radiating' || b === 'pain_24h') {
      return {
        action: 'substitute',
        newWeight: reduceWeight(lift),
        newConsecutiveStalls: 0,
        progressed: false,
        flagSubstitution: true,
        note: 'Back pain after the hinge — substitute (RDL / trap-bar / hip-thrust).',
      };
    }
    if (b === 'tight') {
      return {
        action: 'reduce',
        newWeight: reduceWeight(lift),
        newConsecutiveStalls: 0,
        progressed: false,
        flagSubstitution: false,
        note: 'Back tight >24h — reduce the hinge 5–10%.',
      };
    }
  }

  // 4) Grindy blocks progression (repeat).
  if (lastSets.some((s) => s.quality === 'grindy')) {
    return {
      action: 'repeat',
      newWeight: lift.weight,
      newConsecutiveStalls: stalls + 1,
      progressed: false,
      flagSubstitution: false,
      note: 'Grindy — repeat the same load.',
    };
  }

  const missedBottom = lastSets.some((s) => s.reps < repLow);
  if (missedBottom) {
    // First miss → repeat once. A second stall → reduce 5–10% and reset.
    if (stalls >= 1) {
      return {
        action: 'reduce',
        newWeight: reduceWeight(lift),
        newConsecutiveStalls: 0,
        progressed: false,
        flagSubstitution: false,
        note: 'Second consecutive stall — reduce 5–10% and reset.',
      };
    }
    return {
      action: 'repeat',
      newWeight: lift.weight,
      newConsecutiveStalls: stalls + 1,
      progressed: false,
      flagSubstitution: false,
      note: 'Missed bottom of range — repeat once.',
    };
  }

  const allClean = lastSets.every((s) => isCleanSet(s, isMain));
  const allAtTop = lastSets.every((s) => s.reps >= repHigh);

  if (allAtTop && allClean) {
    if (isBodyweight) {
      return {
        action: 'add',
        newWeight: lift.weight,
        newConsecutiveStalls: 0,
        progressed: true,
        flagSubstitution: false,
        note: 'Top of range, clean — add reps or a light load next time.',
      };
    }
    return {
      action: 'add',
      newWeight: lift.weight + lift.increment,
      newConsecutiveStalls: 0,
      progressed: true,
      flagSubstitution: false,
      note: `Top of range on all sets, clean — add ${lift.increment} lb.`,
    };
  }

  // Top on only some sets, or within range, or a main lift short of RIR ≥ 1 → repeat.
  return {
    action: 'repeat',
    newWeight: lift.weight,
    newConsecutiveStalls: stalls + 1,
    progressed: false,
    flagSubstitution: false,
    note: 'Within range — repeat and aim for the top next time.',
  };
}
