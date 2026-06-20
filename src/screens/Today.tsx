import { useMemo } from 'react';
import { useStore } from '../store';
import { selectToday, rebuildTrends } from '../engine';
import { directiveLine, SESSION_LABELS, sorenessReminder, themeDinners } from '../engine/reference';
import type { BackTrend, DailyLog, Quality, RecoveryInputs, Trend } from '../types';
import { dayName, daysBetween, prettyDate, shortDate } from '../lib/date';
import { defaultDailyLog, upsertDailyLog } from '../lib/appActions';
import type { Tab } from '../App';
import { Card, CardTitle, DateNav, Field, ScreenTitle, Segmented } from '../components/ui';

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

export default function Today({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { data, today, selectedDate, setSelectedDate, update } = useStore();
  const isToday = selectedDate === today;
  const log = useMemo(
    () => data.dailyLogs.find((l) => l.date === selectedDate) ?? defaultDailyLog(selectedDate),
    [data.dailyLogs, selectedDate],
  );
  const stateForDay = useMemo(
    () => ({ ...data.state, trends: rebuildTrends(data.dailyLogs.filter((l) => l.date < selectedDate)) }),
    [data.state, data.dailyLogs, selectedDate],
  );
  const result = useMemo(
    () => selectToday(stateForDay, recoveryFromLog(log), selectedDate),
    [stateForDay, log, selectedDate],
  );

  const patch = (p: Partial<DailyLog>) => update((d) => upsertDailyLog(d, { ...log, ...p }));

  const loggedToday = data.workouts.some((w) => w.date === today);
  const sessionLabel = result.inDeload ? 'Deload' : SESSION_LABELS[result.plan.sessionType];
  const modified = !loggedToday && result.plan.directive !== 'RUN_PLAN';

  // "What's undone today"
  const eatLogged = !!log.dietRating || !!(log.meals && Object.keys(log.meals).length);
  const statinTaken = !!log.supplements?.statin;
  const measuresLogged = log.steps != null || log.bodyweight != null || !!(log.bp && log.bp.length);
  const status: { label: string; done: boolean; tab: Tab }[] = [
    { label: 'Train', done: loggedToday, tab: 'Train' },
    { label: 'Eat', done: eatLogged, tab: 'Eat' },
    { label: 'Statin', done: statinTaken, tab: 'Habits' },
    { label: 'Measure', done: measuresLogged, tab: 'Measure' },
  ];

  // Due-now strip
  const waistDue = !data.dailyLogs.some((l) => (l.waist ?? 0) > 0 && daysBetween(l.date, today) < 7);
  const due: string[] = [];
  if (data.bpBlockStart && daysBetween(data.bpBlockStart, today) + 1 <= 7)
    due.push(`BP block: day ${daysBetween(data.bpBlockStart, today) + 1} of 7`);
  if (!statinTaken) due.push('Statin tonight');
  if (waistDue) due.push('Waist due this week');

  return (
    <div className="space-y-4">
      <ScreenTitle title="Today" subtitle={`${dayName(selectedDate)} · ${prettyDate(selectedDate)}`} />
      <DateNav date={selectedDate} today={today} onChange={setSelectedDate} />

      {!isToday && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-ink">
          Backfilling {shortDate(selectedDate)} — fill in the check-in you missed.
        </p>
      )}

      {isToday && due.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {due.map((d) => (
            <span key={d} className="rounded-full bg-hold-soft px-3 py-1 text-xs font-medium text-hold">
              {d}
            </span>
          ))}
        </div>
      )}

      <CheckinCard
        log={log}
        patch={patch}
        directiveLineText={directiveLine[result.plan.directive]}
        directive={result.plan.directive}
        notes={result.resolved.notes}
      />

      {isToday && (
      <Card>
        <CardTitle>Today's plan</CardTitle>
        <button
          onClick={() => onNavigate('Train')}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-paper p-3 text-left"
        >
          <span>
            <span className="font-medium text-ink">{loggedToday ? 'Session done' : sessionLabel}</span>
            {modified && <span className="ml-2 text-xs text-hold">modified</span>}
          </span>
          <span className="text-sm text-accent">{loggedToday ? 'View' : 'Open →'}</span>
        </button>
        <button
          onClick={() => onNavigate('Eat')}
          className="mt-2 flex w-full items-center justify-between rounded-xl border border-line bg-paper p-3 text-left"
        >
          <span>
            <span className="text-xs text-muted">Dinner</span>
            <span className="ml-2 font-medium text-ink">{themeDinners[dayName(today)]?.split(' · ')[0]}</span>
          </span>
          <span className="text-sm text-accent">Open →</span>
        </button>
      </Card>
      )}

      {isToday && (
      <Card>
        <CardTitle>What's left today</CardTitle>
        <div className="grid grid-cols-4 gap-2">
          {status.map((s) => (
            <button
              key={s.label}
              onClick={() => onNavigate(s.tab)}
              className={`rounded-xl border p-2 text-center text-xs font-medium ${
                s.done ? 'border-go/40 bg-go-soft text-go' : 'border-line bg-paper text-muted'
              }`}
            >
              <div className="text-base">{s.done ? '✓' : '○'}</div>
              {s.label}
            </button>
          ))}
        </div>
      </Card>
      )}
    </div>
  );
}

// ── Morning check-in — the one log that decides the day ───────────────────────
const trendTone = (v: Trend | BackTrend) =>
  v === 'better' || v === 'same' ? 'go' : v === 'worse' || v === 'tight' ? 'hold' : 'stop';
const qualityTone = (v: Quality) => (v === 'good' ? 'go' : v === 'okay' ? 'hold' : 'stop');

function CheckinCard({
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
      <CardTitle>Morning check-in — fill first</CardTitle>
      <div className="divide-y divide-line">
        <Field label="Sleep">
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              placeholder="hrs"
              value={log.sleepHours ?? ''}
              onChange={(e) => patch({ sleepHours: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-16 min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
            />
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
          </div>
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
