import { useMemo, useState } from 'react';
import { useStore } from '../store';
import {
  selectToday,
  rebuildTrends,
  dietScore,
  nextLoad,
  zone2WeeklyText,
  impactUnlocked,
} from '../engine';
import {
  directiveLine,
  dietCopy,
  dietLabels,
  optionalBlockPrescription,
  SESSION_LABELS,
  sorenessReminder,
} from '../engine/reference';
import type {
  BackTrend,
  DailyLog,
  DietKey,
  Quality,
  RecoveryInputs,
  SetEntry,
  Trend,
  TodayExercise,
  WorkoutLog,
} from '../types';
import { dayName, prettyDate } from '../lib/date';
import { DIET_KEYS, defaultDailyLog, logCardioSession, logWorkout, upsertDailyLog } from '../lib/appActions';
import { Button, Card, CardTitle, Field, ScreenTitle, Segmented } from '../components/ui';

function recoveryFromLog(log: DailyLog): RecoveryInputs {
  return {
    achilles: log.achilles,
    back: log.back,
    sleepQuality: log.sleepQuality ?? 'good',
    sleepHours: log.sleepHours,
    energy: log.energy ?? 'good',
    diffuseSoreness: log.diffuseSoreness,
  };
}

export default function Today() {
  const { data, today, update } = useStore();
  const log = useMemo(
    () => data.dailyLogs.find((l) => l.date === today) ?? defaultDailyLog(today),
    [data.dailyLogs, today],
  );

  // Governors read PRIOR nights; today's inputs are passed live (avoid double-count).
  const stateForToday = useMemo(
    () => ({ ...data.state, trends: rebuildTrends(data.dailyLogs.filter((l) => l.date < today)) }),
    [data.state, data.dailyLogs, today],
  );
  const result = useMemo(
    () => selectToday(stateForToday, recoveryFromLog(log), today),
    [stateForToday, log, today],
  );

  const patchLog = (patch: Partial<DailyLog>) =>
    update((d) => upsertDailyLog(d, { ...log, ...patch }));

  // Once today's session is logged, the schedule pointer has advanced; show a
  // calm "done for today" state instead of flipping to the next session.
  const todaysWorkouts = data.workouts.filter((w) => w.date === today);
  const loggedToday = todaysWorkouts.length > 0;

  const badge = loggedToday
    ? 'Done today'
    : result.inDeload
      ? 'Deload'
      : SESSION_LABELS[result.plan.sessionType];
  const modified = !loggedToday && result.plan.directive !== 'RUN_PLAN';

  return (
    <div className="space-y-4">
      <ScreenTitle title="Today" subtitle={`${dayName(today)} · ${prettyDate(today)}`} />

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-white">{badge}</span>
        {modified && (
          <span className="rounded-full bg-hold-soft px-3 py-1 text-sm font-medium text-hold">Modified</span>
        )}
      </div>

      <RecoveryCard
        log={log}
        patch={patchLog}
        directiveLineText={directiveLine[result.plan.directive]}
        directive={result.plan.directive}
        notes={result.resolved.notes}
      />

      {loggedToday ? (
        <DoneCard
          done={todaysWorkouts.map((w) => SESSION_LABELS[w.sessionType])}
          next={result.inDeload ? 'Deload continues' : SESSION_LABELS[result.plan.sessionType]}
        />
      ) : (
        <SessionCard result={result} data={data} update={update} today={today} />
      )}

      <DietCard log={log} patch={patchLog} />

      <div className="grid grid-cols-2 gap-3">
        <StepsCard
          log={log}
          patch={patchLog}
          stepBaseline={data.state.stepBaseline}
          weekAvg={weeklyStepAverage(data.dailyLogs, today)}
        />
        <SleepCard log={log} patch={patchLog} />
      </div>

      {!impactUnlocked(data.state) && (
        <p className="px-1 text-xs text-muted">
          Impact work (running / hills / jump-rope) stays locked until next-morning Achilles is
          same-or-better for 4–6 weeks. Bike is the default.
        </p>
      )}
    </div>
  );
}

// ── Recovery (fill first) ─────────────────────────────────────────────────────
const trendTone = (v: Trend | BackTrend) =>
  v === 'better' || v === 'same' ? 'go' : v === 'worse' || v === 'tight' ? 'hold' : 'stop';
