import { describe, it, expect } from 'vitest';
import type { LiftState, RecoveryInputs, SetEntry, UserState } from '../../types';
import { seedState } from '../../state/seed';
import {
  achillesGovernor,
  backGovernor,
  sleepGovernor,
  resolveDirective,
} from '../governors';
import { nextLoad } from '../progression';
import {
  checkDeload,
  deloadLoad,
  enterDeload,
  maybeExitDeload,
  reconcileDeload,
} from '../deload';
import {
  intervalsPrescription,
  nextIntervalPhase,
  nextZone2Phase,
  zone2Prescription,
} from '../cardio';
import { resumptionAdjustment } from '../resumption';
import { dietScore, weeklyDietRecommendation } from '../diet';
import { selectToday } from '../selectToday';
import { applyWorkout } from '../transitions';

// ── builders ─────────────────────────────────────────────────────────────────
function set(over: Partial<SetEntry> = {}): SetEntry {
  return { weight: 180, reps: 5, rir: 2, quality: 'clean', pain: 'none', ...over };
}
function mainFixed(over: Partial<LiftState> = {}): LiftState {
  return { weight: 180, scheme: { sets: 3, repLow: 5, repHigh: 5 }, increment: 5, consecutiveStalls: 0, kind: 'main', ...over };
}
function repRange(over: Partial<LiftState> = {}): LiftState {
  return { weight: 140, scheme: { sets: 3, repLow: 5, repHigh: 8 }, increment: 5, consecutiveStalls: 0, kind: 'main', ...over };
}
const goodRecovery: RecoveryInputs = {
  achilles: 'same', back: 'same', sleepQuality: 'good', energy: 'good', diffuseSoreness: 'normal',
};

// ── §3.2 progression ─────────────────────────────────────────────────────────
describe('nextLoad — strength progression (§3.2)', () => {
  it('adds increment on a clean 3×5 at the top of range', () => {
    const r = nextLoad('Back squat', mainFixed(), [set(), set(), set()]);
    expect(r.action).toBe('add');
    expect(r.newWeight).toBe(185);
    expect(r.progressed).toBe(true);
    expect(r.newConsecutiveStalls).toBe(0);
  });

  it('repeats (no progress) when grindy', () => {
    const r = nextLoad('Back squat', mainFixed(), [set(), set({ quality: 'grindy' }), set()]);
    expect(r.action).toBe('repeat');
    expect(r.newWeight).toBe(180);
    expect(r.newConsecutiveStalls).toBe(1);
  });

  it('does not progress a main lift at RIR 0 (not clean)', () => {
    const r = nextLoad('Back squat', mainFixed(), [set({ rir: 0 }), set({ rir: 0 }), set({ rir: 0 })]);
    expect(r.progressed).toBe(false);
    expect(r.action).toBe('repeat');
  });

  it('repeats once on a missed bottom, reduces on the second stall', () => {
    const first = nextLoad('Back squat', mainFixed(), [set({ reps: 4 }), set(), set()]);
    expect(first.action).toBe('repeat');
    expect(first.newConsecutiveStalls).toBe(1);

    const second = nextLoad('Back squat', mainFixed({ consecutiveStalls: 1 }), [set({ reps: 4 }), set(), set()]);
    expect(second.action).toBe('reduce');
    expect(second.newWeight).toBe(160);
    expect(second.newConsecutiveStalls).toBe(0);
  });

  it('pain reduces and flags substitution, never progresses', () => {
    const r = nextLoad('Bench press', repRange(), [set({ reps: 8, pain: 'pain' }), set({ reps: 8 }), set({ reps: 8 })]);
    expect(r.action).toBe('reduce');
    expect(r.flagSubstitution).toBe(true);
    expect(r.progressed).toBe(false);
  });

  it('discomfort holds and never progresses', () => {
    const r = nextLoad('Bench press', repRange(), [set({ reps: 8, pain: 'discomfort' }), set({ reps: 8 }), set({ reps: 8 })]);
    expect(r.action).toBe('repeat');
    expect(r.progressed).toBe(false);
    expect(r.newWeight).toBe(140);
  });

  it('form breakdown holds and flags a possible reduction', () => {
    const r = nextLoad('Bench press', repRange(), [set({ reps: 8, quality: 'breakdown' }), set({ reps: 8 }), set({ reps: 8 })]);
    expect(r.action).toBe('repeat');
    expect(r.flagSubstitution).toBe(true);
  });

  it('rep-range lift adds only when all sets hit the top, clean', () => {
    const top = nextLoad('Bench press', repRange(), [set({ reps: 8 }), set({ reps: 8 }), set({ reps: 8 })]);
    expect(top.action).toBe('add');
    expect(top.newWeight).toBe(145);

    const some = nextLoad('Bench press', repRange(), [set({ reps: 8 }), set({ reps: 8 }), set({ reps: 6 })]);
    expect(some.action).toBe('repeat');
  });

  it('hinge: back tight next day reduces; back pain substitutes', () => {
    const tight = nextLoad('Deadlift / trap-bar', mainFixed({ weight: 205, scheme: { sets: 3, repLow: 3, repHigh: 5 } }),
      [set({ reps: 5 }), set({ reps: 5 }), set({ reps: 5 })], { backResponseNextDay: 'tight' });
    expect(tight.action).toBe('reduce');
    expect(tight.newWeight).toBe(185);

    const pain = nextLoad('Deadlift / trap-bar', mainFixed({ weight: 205, scheme: { sets: 3, repLow: 3, repHigh: 5 } }),
      [set({ reps: 5 }), set({ reps: 5 }), set({ reps: 5 })], { backResponseNextDay: 'pain_24h' });
    expect(pain.action).toBe('substitute');
  });
});

