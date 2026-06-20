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

// ── Eat tab: the fixed menu (theme nights, §Diet) ────────────────────────────
// Deterministic by weekday. Lunch = the prior day's dinner leftovers.
export const defaultBreakfast = 'Oats · Greek yogurt · berries · flax · walnuts';
export const snackSuggestion = 'Greek yogurt + berries · apple + almonds · or hummus + veg';
export const dessertSuggestion = 'Greek yogurt + berries + 10–15 g dark chocolate';

export const themeDinners: Record<string, string> = {
  Monday: 'Salmon · roasted veg · white beans · quinoa',
  Tuesday: 'Tacos · corn tortillas · beans · cabbage · avocado',
  Wednesday: 'Stir-fry · chicken/tofu · veg · brown rice · edamame',
  Thursday: 'Pasta · whole-grain · lentil/turkey marinara · big salad',
  Friday: 'Burrito bowl · beans · brown rice · fajita veg · avocado',
  Saturday: 'Burger · salmon/turkey/bean · whole-grain bun · salad',
  Sunday: 'Curry · lentil/chickpea/chicken · veg · brown rice',
};

export const mealLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch (leftovers)',
  dinner: 'Dinner',
  snack: 'Snack',
  dessert: 'Dessert',
};

export const dietRatingCopy: Record<'good' | 'okay' | 'off', string> = {
  good: 'Dialed. Repeat tomorrow.',
  okay: 'Good enough.',
  off: 'Reset with breakfast + the dinner theme.',
};

// ── Habits tab: supplements + lifestyle ──────────────────────────────────────
// Each entry: [label, when]. "when" groups them in the UI (the doc's AM/PM stacks).
export const supplementMeta: Record<string, { label: string; when: string }> = {
  statin: { label: 'Statin', when: 'with dinner' },
  creatineAM: { label: 'Creatine 5 g', when: 'morning' },
  creatinePM: { label: 'Creatine 5 g', when: 'daytime' },
  vitaminD: { label: 'Vitamin D3', when: 'morning' },
  plantSterols: { label: 'Plant sterols 2 g', when: 'morning' },
  magnesium: { label: 'Magnesium', when: 'evening' },
};

export const lifestyleMeta: Record<string, string> = {
  morningLight: 'Morning light (10–20 min)',
  caffeineCutoff: 'Caffeine cutoff (~2pm)',
  noAlcoholNearBed: 'No alcohol near bed',
  stressWindDown: 'Stress wind-down (~10 min)',
  dental: 'Dental (brush 2× · floss)',
};

// ── Labs reference (read-only; the app never interprets values) ───────────────
// Pre-filled from the plan so nothing has to be hand-entered.
export interface PriorLab {
  name: string;
  value: string;
  note?: string;
}
export const priorLabs: PriorLab[] = [
  { name: 'LDL cholesterol', value: '≥190 mg/dL', note: 'Persistently high — statin indication' },
  { name: 'ApoB', value: '139 mg/dL', note: 'High; secondary target, kept concordant with LDL goal' },
  { name: 'Thyroid (TSH)', value: '8.1 → 6.88 → 4.1', note: 'Normalized over time; free T4 normal' },
  { name: 'TPO antibodies', value: '401', note: 'Positive — Hashimoto surveillance; no need to repeat' },
  { name: 'Testosterone (total)', value: '382 ng/dL', note: 'Free 47, SHBG 37 — above replacement threshold' },
  { name: 'A1c / glucose', value: '5.3–5.4% / 84–96', note: 'Normal' },
  { name: 'Potassium', value: '5.0', note: 'High-normal — re-draw clean to rule out pseudohyperkalemia' },
  { name: 'Bicarbonate', value: '33 (ref 20–32)', note: 'Slightly high — trend on next CMP' },
  { name: 'Vitamin D', value: '34 ng/mL', note: 'Adequate — maintenance only' },
  { name: 'Selenium', value: '209', note: 'Replete — do not supplement' },
];

export interface UpcomingLab {
  name: string;
  when: string;
  why?: string;
  group: 'now' | 'recurring';
}
export const upcomingLabs: UpcomingLab[] = [
  { name: 'LDL / ApoB follow-up', when: '6–8 weeks after statin start', why: 'Confirm ≥50% LDL drop and under goal', group: 'now' },
  { name: 'Lp(a)', when: 'Once — anytime', why: 'Measure once in adulthood; tightens goal if high', group: 'now' },
  { name: 'Baseline CK', when: 'Now', why: 'Statin muscle-symptom reference', group: 'now' },
  { name: 'Kidney / creatinine', when: 'Now — before creatine loading', why: 'Creatine raises it artifactually', group: 'now' },
  { name: 'Ferritin / iron studies', when: 'Now', why: 'Fatigue + hair workup', group: 'now' },
  { name: 'Vitamin B12', when: 'Now', group: 'now' },
  { name: 'Folate', when: 'Now', group: 'now' },
  { name: 'Zinc', when: 'Now', group: 'now' },
  { name: 'tTG-IgA', when: 'Now — while still eating gluten', why: 'Celiac screen; do not go gluten-free first', group: 'now' },
  { name: 'Potassium re-draw (clean)', when: 'Next blood draw', why: 'Rule out pseudohyperkalemia', group: 'now' },
  { name: 'Colorectal screening', when: 'Overdue at 50 — schedule now', why: 'Recommended from age 45', group: 'now' },
  { name: 'Lipid panel recheck', when: 'Every 8–12 weeks while titrating', why: 'Statin needs that long to read', group: 'recurring' },
  { name: 'Thyroid TSH + free T4', when: 'Every 6–12 months', why: 'Hashimoto surveillance', group: 'recurring' },
];
