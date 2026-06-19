// Small pure helpers shared across engine modules. No React, no storage, no clock.

export function roundToStep(weight: number, step: number): number {
  if (step <= 0) return Math.round(weight);
  return Math.round(weight / step) * step;
}

// Loaded lifts round to their own increment; bodyweight (increment 0) rounds to 5.
export function roundLoad(weight: number, increment: number): number {
  return roundToStep(weight, increment > 0 ? increment : 5);
}

export function targetString(scheme: { sets: number; repLow: number; repHigh: number }): string {
  const reps = scheme.repLow === scheme.repHigh ? `${scheme.repLow}` : `${scheme.repLow}–${scheme.repHigh}`;
  return `${scheme.sets} × ${reps}`;
}