const qualityTone = (v: Quality) => (v === 'good' ? 'go' : v === 'okay' ? 'hold' : 'stop');

function RecoveryCard({
  log,
  patch,
  directiveLineText,
  directive,
  notes,
}: {
  log: DailyLog;
  patch: (p: Partial<DailyLog>) => void;
  directiveLineText: string;
  directive: string;
  notes: string[];
}) {
  const dirTone =
    directive === 'RUN_PLAN'
      ? 'border-go/40 bg-go-soft text-go'
      : directive === 'STOP_SEEK_ASSESSMENT'
        ? 'border-stop/40 bg-stop-soft text-stop'
        : 'border-hold/40 bg-hold-soft text-hold';
  return (
    <Card>
      <CardTitle>Recovery — fill first</CardTitle>
      <div className="divide-y divide-line">
        <Field label="Sleep">
          <Segmented
            value={log.sleepQuality ?? 'good'}
            tone={(v) => qualityTone(v as Quality)}
            onChange={(v) => patch({ sleepQuality: v as Quality })}
            options={[
              { value: 'good', label: 'Good' },
              { value: 'okay', label: 'Okay' },
              { value: 'poor', label: 'Poor' },
            ]}
          />
        </Field>
        <Field label="Achilles">
          <Segmented
            value={log.achilles}
            tone={(v) => trendTone(v as Trend)}
            onChange={(v) => patch({ achilles: v as Trend })}
            options={[
              { value: 'better', label: 'Better' },
              { value: 'same', label: 'Same' },
              { value: 'worse', label: 'Worse' },
              { value: 'worse_24h', label: 'Worse >24h' },
            ]}
          />
        </Field>
        <Field label="Back">
          <Segmented
            value={log.back}
            tone={(v) => trendTone(v as BackTrend)}
            onChange={(v) => patch({ back: v as BackTrend })}
            options={[
              { value: 'same', label: 'Same' },
              { value: 'better', label: 'Better' },
              { value: 'tight', label: 'Tight' },
              { value: 'pain_24h', label: 'Pain >24h' },
              { value: 'radiating', label: 'Radiating' },
            ]}
          />
        </Field>
        <Field label="Energy">
          <Segmented
            value={log.energy ?? 'good'}
            tone={(v) => qualityTone(v as Quality)}
            onChange={(v) => patch({ energy: v as Quality })}
            options={[
              { value: 'good', label: 'Good' },
              { value: 'okay', label: 'Okay' },
              { value: 'poor', label: 'Poor' },
            ]}
          />
        </Field>
        <Field label="Diffuse muscle soreness">
          <Segmented
            value={log.diffuseSoreness}
            onChange={(v) => patch({ diffuseSoreness: v as 'normal' | 'up' })}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'up', label: 'Up' },
            ]}
          />
        </Field>
      </div>

      <div className={`mt-3 rounded-xl border p-3 text-sm font-medium ${dirTone}`}>{directiveLineText}</div>
      {notes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {notes.map((n, i) => (
            <li key={i} className="text-xs text-muted">
              • {n}
            </li>
          ))}
        </ul>
      )}
      {log.diffuseSoreness === 'up' && (
        <p className="mt-2 rounded-xl border border-line bg-paper p-3 text-xs text-muted">{sorenessReminder}</p>
      )}
    </Card>
  );
}

function DoneCard({ done, next }: { done: string[]; next: string }) {
  return (
    <Card>
      <CardTitle>Done for today</CardTitle>
      <p className="text-sm text-go">Logged: {done.join(', ')}. Tomorrow’s plan is set.</p>
      <p className="mt-1 text-sm text-muted">Next up: {next}.</p>
    </Card>
  );
}

// ── Session ───────────────────────────────────────────────────────────────────
type Outcome = 'planned' | 'grindy' | 'missed' | 'pain';

