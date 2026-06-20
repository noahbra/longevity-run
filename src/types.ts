// ── Data model (§2) ──────────────────────────────────────────────────────────
// Types only. Imported by the engine (which has zero React / zero storage
// imports), the store, and the UI. No logic lives here.

export type SessionType =
  | 'StrengthA'
  | 'Zone2'
  | 'StrengthB'
  | 'Intervals'
  | 'Recovery'
  | 'StrengthC';

export type Trend = 'better' | 'same' | 'worse' | 'worse_24h';
export type BackTrend = 'better' | 'same' | 'tight' | 'pain_24h' | 'radiating';
export type Quality = 'good' | 'okay' | 'poor';

export interface LiftState {
  weight: number;
  scheme: { sets: number; repLow: number; repHigh: number };
  increment: number; // smallest jump for this lift
  consecutiveStalls: number; // for the per-lift reset and deload trigger
  kind: 'main' | 'accessory';
}

export interface UserState {
  schedule: SessionType[]; // the weekly pattern
  nextIndex: number; // pointer into schedule
  inDeload: boolean; // true during the deload week; training age is DERIVED, no phase enum
  deloadStartDate: string | null; // when the current/last deload began (7-day exit, §3.3)
  strengthSessionsSinceDeload: number; // COMPLETED strength sessions; drives deload trigger (NOT weeks)
  cardioPhase: 1 | 2 | 3; // drives Zone 2 durations and interval rounds
  lifts: Record<string, LiftState>; // compounds + accessories, keyed by name
  trends: {
    achilles: Trend[];
    back: BackTrend[];
    sleep: Quality[];
    diffuseSoreness: ('normal' | 'up')[];
  };
  stepBaseline: number;
  lastSessionDate: string | null; // for the resumption rule (§4.6)
}

// `quality` makes "clean" deterministic (§3.2). `pain` is handled strictly.
export interface SetEntry {
  weight: number;
  reps: number;
  rir?: number;
  quality: 'clean' | 'grindy' | 'breakdown';
  pain: 'none' | 'discomfort' | 'pain';
}

export interface WorkoutLog {
  date: string;
  sessionType: SessionType;
  exercises: { name: string; sets: SetEntry[] }[];
}

export type DietKey =
  | 'ldlBreakfast'
  | 'psyllium'
  | 'legumes'
  | 'nuts'
  | 'proteinTarget'
  | 'lowSaturatedFat'
  | 'vegetables'
  | 'dessertControlled'
  | 'noProcessedMeat';

// ── Eat tab: menu checkoffs + subjective score ───────────────────────────────
export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
export type MealStatus = 'planned' | 'offplan' | 'skipped';
export type DietRating = 'good' | 'okay' | 'off';

// ── Habits tab: daily adherence ──────────────────────────────────────────────
export type SupplementKey =
  | 'statin' // nightly statin with dinner — the plan's single most important daily item
  | 'creatineAM'
  | 'creatinePM'
  | 'vitaminD'
  | 'plantSterols'
  | 'magnesium';

export type LifestyleKey =
  | 'morningLight'
  | 'caffeineCutoff'
  | 'noAlcoholNearBed'
  | 'stressWindDown'
  | 'dental';

// ── Measure tab: blood pressure + labs ───────────────────────────────────────
export interface BPReading {
  slot: 'am1' | 'am2' | 'pm1' | 'pm2';
  systolic: number;
  diastolic: number;
}

export interface LabResult {
  date: string;
  name: string;
  value?: string; // free-form (e.g. "139 mg/dL"); the app never interprets it
}

export interface DailyLog {
  date: string;
  steps?: number;
  sleepHours?: number;
  sleepQuality?: Quality;
  achilles: Trend;
  back: BackTrend;
  energy?: Quality;
  // INFORMATIONAL ONLY — never affects the directive (§7).
  diffuseSoreness: 'normal' | 'up';
  diet: Record<DietKey, boolean>; // pattern record — derived from meals + levers (Eat tab), feeds the Week score
  alcoholNearBed?: boolean;
  caffeineAfterCutoff?: boolean;
  // Optional body metrics surfaced in the Week dashboard / Log.
  bodyweight?: number;
  waist?: number;
  note?: string;
  // ── Eat tab ──
  meals?: Partial<Record<MealKey, MealStatus>>;
  dietRating?: DietRating; // subjective headline score
  alcoholDrinks?: number; // weekly lever, counted per day
  // ── Habits tab ──
  supplements?: Partial<Record<SupplementKey, boolean>>;
  lifestyle?: Partial<Record<LifestyleKey, boolean>>;
  sauna?: boolean; // weekly habit, 2–4×/wk target
  // ── Measure tab ──
  bp?: BPReading[]; // up to 4/day during a 7-day block (am1, am2, pm1, pm2)
}

// Returned by the governor resolver (§4.1) and selectToday (§3.1)
export type Directive =
  | 'RUN_PLAN'
  | 'CUT_INTERVALS_DO_ZONE2'
  | 'REDUCE_LOWER_BODY'
  | 'RECOVERY_ONLY'
  | 'STOP_SEEK_ASSESSMENT';

export interface TodayExercise {
  name: string;
  target: string; // human-readable, e.g. "3 × 5–8"
  load: number | string; // number for loaded lifts; "bodyweight" for tibialis
  scheme: { sets: number; repLow: number; repHigh: number };
}

export interface TodayCardio {
  type: 'Zone2' | 'Intervals' | 'Recovery';
  plannedDurationMinutes?: number;
  rounds?: number;
  workMinutes?: number;
  recoveryMinutes?: number;
  modalityDefault?: string;
}

export interface TodayPlan {
  date: string;
  sessionType: SessionType;
  directive: Directive;
  exercises?: TodayExercise[];
  cardio?: TodayCardio;
}

// ── Recovery inputs fed into the engine for "today" ──────────────────────────
export interface RecoveryInputs {
  achilles: Trend;
  back: BackTrend;
  sleepQuality: Quality;
  sleepHours?: number;
  energy: Quality;
  diffuseSoreness: 'normal' | 'up';
}

// ── App-wide persisted container (for export/import, §8) ─────────────────────
export interface AppSettings {
  substitutions: Record<string, string>; // exercise name -> substitute name
  showMedicalReminders: boolean;
  caffeineCutoffHour: number; // informational reminder preference
}

export interface AppData {
  version: number;
  state: UserState;
  workouts: WorkoutLog[];
  dailyLogs: DailyLog[];
  settings: AppSettings;
  labs?: LabResult[]; // recorded lab values; periodic, not daily
  bpBlockStart?: string | null; // ISO start of the current 7-day home BP block
}
