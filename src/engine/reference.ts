// ── Reference layer (fixed, read-only) ───────────────────────────────────────
// Plan content. Never recomputed. The engine reads this; it never mutates it.

import type { Directive, SessionType } from '../types';

// Which lifts belong to each strength session (machine-readable, §2).
export const strengthTemplates: Record<
  'StrengthA' | 'StrengthB' | 'StrengthC',
  string[]
> = {
  StrengthA: [
    'Back squat',
    'Bench press',
    'Chest-supported row',
    'Romanian deadlift',
    'Standing calf raise',
    'Tibialis raise',
  ],
  StrengthB: [
    'Deadlift / trap-bar',
    'Overhead press',
    'Lat pulldown',
    'Bulgarian split squat',
    'Seated/bent-knee calf raise',
    'Face pulls',
  ],
  StrengthC: [
    'Leg press',
    'Incline DB press',
    'Row or pulldown',
    'Leg curl',
    'Lateral raise',
    'Power movement',
    'Arms (optional)',
  ],
};

// Non-engine optional blocks (§2). Not keyed in state.lifts; no progression.
export const OPTIONAL_BLOCKS = new Set(['Power movement', 'Arms (optional)']);

export const optionalBlockPrescription: Record<string, string> = {
  'Power movement':
    'Sled push / loaded carry / med-ball throw — 4–6 short crisp sets. Stop fresh.',
  'Arms (optional)': 'Optional 2–3 sets, your choice.',
};

// Hinge lifts get the most conservative progression (§3.2).
export const HINGE_LIFTS = new Set(['Deadlift / trap-bar', 'Romanian deadlift']);

// Lower-body lifts — load reduced under the REDUCE_LOWER_BODY directive (§4.3).
export const LOWER_BODY_LIFTS = new Set([
  'Back squat',
  'Deadlift / trap-bar',
  'Romanian deadlift',
  'Bulgarian split squat',
  'Leg press',
  'Leg curl',
  'Standing calf raise',
  'Seated/bent-knee calf raise',
  'Tibialis raise',
]);

// De-escalation ladder, low → high severity (§4.1).
export const SEVERITY_ORDER: Directive[] = [
  'RUN_PLAN',
  'CUT_INTERVALS_DO_ZONE2',
  'REDUCE_LOWER_BODY',
  'RECOVERY_ONLY',
  'STOP_SEEK_ASSESSMENT',
];

export function severityRank(d: Directive): number {
  return SEVERITY_ORDER.indexOf(d);
}

// One calm line per directive (§5.1). No diagnosis language.
export const directiveLine: Record<Directive, string> = {
  RUN_PLAN: 'Run today’s plan.',
  CUT_INTERVALS_DO_ZONE2: 'Cut intervals — do Zone 2.',
  REDUCE_LOWER_BODY: 'Reduce lower-body load.',
  RECOVERY_ONLY: 'Recovery walk only.',
  STOP_SEEK_ASSESSMENT: 'Sharp pain or radiating symptoms — seek assessment.',
};

export const SESSION_LABELS: Record<SessionType, string> = {
  StrengthA: 'Strength A',
  StrengthB: 'Strength B',
  StrengthC: 'Strength C',
  Zone2: 'Zone 2',
  Intervals: 'Intervals',
  Recovery: 'Recovery',
};

// Diet checklist copy (§3.5 / §5.1). No shame language.
export const dietLabels: Record<string, string> = {
  ldlBreakfast: 'LDL-lowering breakfast (oats + soluble fiber)',
  psyllium: 'Psyllium',
  legumes: 'Legumes',
  nuts: 'Nuts',
  proteinTarget: 'Protein target',
  lowSaturatedFat: 'Low saturated fat',
  vegetables: 'Vegetables',
  dessertControlled: 'Dessert controlled',
  noProcessedMeat: 'No processed meat',
};

export const dietCopy: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Good enough, repeat tomorrow.',
  yellow: 'Tighten one meal.',
  red: 'Reset with breakfast + legumes.',
};

// ── Plan reference (read-only renderings, §5.3). Reminder language only. ──────
export const cardioRamp = {
  zone2: [
    { phase: 1, text: '45 + 45 min' },
    { phase: 2, text: '45 + 60 min' },
    { phase: 3, text: '60 + 60–75 min (if recovery good)' },
  ],
  intervals: [
    { phase: 1, text: '2 × (4 hard / 3 easy)' },
    { phase: 2, text: '3 × (4 hard / 3 easy)' },
    { phase: 3, text: '4 × (4 hard / 3 easy) — the 4×4' },
  ],
  note: 'Bike default; rower only if back tolerates. No running / hills / jump-rope until the Achilles graduation rule is met (4–6 weeks same-or-better).',
};

export const mealFramework = [
  'Breakfast: oats + soluble fiber (psyllium), berries, nuts.',
  'Lunch / dinner: legumes, vegetables, lean protein to target.',
  'Keep saturated fat low; no processed meat.',
  'Dessert controlled, not eliminated.',
];

export const supplements = [
  'Creatine — daily.',
  'Psyllium — separate from medications by ~2h.',
  'Protein to target across the day.',
];

export const sleepProtocol = [
  'Consistent sleep/wake window.',
  'No alcohol near bed.',
  'No caffeine after your cutoff.',
];

// Medical guardrails: reminder language ONLY (§7). Never decide / interpret.
export const medicalReminders = [
  'Do a 7-day home BP block.',
  'Ask your physician about a home sleep-apnea test.',
  'Retest LDL / ApoB in 8–12 weeks.',
  'Tell the clinician you take creatine before kidney labs.',
  'Separate psyllium from medications by ~2h.',
];

export const sorenessReminder =
  'New diffuse muscle soreness while starting a statin is worth noting for your doctor — log it for your next visit.';