// ── §3.3 deload ────────────────────────────────────────────────────────────--
describe('deload (§3.3)', () => {
  it('triggers at the 18-session backstop', () => {
    const s = seedState('2026-06-12');
    const live: UserState = { ...s, inDeload: false, strengthSessionsSinceDeload: 18 };
    expect(checkDeload(live).deload).toBe(true);
  });

  it('triggers when two main lifts have stalled twice', () => {
    const s = seedState('2026-06-12');
    const lifts = { ...s.lifts };
    lifts['Back squat'] = { ...lifts['Back squat'], consecutiveStalls: 2 };
    lifts['Bench press'] = { ...lifts['Bench press'], consecutiveStalls: 2 };
    const live: UserState = { ...s, inDeload: false, lifts };
    expect(checkDeload(live).deload).toBe(true);
  });

  it('triggers on a 7-day red/yellow recovery streak', () => {
    const s = seedState('2026-06-12');
    const live: UserState = {
      ...s, inDeload: false,
      trends: {
        achilles: Array(7).fill('worse'),
        back: Array(7).fill('same'),
        sleep: Array(7).fill('good'),
        diffuseSoreness: [],
      },
    };
    expect(checkDeload(live).deload).toBe(true);
  });

  it('deloadLoad is ~60% with reduced sets', () => {
    const dl = deloadLoad(mainFixed());
    expect(dl.weight).toBe(110);
    expect(dl.sets).toBe(2);
  });

  it('enterDeload bakes the 90–95% resume target and clears stalls', () => {
    const s = seedState('2026-06-12');
    const live: UserState = { ...s, inDeload: false, strengthSessionsSinceDeload: 18 };
    const next = enterDeload(live, '2026-06-19');
    expect(next.inDeload).toBe(true);
    expect(next.deloadStartDate).toBe('2026-06-19');
    expect(next.strengthSessionsSinceDeload).toBe(0);
    expect(next.lifts['Back squat'].weight).toBe(165); // round(180 * 0.925)
  });

  it('exits a deload only after 7 calendar days', () => {
    const s: UserState = { ...seedState('2026-06-12'), inDeload: true, deloadStartDate: '2026-06-12' };
    expect(maybeExitDeload(s, '2026-06-18').inDeload).toBe(true); // 6 days
    expect(maybeExitDeload(s, '2026-06-19').inDeload).toBe(false); // 7 days
  });

  it('reconcileDeload keeps an active deload until it expires', () => {
    const s: UserState = { ...seedState('2026-06-19'), inDeload: true, deloadStartDate: '2026-06-19' };
    expect(reconcileDeload(s, '2026-06-19').inDeload).toBe(true);
  });

  it('a fresh seed reconciles to a normal week (no auto-deload at boot)', () => {
    const s = seedState('2026-06-19');
    expect(reconcileDeload(s, '2026-06-19').inDeload).toBe(false);
  });
});

