import { useMemo } from 'react';
import { useStore } from '../store';
import { lifestyleMeta, supplementMeta } from '../engine/reference';
import type { DailyLog, LifestyleKey, SupplementKey } from '../types';
import { LIFESTYLE_KEYS, SUPPLEMENT_KEYS, defaultDailyLog, upsertDailyLog } from '../lib/appActions';
import { Card, CardTitle, DateNav, ScreenTitle } from '../components/ui';

function last7(today: string): string[] {
  const out: string[] = [];
  const [y, m, d] = today.split('-').map(Number);
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(y, m - 1, d - i);
    out.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
    );
  }
  return out;
}

export default function Habits() {
  const { data, today, selectedDate, setSelectedDate, update } = useStore();
  const log = useMemo(
    () => data.dailyLogs.find((l) => l.date === selectedDate) ?? defaultDailyLog(selectedDate),
    [data.dailyLogs, selectedDate],
  );
  const days = useMemo(() => last7(today), [today]);
  const logsByDate = useMemo(() => {
    const m: Record<string, DailyLog> = {};
    for (const l of data.dailyLogs) m[l.date] = l;
    return m;
  }, [data.dailyLogs]);

  const patch = (p: Partial<DailyLog>) =>
    update((d) => {
      const base = d.dailyLogs.find((l) => l.date === selectedDate) ?? defaultDailyLog(selectedDate);
      return upsertDailyLog(d, { ...base, ...p });
    });

  const setSupp = (k: SupplementKey, v: boolean) =>
    patch({ supplements: { ...log.supplements, [k]: v } });
  const setLife = (k: LifestyleKey, v: boolean) =>
    patch({ lifestyle: { ...log.lifestyle, [k]: v } });

  const suppHistory = (k: SupplementKey) => days.map((dt) => !!logsByDate[dt]?.supplements?.[k]);
  const lifeHistory = (k: LifestyleKey) => days.map((dt) => !!logsByDate[dt]?.lifestyle?.[k]);

  // Weekly tallies
  const saunaCount = days.filter((dt) => logsByDate[dt]?.sauna).length;
  const alcoholWeek = days.reduce((s, dt) => s + (logsByDate[dt]?.alcoholDrinks ?? 0), 0);

  const morningKeys = SUPPLEMENT_KEYS.filter((k) => supplementMeta[k].when !== 'evening' && supplementMeta[k].when !== 'with dinner');
  const eveningKeys = SUPPLEMENT_KEYS.filter((k) => supplementMeta[k].when === 'evening' || supplementMeta[k].when === 'with dinner');

  return (
    <div className="space-y-4">
      <ScreenTitle title="Habits" subtitle="Daily adherence · last 7 days" />
      <DateNav date={selectedDate} today={today} onChange={setSelectedDate} />

      <Card>
        <CardTitle>Supplements &amp; meds</CardTitle>
        <div className="space-y-1">
          {morningKeys.map((k) => (
            <HabitRow
              key={k}
              label={supplementMeta[k].label}
              when={supplementMeta[k].when}
              checked={!!log.supplements?.[k]}
              onChange={(v) => setSupp(k, v)}
              history={suppHistory(k)}
            />
          ))}
          <div className="my-1 border-t border-line" />
          {eveningKeys.map((k) => (
            <HabitRow
              key={k}
              label={supplementMeta[k].label}
              when={supplementMeta[k].when}
              checked={!!log.supplements?.[k]}
              onChange={(v) => setSupp(k, v)}
              history={suppHistory(k)}
              emphasize={k === 'statin'}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Lifestyle</CardTitle>
        <div className="space-y-1">
          {LIFESTYLE_KEYS.map((k) => (
            <HabitRow
              key={k}
              label={lifestyleMeta[k]}
              checked={!!log.lifestyle?.[k]}
              onChange={(v) => setLife(k, v)}
              history={lifeHistory(k)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Weekly</CardTitle>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={!!log.sauna}
                onChange={(e) => patch({ sauna: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className={log.sauna ? 'text-ink' : 'text-muted'}>Sauna today</span>
            </label>
            <span className="text-sm text-muted">{saunaCount} / 2–4 this week</span>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-muted">Alcohol this week</span>
            <span className={`text-sm font-medium ${alcoholWeek > 3 ? 'text-stop' : 'text-go'}`}>
              {alcoholWeek} / ≤3 drinks
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Dots({ history }: { history: boolean[] }) {
  return (
    <div className="flex gap-1">
      {history.map((on, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-go' : 'bg-line'}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function HabitRow({
  label,
  when,
  checked,
  onChange,
  history,
  emphasize,
}: {
  label: string;
  when?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  history: boolean[];
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span className={`truncate ${checked ? 'text-ink' : 'text-muted'} ${emphasize ? 'font-semibold' : ''}`}>
          {label}
          {when && <span className="ml-1 text-xs text-muted">· {when}</span>}
        </span>
      </label>
      <Dots history={history} />
    </div>
  );
}
