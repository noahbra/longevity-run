import { useMemo } from 'react';
import { useStore } from '../store';
import { dietScore, isStrengthSession, weeklyRecommendation } from '../engine';
import { dietLabels } from '../engine/reference';
import type { WorkoutLog } from '../types';
import { daysBetween, prettyDate } from '../lib/date';
import { Card, CardTitle, ScreenTitle, Stat } from '../components/ui';

function inWindow(date: string, today: string, days = 7): boolean {
  const d = daysBetween(date, today);
  return d >= 0 && d < days;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function Week() {
  const { data, today } = useStore();

  const m = useMemo(() => {
    const logs = data.dailyLogs.filter((l) => inWindow(l.date, today));
    const workouts = data.workouts.filter((w) => inWindow(w.date, today));
    const count = (pred: (w: WorkoutLog) => boolean) => workouts.filter(pred).length;

    const dietColors = logs.map((l) => dietScore(l.diet));
    const redDietDays = dietColors.filter((c) => c === 'red').length;

    const missCounts: Record<string, number> = {};
    for (const l of logs) {
      for (const [k, v] of Object.entries(l.diet)) if (!v) missCounts[k] = (missCounts[k] ?? 0) + 1;
    }
    const mostMissed = Object.entries(missCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const steps = logs.map((l) => l.steps).filter((n): n is number => n != null);
    const sleeps = logs.map((l) => l.sleepHours).filter((n): n is number => n != null);
    const weights = logs.map((l) => l.bodyweight).filter((n): n is number => n != null);
    const waists = logs.map((l) => l.waist).filter((n): n is number => n != null);

    const achillesWorse = logs.some((l) => l.achilles === 'worse' || l.achilles === 'worse_24h');
    const backFlag = logs.some((l) => l.back === 'tight' || l.back === 'pain_24h' || l.back === 'radiating');
    const poorSleepDays = logs.filter((l) => l.sleepQuality === 'poor').length;

    const scheduledInterval = data.state.schedule.includes('Intervals');
    const intervalDone = count((w) => w.sessionType === 'Intervals');

    return {
      strengthDone: count((w) => isStrengthSession(w.sessionType)),
      zone2Done: count((w) => w.sessionType === 'Zone2'),
      intervalDone,
      intervalsCut: scheduledInterval && intervalDone === 0 && logs.length > 0,
      recoveryDone: count((w) => w.sessionType === 'Recovery'),
      stepAvg: avg(steps),
      sleepAvg: avg(sleeps),
      weightAvg: avg(weights),
      waistAvg: avg(waists),
      greenDays: dietColors.filter((c) => c === 'green').length,
      yellowDays: dietColors.filter((c) => c === 'yellow').length,
      redDietDays,
      mostMissed,
      achillesWorse,
      backFlag,
      poorSleepDays,
    };
  }, [data, today]);

  const rec = weeklyRecommendation(data.state, {
    redDietDays: m.redDietDays,
    achillesWorse: m.achillesWorse,
    poorSleepDays: m.poorSleepDays,
    intervalsCut: m.intervalsCut,
    strengthDone: m.strengthDone,
  });

  const start = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const fmt = (n: number | null, digits = 0) => (n == null ? '—' : n.toFixed(digits));

  return (
    <div className="space-y-4">
      <ScreenTitle title="Week" subtitle={`${prettyDate(start)} – ${prettyDate(today)}`} />

      <Card>
        <CardTitle>Sessions</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Strength" value={`${m.strengthDone} / 3`} />
          <Stat label="Zone 2" value={`${m.zone2Done} / 2`} />
          <Stat label="Intervals" value={m.intervalDone > 0 ? 'Done' : m.intervalsCut ? 'Cut' : '—'} />
          <Stat label="Recovery" value={m.recoveryDone > 0 ? 'Done' : '—'} />
        </div>
      </Card>

      <Card>
        <CardTitle>Trends</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Step avg / day" value={m.stepAvg != null ? Math.round(m.stepAvg).toLocaleString() : '—'} />
          <Stat label="Sleep avg" value={fmt(m.sleepAvg, 1)} hint="hours" />
          <Stat label="Weight avg" value={fmt(m.weightAvg, 1)} hint="lb (7-day)" />
          <Stat label="Waist avg" value={fmt(m.waistAvg, 1)} hint="in (7-day)" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-lg px-2 py-1 ${m.achillesWorse ? 'bg-hold-soft text-hold' : 'bg-go-soft text-go'}`}>
            Achilles {m.achillesWorse ? 'worse this week' : 'holding'}
          </span>
          <span className={`rounded-lg px-2 py-1 ${m.backFlag ? 'bg-hold-soft text-hold' : 'bg-go-soft text-go'}`}>
            Back {m.backFlag ? 'flagged' : 'fine'}
          </span>
        </div>
      </Card>

      <Card>
        <CardTitle>Diet</CardTitle>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Green" value={m.greenDays} />
          <Stat label="Yellow" value={m.yellowDays} />
          <Stat label="Red" value={m.redDietDays} />
        </div>
        {m.mostMissed && (
          <p className="mt-3 text-sm text-muted">
            Most-missed habit: <span className="text-ink">{dietLabels[m.mostMissed] ?? m.mostMissed}</span>
          </p>
        )}
      </Card>

      <Card className="border-accent/30 bg-accent/5">
        <CardTitle>This week</CardTitle>
        <p className="text-base font-medium text-ink">{rec}</p>
      </Card>
    </div>
  );
}
