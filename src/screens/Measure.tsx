import { useMemo } from 'react';
import { useStore } from '../store';
import type { BPReading, DailyLog } from '../types';
import { daysBetween } from '../lib/date';
import { defaultDailyLog, endBPBlock, startBPBlock, upsertDailyLog } from '../lib/appActions';
import { Button, Card, CardTitle, DateNav, ScreenTitle, Stat } from '../components/ui';

const SLOTS: { slot: BPReading['slot']; label: string }[] = [
  { slot: 'am1', label: 'AM 1' },
  { slot: 'am2', label: 'AM 2' },
  { slot: 'pm1', label: 'PM 1' },
  { slot: 'pm2', label: 'PM 2' },
];

function avg(nums: number[]): number | null {
  const v = nums.filter((n) => n > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export default function Measure() {
  const { data, today, selectedDate, setSelectedDate, update } = useStore();
  const log = useMemo(
    () => data.dailyLogs.find((l) => l.date === selectedDate) ?? defaultDailyLog(selectedDate),
    [data.dailyLogs, selectedDate],
  );

  const patch = (p: Partial<DailyLog>) =>
    update((d) => {
      const base = d.dailyLogs.find((l) => l.date === selectedDate) ?? defaultDailyLog(selectedDate);
      return upsertDailyLog(d, { ...base, ...p });
    });

  // Trailing 7-day averages
  const recent = useMemo(
    () => data.dailyLogs.filter((l) => daysBetween(l.date, today) >= 0 && daysBetween(l.date, today) < 7),
    [data.dailyLogs, today],
  );
  const stepAvg = avg(recent.map((l) => l.steps ?? 0));
  const weightVals = recent.map((l) => l.bodyweight ?? 0).filter((n) => n > 0);
  const weightAvg = weightVals.length ? (weightVals.reduce((a, b) => a + b, 0) / weightVals.length).toFixed(1) : '—';
  const sleepVals = recent.map((l) => l.sleepHours ?? 0).filter((n) => n > 0);
  const sleepAvg = sleepVals.length ? (sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length).toFixed(1) : '—';
  const waistVals = data.dailyLogs
    .filter((l) => (l.waist ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastWaist = waistVals[0]?.waist;
  const prevWaist = waistVals[1]?.waist;

  // BP block
  const block = useMemo(() => {
    const start = data.bpBlockStart;
    if (!start) return null;
    const day = daysBetween(start, today) + 1; // 1-indexed
    const readings = data.dailyLogs
      .filter((l) => {
        const off = daysBetween(start, l.date);
        return off >= 1 && off <= 6; // discard day 1 (off === 0)
      })
      .flatMap((l) => l.bp ?? []);
    return {
      day,
      complete: day > 7,
      count: readings.length,
      avgSys: avg(readings.map((r) => r.systolic)),
      avgDia: avg(readings.map((r) => r.diastolic)),
    };
  }, [data.bpBlockStart, data.dailyLogs, today]);

  const setBP = (slot: BPReading['slot'], field: 'systolic' | 'diastolic', val: number) => {
    const existing = log.bp ?? [];
    const idx = existing.findIndex((r) => r.slot === slot);
    const cur: BPReading = idx >= 0 ? existing[idx] : { slot, systolic: 0, diastolic: 0 };
    const updated = { ...cur, [field]: val };
    const next = idx >= 0 ? existing.map((r, i) => (i === idx ? updated : r)) : [...existing, updated];
    patch({ bp: next });
  };
  const bpFor = (slot: BPReading['slot']) => (log.bp ?? []).find((r) => r.slot === slot);

  return (
    <div className="space-y-4">
      <ScreenTitle title="Measure" subtitle="The numbers" />
      <DateNav date={selectedDate} today={today} onChange={setSelectedDate} />

      <Card>
        <CardTitle>Daily</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Steps" value={log.steps} onChange={(v) => patch({ steps: v })} />
          <NumberField label="Weight (lb)" value={log.bodyweight} onChange={(v) => patch({ bodyweight: v })} step="0.1" />
        </div>
        <p className="mt-2 text-xs text-muted">
          7-day avg — steps {stepAvg != null ? stepAvg.toLocaleString() : '—'} · weight {weightAvg} lb · sleep {sleepAvg} h
        </p>
      </Card>

      <Card>
        <CardTitle>Weekly</CardTitle>
        <NumberField label="Waist (in)" value={log.waist} onChange={(v) => patch({ waist: v })} step="0.1" />
        <p className="mt-2 text-xs text-muted">
          {lastWaist != null
            ? `Last ${lastWaist} in${prevWaist != null ? ` · ${(lastWaist - prevWaist >= 0 ? '+' : '') + (lastWaist - prevWaist).toFixed(1)} vs prior` : ''}`
            : 'Measure at the navel, same conditions, ~1×/week.'}
        </p>
      </Card>

      <Card>
        <CardTitle>Blood pressure</CardTitle>
        {!block && (
          <>
            <p className="mb-3 text-sm text-muted">
              7-day home block: 2 AM + 2 PM readings/day, rested 5 min. Day 1 is discarded, the rest
              are averaged.
            </p>
            <Button onClick={() => update((d) => startBPBlock(d, today))}>Start 7-day BP block</Button>
          </>
        )}
        {block && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className={`text-sm font-medium ${block.complete ? 'text-go' : 'text-ink'}`}>
                {block.complete ? 'Block complete' : `Day ${block.day} of 7`}
              </span>
              <Button variant="subtle" onClick={() => update((d) => endBPBlock(d))}>
                {block.complete ? 'Close block' : 'Cancel'}
              </Button>
            </div>
            {!block.complete && (
              <div className="space-y-2">
                {SLOTS.map(({ slot, label }) => {
                  const r = bpFor(slot);
                  return (
                    <div key={slot} className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-sm text-muted">{label}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="sys"
                        value={r?.systolic || ''}
                        onChange={(e) => setBP(slot, 'systolic', Number(e.target.value))}
                        className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
                      />
                      <span className="text-muted">/</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="dia"
                        value={r?.diastolic || ''}
                        onChange={(e) => setBP(slot, 'diastolic', Number(e.target.value))}
                        className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat
                label="Block average"
                value={block.avgSys != null ? `${block.avgSys}/${block.avgDia}` : '—'}
                hint={`${block.count} readings (day 1 excluded)`}
              />
            </div>
          </>
        )}
      </Card>

      <p className="px-1 text-xs text-muted">
        This app records measurements. It never interprets BP, diagnoses, or changes medication.
        Those are conversations with your physician. See the Labs tab for your history and schedule.
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="mt-1 w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-lg font-semibold text-ink"
      />
    </label>
  );
}