// ── §3.4 cardio ───────────────────────────────────────────────────────────---
describe('cardio ramp (§3.4)', () => {
  it('scales Zone 2 duration and interval rounds by phase', () => {
    const p1 = seedState('2026-06-12');
    expect(zone2Prescription(p1).plannedDurationMinutes).toBe(45);
    expect(intervalsPrescription(p1).rounds).toBe(2);
    const p3: UserState = { ...p1, cardioPhase: 3 };
    expect(zone2Prescription(p3).plannedDurationMinutes).toBe(70);
    expect(intervalsPrescription(p3).rounds).toBe(4);
  });

  it('advances interval phase only when clean + recovered + form intact', () => {
    expect(nextIntervalPhase(1, { completedClean: true, recoveryGood: true, formIntact: true }).phase).toBe(2);
    expect(nextIntervalPhase(1, { completedClean: true, recoveryGood: true, formIntact: false }).phase).toBe(1);
    expect(nextIntervalPhase(3, { completedClean: true, recoveryGood: true, formIntact: true }).phase).toBe(3);
  });

  it('Zone 2 talk-test failure holds the phase', () => {
    expect(nextZone2Phase(1, 'too-hard', true).phase).toBe(1);
    expect(nextZone2Phase(1, 'too-easy', true).phase).toBe(2);
  });
});

// ── §4 governors + the precedence bug ─────────────────────────────────────────
describe('governors + resolveDirective (§4)', () => {
  it('maps each governor correctly', () => {
    expect(achillesGovernor('better').directive).toBe('RUN_PLAN');
    expect(achillesGovernor('worse').directive).toBe('CUT_INTERVALS_DO_ZONE2');
    expect(achillesGovernor('worse_24h').directive).toBe('REDUCE_LOWER_BODY');
    expect(backGovernor('radiating').directive).toBe('STOP_SEEK_ASSESSMENT');
    expect(backGovernor('pain_24h').directive).toBe('REDUCE_LOWER_BODY');
    expect(backGovernor('tight').directive).toBe('RUN_PLAN');
    expect(sleepGovernor('good', 'good', [], 5).directive).toBe('CUT_INTERVALS_DO_ZONE2');
    expect(sleepGovernor('poor', 'poor', []).directive).toBe('RECOVERY_ONLY');
    expect(sleepGovernor('poor', 'good', ['poor']).directive).toBe('CUT_INTERVALS_DO_ZONE2');
  });

  it('resolves to the MOST conservative directive (never let "continue" win)', () => {
    const r = resolveDirective({ achilles: 'better', back: 'radiating', sleepQuality: 'good', energy: 'good', diffuseSoreness: 'normal' });
    expect(r.directive).toBe('STOP_SEEK_ASSESSMENT');
  });

  it('takes the max across two non-trivial governors', () => {
    const r = resolveDirective({ achilles: 'worse', back: 'pain_24h', sleepQuality: 'good', energy: 'good', diffuseSoreness: 'normal' });
    expect(r.directive).toBe('REDUCE_LOWER_BODY');
  });
});

// ── §4.6 resumption ───────────────────────────────────────────────────────────
describe('resumption (§4.6)', () => {
  it('no adjustment for ≤1 week off', () => {
    const s: UserState = { ...seedState('2026-06-12'), lastSessionDate: '2026-06-14' };
    expect(resumptionAdjustment(s, '2026-06-19').factor).toBe(1);
  });
  it('85–90% and a cardio phase drop for 1–3 weeks off', () => {
    const s: UserState = { ...seedState('2026-06-01'), lastSessionDate: '2026-06-05' };
    const r = resumptionAdjustment(s, '2026-06-19');
    expect(r.factor).toBe(0.875);
    expect(r.cardioPhaseDelta).toBe(1);
  });
  it('recommends a deload week for >3 weeks off', () => {
    const s: UserState = { ...seedState('2026-05-01'), lastSessionDate: '2026-05-10' };
    expect(resumptionAdjustment(s, '2026-06-19').recommendDeload).toBe(true);
  });
});

