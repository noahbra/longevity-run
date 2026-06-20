import { useMemo } from 'react';
import { useStore } from '../store';
import {
  defaultBreakfast,
  dessertSuggestion,
  dietRatingCopy,
  mealLabels,
  snackSuggestion,
  themeDinners,
} from '../engine/reference';
import type { DailyLog, DietRating, MealKey, MealStatus } from '../types';
import { dayName } from '../lib/date';
import { MEAL_KEYS, defaultDailyLog, deriveDiet, upsertDailyLog } from '../lib/appActions';
import { Card, CardTitle, ScreenTitle, Segmented } from '../components/ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const prevWeekday = (name: string) => WEEKDAYS[(WEEKDAYS.indexOf(name) + 6) % 7];

export default function Eat() {
  const { data, today, update } = useStore();
  const log = useMemo(
    () => data.dailyLogs.find((l) => l.date === today) ?? defaultDailyLog(today),
    [data.dailyLogs, today],
  );

  const wd = dayName(today);
  const dishes: Record<MealKey, string> = {
    breakfast: defaultBreakfast,
    lunch: `${themeDinners[prevWeekday(wd)]} (leftovers)`,
    dinner: themeDinners[wd],
    snack: snackSuggestion,
    dessert: dessertSuggestion,
  };

  // Any change to meals/levers re-derives the 9-key pattern so the Week score holds.
  const patchEat = (p: Partial<DailyLog>) =>
    update((d) => {
      const base = d.dailyLogs.find((l) => l.date === today) ?? defaultDailyLog(today);
      const merged: DailyLog = { ...base, ...p, diet: { ...base.diet, ...(p.diet ?? {}) } };
      merged.diet = deriveDiet(merged);
      return upsertDailyLog(d, merged);
    });

  const setMeal = (k: MealKey, status: MealStatus) =>
    patchEat({ meals: { ...log.meals, [k]: status } });

  const rating = log.dietRating;

  return (
    <div className="space-y-4">
      <ScreenTitle title="Eat" subtitle={`${wd}'s menu`} />

      <Card>
        <CardTitle>Today's menu — check what you ate</CardTitle>
        <div className="space-y-3">
          {MEAL_KEYS.map((k) => (
            <div key={k} className="rounded-xl border border-line p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{mealLabels[k]}</span>
              </div>
              <p className="mb-2 mt-0.5 text-xs text-muted">{dishes[k]}</p>
              <Segmented
                value={(log.meals?.[k] ?? '') as MealStatus}
                onChange={(v) => setMeal(k, v as MealStatus)}
                tone={(v) => (v === 'planned' ? 'go' : v === 'skipped' ? 'hold' : 'stop')}
                options={[
                  { value: 'planned' as MealStatus, label: 'As planned' },
                  { value: 'offplan' as MealStatus, label: 'Off-plan' },
                  { value: 'skipped' as MealStatus, label: 'Skipped' },
                ]}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Daily levers</CardTitle>
        <div className="space-y-1.5">
          <Toggle
            label="Psyllium (before dinner, 2h off statin)"
            checked={!!log.diet?.psyllium}
            onChange={(v) => patchEat({ diet: { ...log.diet, psyllium: v } })}
          />
          <Toggle
            label="Nuts (~30 g)"
            checked={!!log.diet?.nuts}
            onChange={(v) => patchEat({ diet: { ...log.diet, nuts: v } })}
          />
        </div>
        <label className="mt-3 block">
          <span className="text-xs text-muted">Alcohol — drinks today (keep ≤3/week)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={log.alcoholDrinks ?? ''}
            placeholder="0"
            onChange={(e) =>
              patchEat({ alcoholDrinks: e.target.value === '' ? undefined : Number(e.target.value) })
            }
            className="mt-1 w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
          />
        </label>
      </Card>

      <Card>
        <CardTitle>How did you eat today?</CardTitle>
        <Segmented
          value={(rating ?? '') as DietRating}
          onChange={(v) => patchEat({ dietRating: v as DietRating })}
          tone={(v) => (v === 'good' ? 'go' : v === 'okay' ? 'hold' : 'stop')}
          options={[
            { value: 'good' as DietRating, label: 'Dialed' },
            { value: 'okay' as DietRating, label: 'Okay' },
            { value: 'off' as DietRating, label: 'Off' },
          ]}
        />
        {rating && (
          <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm text-muted">{dietRatingCopy[rating]}</p>
        )}
      </Card>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-accent)]"
      />
      <span className={checked ? 'text-ink' : 'text-muted'}>{label}</span>
    </label>
  );
}