function outcomeSets(ex: TodayExercise, outcome: Outcome): SetEntry[] {
  const weight = typeof ex.load === 'number' ? ex.load : 0;
  const top = ex.scheme.repHigh;
  const low = ex.scheme.repLow;
  const base: SetEntry = { weight, reps: top, rir: 2, quality: 'clean', pain: 'none' };
  const n = Math.max(1, ex.scheme.sets);
  switch (outcome) {
    case 'planned':
      return Array.from({ length: n }, () => ({ ...base }));
    case 'grindy':
      return Array.from({ length: n }, () => ({ ...base, quality: 'grindy' as const }));
    case 'missed':
      return Array.from({ length: n }, (_, i) =>
        i === 0 ? { ...base, reps: Math.max(0, low - 1) } : { ...base },
      );
    case 'pain':
      return Array.from({ length: n }, () => ({ ...base, pain: 'pain' as const }));
  }
}

function SessionCard({
  result,
  data,
  update,
  today,
}: {
  result: ReturnType<typeof selectToday>;
  data: ReturnType<typeof useStore>['data'];
  update: ReturnType<typeof useStore>['update'];
  today: string;
}) {
  const { plan } = result;
  if (plan.exercises) {
    return (
      <StrengthCard
        exercises={plan.exercises}
        optionalBlocks={result.optionalBlocks}
        lifts={data.state.lifts}
        deload={result.inDeload}
        sessionType={plan.sessionType}
        today={today}
        update={update}
      />
    );
  }
  if (plan.cardio) {
    return <CardioCard result={result} update={update} today={today} cardioPhase={data.state.cardioPhase} />;
  }
  return null;
}

