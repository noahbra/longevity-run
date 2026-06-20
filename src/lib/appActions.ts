// ── App actions ──────────────────────────────────────────────────────────────
// Pure AppData → AppData transforms that compose the engine. The store calls
// these via update(); components never touch the engine's state mechanics.

import type {
  AppData,
  AppSettings,
  DailyLog,
  DietKey,
  LabResult,
  LifestyleKey,
  LiftState,
  MealKey,
  SessionType,
  SupplementKey,
  WorkoutLog,
} from '../types';
import {
  applyCardioSession,
  applyWorkout,
  reconcileDeload,
  rebuildTrends,
} from '../engine';

export const DIET_KEYS: DietKey[] = [
  'ldlBreakfast',
  'psyllium',
  'legumes',
  'nuts',
  'proteinTarget',
  'lowSaturatedFat',
  'vegetables',
  'dessertControlled',
  'noProcessedMeat',
];

export const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

export const SUPPLEMENT_KEYS: SupplementKey[] = [
  'statin',
  'creatineAM',
  'creatinePM',
  'vitaminD',
  'plantSterols',
  'magnesium',
];

export const LIFESTYLE_KEYS: LifestyleKey[] = [
  'morningLight',
  'caffeineCutoff',
  'noAlcoholNearBed',
  'stressWindDown',
  'dental',
];

export function emptyDiet(): Record<DietKey, boolean> {
  return Object.fromEntries(DIET_KEYS.map((k) => [k, false])) as Record<DietKey, boolean>;
}

// Derive the 9-key pattern record from the friendly meal checkoffs + levers, so
// the Eat tab stays "tick the menu" while the Week score keeps working. The
// theme-night menu is engineered to hit the pattern, so a planned meal implies
// its nutrients; off-plan/skipped does not.
export function deriveDiet(log: DailyLog): Record<DietKey, boolean> {
  const meals = log.meals ?? {};
  const planned = (k: MealKey) => meals[k] === 'planned';
  const notOffplan = (k: MealKey) => meals[k] !== 'offplan';
  return {
    ldlBreakfast: planned('breakfast'),
    psyllium: !!log.diet?.psyllium, // lever toggle, set directly on the Eat tab
    legumes: planned('dinner') || planned('lunch'),
    nuts: !!log.diet?.nuts, // lever toggle
    proteinTarget: planned('breakfast') && planned('dinner'),
    lowSaturatedFat: notOffplan('dinner') && notOffplan('lunch'),
    vegetables: planned('dinner') || planned('lunch'),
    dessertControlled: meals.dessert !== 'offplan',
    noProcessedMeat: notOffplan('dinner'),
  };
}

export function defaultDailyLog(date: string): DailyLog {
  return {
    date,
    achilles: 'same',
    back: 'same',
    energy: 'good',
    diffuseSoreness: 'normal',
    sleepQuality: 'good',
    diet: emptyDiet(),
  };
}

export function getDailyLog(data: AppData, date: string): DailyLog | undefined {
  return data.dailyLogs.find((l) => l.date === date);
}

// Idempotent by date: replaces today's log if present, then re-derives trends.
export function upsertDailyLog(data: AppData, daily: DailyLog): AppData {
  const others = data.dailyLogs.filter((l) => l.date !== daily.date);
  const dailyLogs = [...others, daily];
  return { ...data, dailyLogs, state: { ...data.state, trends: rebuildTrends(dailyLogs) } };
}

export function logWorkout(data: AppData, workout: WorkoutLog): AppData {
  // Don't duplicate a same-day same-type workout if re-logged.
  const workouts = [
    ...data.workouts.filter((w) => !(w.date === workout.date && w.sessionType === workout.sessionType)),
    workout,
  ];
  let state = applyWorkout(data.state, workout);
  state = reconcileDeload(state, workout.date);
  return { ...data, workouts, state };
}

// Records the cardio session as a workout row (empty exercises) so the Week
// dashboard and Log can count it, then advances the schedule.
export function logCardioSession(data: AppData, date: string, sessionType: SessionType): AppData {
  const workouts = [
    ...data.workouts.filter((w) => !(w.date === date && w.sessionType === sessionType)),
    { date, sessionType, exercises: [] },
  ];
  let state = applyCardioSession(data.state, date);
  state = reconcileDeload(state, date);
  return { ...data, workouts, state };
}

export function setCardioPhase(data: AppData, phase: 1 | 2 | 3): AppData {
  return { ...data, state: { ...data.state, cardioPhase: phase } };
}

export function updateSettings(data: AppData, patch: Partial<AppSettings>): AppData {
  return { ...data, settings: { ...data.settings, ...patch } };
}

export function updateLift(data: AppData, name: string, patch: Partial<LiftState>): AppData {
  const lift = data.state.lifts[name];
  if (!lift) return data;
  return {
    ...data,
    state: { ...data.state, lifts: { ...data.state.lifts, [name]: { ...lift, ...patch } } },
  };
}

export function updateScheduleSlot(data: AppData, index: number, sessionType: SessionType): AppData {
  const schedule = [...data.state.schedule];
  schedule[index] = sessionType;
  return { ...data, state: { ...data.state, schedule } };
}

export function addLab(data: AppData, lab: LabResult): AppData {
  return { ...data, labs: [...(data.labs ?? []), lab] };
}

export function removeLab(data: AppData, index: number): AppData {
  return { ...data, labs: (data.labs ?? []).filter((_, i) => i !== index) };
}

// A BP block is a 7-day campaign of home readings (anchor + day-1 discard).
// Mirrors the deload block: store the start, derive everything else.
export function startBPBlock(data: AppData, date: string): AppData {
  return { ...data, bpBlockStart: date };
}

export function endBPBlock(data: AppData): AppData {
  return { ...data, bpBlockStart: null };
}