// ── §3.5 diet ─────────────────────────────────────────────────────────────────
describe('diet score (§3.5)', () => {
  const checklist = (n: number) => {
    const keys = ['ldlBreakfast', 'psyllium', 'legumes', 'nuts', 'proteinTarget', 'lowSaturatedFat', 'vegetables', 'dessertControlled', 'noProcessedMeat'] as const;
    const o = {} as Record<(typeof keys)[number], boolean>;
    keys.forEach((k, i) => (o[k] = i < n));
    return o;
  };
  it('scores by count', () => {
    expect(dietScore(checklist(6))).toBe('green');
    expect(dietScore(checklist(5))).toBe('yellow');
    expect(dietScore(checklist(3))).toBe('red');
  });
  it('recommends simplifying after 3 red days', () => {
    expect(weeklyDietRecommendation(3)).not.toBeNull();
    expect(weeklyDietRecommendation(2)).toBeNull();
  });
});

// ── §3.1 selectToday ──────────────────────────────────────────────────────────
describe('selectToday (§3.1)', () => {
  it('first prescription is a normal StrengthA week at working load from seed (§6, §10)', () => {
    const s = seedState('2026-06-19');
    const r = selectToday(s, goodRecovery, '2026-06-19');
    expect(r.inDeload).toBe(false);
    expect(r.plan.sessionType).toBe('StrengthA');
    const squat = r.plan.exercises?.find((e) => e.name === 'Back squat');
    expect(squat?.load).toBe(180); // full working load, not the ~60% deload
  });

  function liveStrengthState(): UserState {
    return { ...seedState('2026-06-12'), inDeload: false, deloadStartDate: null, nextIndex: 0, lastSessionDate: '2026-06-18' };
  }

  it('converts intervals to Zone 2 when Achilles is worse', () => {
    const s: UserState = { ...liveStrengthState(), nextIndex: 3 }; // Intervals
    const r = selectToday(s, { ...goodRecovery, achilles: 'worse' }, '2026-06-19');
    expect(r.plan.sessionType).toBe('Intervals');
    expect(r.plan.cardio?.type).toBe('Zone2');
  });

  it('reduces lower-body load under REDUCE_LOWER_BODY', () => {
    const s = liveStrengthState(); // StrengthA
    const normal = selectToday(s, goodRecovery, '2026-06-19');
    const reduced = selectToday(s, { ...goodRecovery, back: 'pain_24h' }, '2026-06-19');
    const squatNormal = normal.plan.exercises?.find((e) => e.name === 'Back squat')?.load;
    const squatReduced = reduced.plan.exercises?.find((e) => e.name === 'Back squat')?.load;
    expect(reduced.plan.directive).toBe('REDUCE_LOWER_BODY');
    expect(squatReduced as number).toBeLessThan(squatNormal as number);
  });

  it('STOP overrides everything to a recovery walk', () => {
    const s = liveStrengthState();
    const r = selectToday(s, { ...goodRecovery, back: 'radiating' }, '2026-06-19');
    expect(r.plan.directive).toBe('STOP_SEEK_ASSESSMENT');
    expect(r.plan.exercises).toBeUndefined();
    expect(r.plan.cardio?.type).toBe('Recovery');
  });

  it('is deterministic — same inputs, same output', () => {
    const s = liveStrengthState();
    expect(selectToday(s, goodRecovery, '2026-06-19')).toEqual(selectToday(s, goodRecovery, '2026-06-19'));
  });
});

// ── logging changes tomorrow's prescription (§10) ─────────────────────────────
describe('applyWorkout changes the next prescription', () => {
  it('a clean top-set squat raises tomorrow\'s squat load', () => {
    const base: UserState = { ...seedState('2026-06-12'), inDeload: false, deloadStartDate: null, nextIndex: 0, lastSessionDate: '2026-06-18' };
    const before = selectToday(base, goodRecovery, '2026-06-19').plan.exercises?.find((e) => e.name === 'Back squat')?.load as number;
    const after = applyWorkout(base, {
      date: '2026-06-19', sessionType: 'StrengthA',
      exercises: [{ name: 'Back squat', sets: [set(), set(), set()] }],
    });
    // schedule advanced to Zone2; reset pointer to inspect the next StrengthA load
    const afterSquatState: UserState = { ...after, nextIndex: 0 };
    const next = selectToday(afterSquatState, goodRecovery, '2026-06-20').plan.exercises?.find((e) => e.name === 'Back squat')?.load as number;
    expect(next).toBe(before + 5);
    expect(after.lastSessionDate).toBe('2026-06-19');
    expect(after.strengthSessionsSinceDeload).toBe(1);
  });
});