function StrengthCard({
  exercises,
  optionalBlocks,
  lifts,
  deload,
  sessionType,
  today,
  update,
}: {
  exercises: TodayExercise[];
  optionalBlocks: string[];
  lifts: ReturnType<typeof useStore>['data']['state']['lifts'];
  deload: boolean;
  sessionType: WorkoutLog['sessionType'];
  today: string;
  update: ReturnType<typeof useStore>['update'];
}) {
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});

  const complete = () => {
    const workout: WorkoutLog = {
      date: today,
      sessionType,
      exercises: exercises.map((ex) => ({ name: ex.name, sets: outcomeSets(ex, outcomes[ex.name] ?? 'planned') })),
    };
    // On completion the parent re-renders into the "Done for today" card.
    update((d) => logWorkout(d, workout));
  };

  return (
    <Card>
      <CardTitle>{deload ? 'Deload — easy, leave fresh' : 'Strength'}</CardTitle>
      <div className="space-y-3">
        {exercises.map((ex) => {
          const outcome = outcomes[ex.name] ?? 'planned';
          const lift = lifts[ex.name];
          const rec = lift ? nextLoad(ex.name, lift, outcomeSets(ex, outcome)) : null;
          return (
            <div key={ex.name} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium text-ink">{ex.name}</span>
                <span className="text-sm text-muted">
                  {ex.target} · {typeof ex.load === 'number' ? `${ex.load} lb` : ex.load}
                </span>
              </div>
              {!deload && (
                <div className="mt-2">
                  <Segmented
                    value={outcome}
                    onChange={(v) => setOutcomes((o) => ({ ...o, [ex.name]: v as Outcome }))}
                    tone={(v) => (v === 'planned' ? 'go' : v === 'pain' ? 'stop' : 'hold')}
                    options={[
                      { value: 'planned', label: 'As planned' },
                      { value: 'grindy', label: 'Grindy' },
                      { value: 'missed', label: 'Missed' },
                      { value: 'pain', label: 'Pain' },
                    ]}
                  />
                  {rec && <p className="mt-1.5 text-xs text-muted">Next time: {rec.note}</p>}
                </div>
              )}
            </div>
          );
        })}

        {optionalBlocks.map((name) => (
          <div key={name} className="rounded-xl border border-dashed border-line p-3">
            <div className="font-medium text-ink">{name}</div>
            <p className="mt-0.5 text-xs text-muted">{optionalBlockPrescription[name]}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Button onClick={complete}>{deload ? 'Mark deload session done' : 'Complete session'}</Button>
      </div>
    </Card>
  );
}

function CardioCard({
  result,
  update,
  today,
  cardioPhase,
}: {
  result: ReturnType<typeof selectToday>;
  update: ReturnType<typeof useStore>['update'];
  today: string;
  cardioPhase: 1 | 2 | 3;
}) {
  const cardio = result.plan.cardio!;
  const converted = result.plan.sessionType === 'Intervals' && cardio.type !== 'Intervals';

  return (
    <Card>
      <CardTitle>
        {cardio.type === 'Zone2' ? 'Zone 2' : cardio.type === 'Intervals' ? 'Intervals' : 'Recovery'}
      </CardTitle>
      {converted && <p className="mb-2 text-sm text-hold">Intervals cut today — do Zone 2 instead.</p>}

      {cardio.type === 'Zone2' && (
        <p className="text-sm text-ink">
          {cardio.modalityDefault} · target {cardio.plannedDurationMinutes} min.{' '}
          <span className="text-muted">
            Phase {cardioPhase}: {zone2WeeklyText(cardioPhase)}.
          </span>
        </p>
      )}
      {cardio.type === 'Intervals' && (
        <p className="text-sm text-ink">
          {cardio.modalityDefault} · {cardio.rounds} × ({cardio.workMinutes} hard / {cardio.recoveryMinutes} easy).
        </p>
      )}
      {cardio.type === 'Recovery' && (
        <p className="text-sm text-ink">
          {cardio.modalityDefault} · ~{cardio.plannedDurationMinutes} min, easy.
        </p>
      )}

      <div className="mt-3">
        <Button onClick={() => update((d) => logCardioSession(d, today, result.plan.sessionType))}>
          Log session
        </Button>
      </div>
    </Card>
  );
}

// ── Diet ──────────────────────────────────────────────────────────────────────
function DietCard({ log, patch }: { log: DailyLog; patch: (p: Partial<DailyLog>) => void }) {
  const color = dietScore(log.diet);
  const tone =
    color === 'green'
      ? 'bg-go-soft text-go'
      : color === 'yellow'
        ? 'bg-hold-soft text-hold'
        : 'bg-stop-soft text-stop';
  const toggle = (k: DietKey) => patch({ diet: { ...log.diet, [k]: !log.diet[k] } });
  return (
    <Card>
      <CardTitle>Diet</CardTitle>
      <div className="grid grid-cols-1 gap-1.5">
        {DIET_KEYS.map((k) => (
          <label key={k} className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm">
            <input
              type="checkbox"
              checked={log.diet[k]}
              onChange={() => toggle(k)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className={log.diet[k] ? 'text-ink' : 'text-muted'}>{dietLabels[k]}</span>
          </label>
        ))}
      </div>
      <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${tone}`}>{dietCopy[color]}</div>
    </Card>
  );
}

// ── Steps + Sleep mini-cards ──────────────────────────────────────────────────
function weeklyStepAverage(logs: DailyLog[], today: string): number | null {
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const startISO = start.toISOString().slice(0, 10);
  const recent = logs.filter((l) => l.date >= startISO && l.date <= today && l.steps != null);
  if (recent.length === 0) return null;
  return Math.round(recent.reduce((s, l) => s + (l.steps ?? 0), 0) / recent.length);
}

function StepsCard({
  log,
  patch,
  stepBaseline,
  weekAvg,
}: {
  log: DailyLog;
  patch: (p: Partial<DailyLog>) => void;
  stepBaseline: number;
  weekAvg: number | null;
}) {
  return (
    <Card>
      <CardTitle>Steps</CardTitle>
      <input
        type="number"
        inputMode="numeric"
        value={log.steps ?? ''}
        placeholder="today"
        onChange={(e) => patch({ steps: e.target.value === '' ? undefined : Number(e.target.value) })}
        className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-lg font-semibold text-ink"
      />
      <p className="mt-1 text-xs text-muted">
        7-day avg {weekAvg != null ? weekAvg.toLocaleString() : '—'} · baseline{' '}
        {stepBaseline.toLocaleString()}
      </p>
    </Card>
  );
}

function SleepCard({ log, patch }: { log: DailyLog; patch: (p: Partial<DailyLog>) => void }) {
  return (
    <Card>
      <CardTitle>Sleep</CardTitle>
      <input
        type="number"
        inputMode="decimal"
        step="0.5"
        value={log.sleepHours ?? ''}
        placeholder="hours"
        onChange={(e) => patch({ sleepHours: e.target.value === '' ? undefined : Number(e.target.value) })}
        className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-lg font-semibold text-ink"
      />
      <p className="mt-1 text-xs text-muted">Quality set above.</p>
    </Card>
  );
}
