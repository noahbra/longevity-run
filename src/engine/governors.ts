// ── Governors + precedence resolver (§4) ─────────────────────────────────────
// Each governor reads overlapping recovery inputs and returns a severity level.
// The day's directive is the MOST CONSERVATIVE level any governor returns.
// diffuseSoreness is NEVER read here (§7) — it cannot move a directive.

import type { BackTrend, Directive, Quality, RecoveryInputs, Trend } from '../types';
import { severityRank } from './reference';

export interface GovernorOutput {
  directive: Directive;
  note?: string;
}

// §4.2
export function achillesGovernor(achilles: Trend): GovernorOutput {
  switch (achilles) {
    case 'better':
    case 'same':
      return { directive: 'RUN_PLAN' };
    case 'worse':
      return { directive: 'CUT_INTERVALS_DO_ZONE2', note: 'Achilles worse — no impact intervals; keep strength controlled.' };
    case 'worse_24h':
      return { directive: 'REDUCE_LOWER_BODY', note: 'Achilles worse >24h — reduce calf load and cut intervals.' };
  }
}

// §4.3
export function backGovernor(back: BackTrend): GovernorOutput {
  switch (back) {
    case 'better':
    case 'same':
      return { directive: 'RUN_PLAN' };
    case 'tight':
      return { directive: 'RUN_PLAN', note: 'Back tight but improving — avoid grinders.' };
    case 'pain_24h':
      return { directive: 'REDUCE_LOWER_BODY', note: 'Back pain >24h after hinge — reduce lower body and swap the hinge.' };
    case 'radiating':
      return { directive: 'STOP_SEEK_ASSESSMENT', note: 'Radiating / numbness / weakness — seek assessment.' };
  }
}

// §4.4 — sleep / fatigue. `recentSleep` is prior nights (not today).
export function sleepGovernor(
  sleepQuality: Quality,
  energy: Quality,
  recentSleep: Quality[],
  sleepHours?: number,
): GovernorOutput {
  // <6h sleep → downgrade intensity.
  if (sleepHours !== undefined && sleepHours < 6) {
    return { directive: 'CUT_INTERVALS_DO_ZONE2', note: 'Under 6h sleep — downgrade intensity.' };
  }
  // High fatigue.
  if (energy === 'poor') {
    if (sleepQuality === 'poor') {
      return { directive: 'RECOVERY_ONLY', note: 'High fatigue and poor sleep — recovery only.' };
    }
    return { directive: 'CUT_INTERVALS_DO_ZONE2', note: 'High fatigue — cut intervals.' };
  }
  // Two poor nights in a row (last night logged + today).
  const lastNight = recentSleep[recentSleep.length - 1];
  if (sleepQuality === 'poor' && lastNight === 'poor') {
    return { directive: 'CUT_INTERVALS_DO_ZONE2', note: 'Two poor nights — no interval day.' };
  }
  return { directive: 'RUN_PLAN' };
}

export interface ResolvedDirective {
  directive: Directive;
  notes: string[];
  perGovernor: { achilles: Directive; back: Directive; sleep: Directive };
}

// The critical fix (§4.1): directive = max severity across all governors.
// Never let one governor's "continue" override another's "reduce".
export function resolveDirective(
  recovery: RecoveryInputs,
  recentSleep: Quality[] = [],
): ResolvedDirective {
  const a = achillesGovernor(recovery.achilles);
  const b = backGovernor(recovery.back);
  const s = sleepGovernor(recovery.sleepQuality, recovery.energy, recentSleep, recovery.sleepHours);

  const outputs = [a, b, s];
  let winner = outputs[0];
  for (const o of outputs) {
    if (severityRank(o.directive) > severityRank(winner.directive)) winner = o;
  }

  const notes = outputs.map((o) => o.note).filter((n): n is string => !!n);

  return {
    directive: winner.directive,
    notes,
    perGovernor: { achilles: a.directive, back: b.directive, sleep: s.directive },
  };
}
