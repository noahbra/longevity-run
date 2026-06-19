// ── selectToday (§3.1) ───────────────────────────────────────────────────────
// Reads State + today's recovery inputs → the de-escalated directive and, if a
// strength day, per-exercise loads. Pure. This is the function the Today screen
// renders.

import type {
  Directive,
  RecoveryInputs,
  SessionType,
  TodayCardio,
  TodayExercise,
  TodayPlan,
  UserState,
} from '../types';
import {
  LOWER_BODY_LIFTS,
  OPTIONAL_BLOCKS,
  severityRank,
  strengthTemplates,
} from './reference';
import { resolveDirective } from './governors';
import type { ResolvedDirective } from './governors';
import { resumptionAdjustment } from './resumption';
import type { ResumptionAdjustment } from './resumption';
import { deloadCardio, intervalsPrescription, recoveryPrescription, zone2Prescription } from './cardio';
import { deloadLoad } from './deload';
import { roundLoad, targetString } from './util';

export interface SelectTodayResult {
  plan: TodayPlan;
  resolved: ResolvedDirective;
  inDeload: boolean;
  resumption: ResumptionAdjustment;
  // Optional non-load-tracked blocks to render under a StrengthC day (§2).
  optionalBlocks: string[];
}

function isStrength(t: SessionType): t is 'StrengthA' | 'StrengthB' | 'StrengthC' {
  return t === 'StrengthA' || t === 'StrengthB' || t === 'StrengthC';
}

const REDUCE_LOWER_FACTOR = 0.85;

function buildStrengthExercises(
  state: UserState,
  sessionType: 'StrengthA' | 'StrengthB' | 'StrengthC',
  opts: { factor: number; reduceLower: boolean; deload: boolean },
): TodayExercise[] {
  const names = strengthTemplates[sessionType].filter((n) => !OPTIONAL_BLOCKS.has(n));
  const out: TodayExercise[] = [];

  for (const name of names) {
    const lift = state.lifts[name];
    if (!lift) continue;

    const bodyweight = lift.increment === 0 && lift.weight === 0;
    let scheme = lift.scheme;
    let weight = lift.weight;

    if (opts.deload) {
      const dl = deloadLoad(lift);
      weight = dl.weight;
      scheme = { ...lift.scheme, sets: dl.sets };
    } else {
      if (opts.factor !== 1) weight = roundLoad(weight * opts.factor, lift.increment);
      if (opts.reduceLower && LOWER_BODY_LIFTS.has(name)) {
        weight = roundLoad(weight * REDUCE_LOWER_FACTOR, lift.increment);
      }
    }

    out.push({
      name,
      target: targetString(scheme),
      load: bodyweight ? 'bodyweight' : weight,
      scheme,
    });
  }
  return out;
}

function cardioFor(state: UserState, sessionType: SessionType, directive: Directive): TodayCardio {
  // Severity gating for cardio (§4.1, §5.1).
  if (severityRank(directive) >= severityRank('RECOVERY_ONLY')) return recoveryPrescription();

  if (sessionType === 'Intervals') {
    // Convert intervals to Zone 2 whenever directive ≥ CUT_INTERVALS (§5.1).
    if (severityRank(directive) >= severityRank('CUT_INTERVALS_DO_ZONE2')) {
      return zone2Prescription(state);
    }
    return intervalsPrescription(state);
  }
  if (sessionType === 'Zone2') return zone2Prescription(state);
  return recoveryPrescription();
}

export function selectToday(
  state: UserState,
  recovery: RecoveryInputs,
  today: string,
): SelectTodayResult {
  const sessionType = state.schedule[state.nextIndex];
  const resolved = resolveDirective(recovery, state.trends.sleep);
  const resumption = resumptionAdjustment(state, today);
  const directive = resolved.directive;

  const plan: TodayPlan = { date: today, sessionType, directive };
  const optionalBlocks: string[] =
    sessionType === 'StrengthC'
      ? strengthTemplates.StrengthC.filter((n) => OPTIONAL_BLOCKS.has(n))
      : [];

  // STOP / RECOVERY_ONLY override everything to a recovery walk.
  if (severityRank(directive) >= severityRank('RECOVERY_ONLY')) {
    plan.cardio = recoveryPrescription();
    return { plan, resolved, inDeload: state.inDeload, resumption, optionalBlocks: [] };
  }

  if (state.inDeload) {
    if (isStrength(sessionType)) {
      plan.exercises = buildStrengthExercises(state, sessionType, {
        factor: 1,
        reduceLower: false,
        deload: true,
      });
    } else {
      plan.cardio = deloadCardio();
    }
    return { plan, resolved, inDeload: true, resumption, optionalBlocks };
  }

  if (isStrength(sessionType)) {
    const reduceLower = severityRank(directive) >= severityRank('REDUCE_LOWER_BODY');
    plan.exercises = buildStrengthExercises(state, sessionType, {
      factor: resumption.factor,
      reduceLower,
      deload: false,
    });
  } else {
    plan.cardio = cardioFor(state, sessionType, directive);
  }

  return { plan, resolved, inDeload: false, resumption, optionalBlocks };
}
