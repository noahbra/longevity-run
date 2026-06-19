import { useMemo } from 'react';
import { useStore } from '../store';
import { dietScore } from '../engine';
import { SESSION_LABELS } from '../engine/reference';
import type { DailyLog } from '../types';
import { prettyDate } from '../lib/date';
import { upsertDailyLog } from '../lib/appActions';
import { Card, CardTitle, ScreenTitle } from '../components/ui';

export default function Log() {
  const { data, update } = useStore();

  const days = useMemo(() => {
    const dates = new Set<string>();
    data.dailyLogs.forEach((l) => dates.add(l.date));
    data.workouts.forEach((w) => dates.add(w.date));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [data]);

  const patch = (log: DailyLog, p: Partial<DailyLog>) => update((d) => upsertDailyLog(d, { ...log, ...p }));

  return (
    <div className="space-y-4">
      <ScreenTitle title="Log" subtitle="History. Editable." />
      {days.length === 0 && <p className="text-sm text-muted">Nothing logged yet.</p>}

      {days.map((date) => {
        const log = data.dailyLogs.find((l) => l.date === date);
        const workouts = data.workouts.filter((w) => w.date === date);
        return (
          <Card key={date}>
            <CardTitle>{prettyDate(date)}</CardTitle>

            {workouts.map((w, i) => (
              <div key={i} className="mb-2 text-sm">
                <span className="font-medium text-ink">{SESSION_LABELS[w.sessionType]}</span>
                {w.exercises.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-muted">
                    {w.exercises.map((ex) => (
                      <li key={ex.name} className="flex justify-between">
                        <span>{ex.name}</span>
                        <span>
                          {ex.sets.length} × {ex.sets[0]?.reps ?? '—'}
                          {typeof ex.sets[0]?.weight === 'number' && ex.sets[0].weight > 0
                            ? ` @ ${ex.sets[0].weight}`
                            : ''}
                          {ex.sets.some((s) => s.pain !== 'none') ? ' · pain' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {log && (
              <div className="mt-2 space-y-2 border-t border-line pt-3 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                  <span>Achilles: {log.achilles}</span>
                  <span>Back: {log.back}</span>
                  <span>Sleep: {log.sleepQuality ?? '—'}</span>
                  <span>Diet: {dietScore(log.diet)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Steps" value={log.steps} onChange={(v) => patch(log, { steps: v })} />
                  <Metric label="Weight" value={log.bodyweight} onChange={(v) => patch(log, { bodyweight: v })} />
                  <Metric label="Waist" value={log.waist} onChange={(v) => patch(log, { waist: v })} />
                </div>
                <input
                  type="text"
                  value={log.note ?? ''}
                  placeholder="Note"
                  onChange={(e) => patch(log, { note: e.target.value || undefined })}
                  className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink"
      />
    </label>
  );
}
