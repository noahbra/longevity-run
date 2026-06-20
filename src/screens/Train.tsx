import { useMemo, useState } from 'react';
import { useStore } from '../store';
import {
  selectToday,
  rebuildTrends,
  nextLoad,
  zone2WeeklyText,
  impactUnlocked,
} from '../engine';
import { directiveLine, optionalBlockPrescription, SESSION_LABELS } from '../engine/reference';
import type { DailyLog, RecoveryInputs, SetEntry, TodayExercise, WorkoutLog } from '../types';
import { defaultDailyLog, logCardioSession, logWorkout } from '../lib/appActions';
import { Button, Card, CardTitle, ScreenTitle, Segmented } from '../components/ui';

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

export default function Train() {
  const { data, today, update } = useStore();
  const log = useMemo(
    () => data.dailyLogs.find((l) => l.date === today) ?? defaultDailyLog(today),
    [data.dailyLogs, today],
  );
  const stateForToday = useMemo(
    () => ({ ...data.state, trends: rebuildTrends(data.dailyLogs.filter((l) => l.date < today)) }),
    [data.state, data.dailyLogs, today],
  );
  const result = useMemo(
    () => selectToday(stateForToday, recoveryFromLog(log), today),
    [stateForToday, log, today],
  );

  const todaysWorkouts = data.workouts.filter((w) => w.date === today);
  const loggedToday = todaysWorkouts.length > 0;
  const badge = loggedToday ? 'Done today' : result.inDeload ? 'Deload' : SESSION_LABELS[result.plan.sessionType];
  const modified = !loggedToday && result.plan.directive !== 'RUN_PLAN';

  return (
    <div className="space-y-4">
      <ScreenTitle title="Train" subtitle="Today's session" />

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-white">{badge}</span>
        {modified && (
          <span className="rounded-full bg-hold-soft px-3 py-1 text-sm font-medium text-hold">Modified</span>
        )}
      </div>

      {modified && (
        <p className="rounded-xl border border-hold/40 bg-hold-soft p-3 text-sm font-medium text-hold">
          {directiveLine[result.plan.directive]}
        </p>
      )}

      {loggedToday ? (
        <Card>
          <CardTitle>Done for today</CardTitle>
          <p className="text-sm text-go">Logged: {todaysWorkouts.map((w) => SESSION_LABELS[w.sessionType]).join(', ')}.</p>
          <p className="mt-1 text-sm text-muted">
            Next up: {result.inDeload ? 'Deload continues' : SESSION_LABELS[result.plan.sessionType]}.
          </p>
        </Card>
      ) : (
        <SessionCard result={result} data={data} update={update} today={today} />
      )}

      <Card>
        <CardTitle>Daily anchors — every day</CardTitle>
        <ul className="space-y-1 text-sm text-muted">
          <li>• McGill Big-3 (curl-up, side plank, bird-dog) — back</li>
          <li>• Achilles / calf loading (slow raises) — ~10 min</li>
        </ul>
      </Card>

      <Card>
        <CardTitle>Progression status</CardTitle>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Status label="Strength since deload" value={`${data.state.strengthSessionsSinceDeload}`} />
          <Status label="Cardio phase" value={`${data.state.cardioPhase}`} />
          <Status label="Deload" value={data.state.inDeload ? 'Active' : 'No'} />
          <Status label="Impact work" value={impactUnlocked(data.state) ? 'Unlocked' : 'Locked'} />
        </div>
        {!impactUnlocked(data.state) && (
          <p className="mt-3 text-xs text-muted">
            Impact (running / hills / jump-rope) stays locked until next-morning Achilles is
            same-or-better for 4–6 weeks. Bike is the default.
          </p>
        )}
      </Card>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

// ── Session (moved from Today) ────────────────────────────────────────────────
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
      return Array.from({ length: n }, (_, i) => (i === 0 ? { ...base, reps: Math.max(0, low - 1) } : { ...base }));
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
