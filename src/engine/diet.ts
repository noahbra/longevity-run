// ── Diet score (§3.5) ────────────────────────────────────────────────────────
// 6+ checked = green, 4–5 = yellow, ≤3 = red. No calorie tracking in V1.

import type { DietKey } from '../types';

export type DietColor = 'green' | 'yellow' | 'red';

export function dietScore(checklist: Record<DietKey, boolean>): DietColor {
  const checked = Object.values(checklist).filter(Boolean).length;
  if (checked >= 6) return 'green';
  if (checked >= 4) return 'yellow';
  return 'red';
}

// Three red days in a week → simplify meals, don't restrict harder (§3.5).
export function weeklyDietRecommendation(redDaysInWeek: number): string | null {
  if (redDaysInWeek >= 3) return 'Simplify meals — don’t restrict harder.';
  return null;
}
