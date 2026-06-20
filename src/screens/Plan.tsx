import { useStore } from '../store';
import {
  cardioRamp,
  mealFramework,
  medicalReminders,
  sleepProtocol,
  strengthTemplates,
  supplements,
  themeDinners,
} from '../engine/reference';
import { Card, CardTitle, ScreenTitle } from '../components/ui';

const THEME_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const STRENGTH_KEYS = ['StrengthA', 'StrengthB', 'StrengthC'] as const;
const STRENGTH_TITLES: Record<(typeof STRENGTH_KEYS)[number], string> = {
  StrengthA: 'Strength A',
  StrengthB: 'Strength B',
  StrengthC: 'Strength C',
};

export default function Plan() {
  const { data } = useStore();
  return (
    <div className="space-y-4">
      <ScreenTitle title="Plan" subtitle="Reference. The fixed plan, read-only." />

      <Card>
        <CardTitle>Strength templates</CardTitle>
        <div className="space-y-3">
          {STRENGTH_KEYS.map((k) => (
            <div key={k}>
              <div className="text-sm font-semibold text-ink">{STRENGTH_TITLES[k]}</div>
              <ul className="mt-1 space-y-0.5">
                {strengthTemplates[k].map((name) => {
                  const lift = data.state.lifts[name];
                  return (
                    <li key={name} className="flex justify-between text-sm text-muted">
                      <span>{name}</span>
                      {lift && (
                        <span>
                          {lift.scheme.repLow === lift.scheme.repHigh
                            ? `${lift.scheme.sets}×${lift.scheme.repLow}`
                            : `${lift.scheme.sets}×${lift.scheme.repLow}–${lift.scheme.repHigh}`}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Cardio ramp</CardTitle>
        <div className="text-sm">
          <div className="font-semibold text-ink">Zone 2</div>
          <ul className="mt-1 mb-2 space-y-0.5 text-muted">
            {cardioRamp.zone2.map((z) => (
              <li key={z.phase}>Phase {z.phase}: {z.text}</li>
            ))}
          </ul>
          <div className="font-semibold text-ink">Intervals</div>
          <ul className="mt-1 space-y-0.5 text-muted">
            {cardioRamp.intervals.map((z) => (
              <li key={z.phase}>Phase {z.phase}: {z.text}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{cardioRamp.note}</p>
        </div>
      </Card>

      <Card>
        <CardTitle>Theme nights</CardTitle>
        <ul className="space-y-1.5 text-sm">
          {THEME_DAYS.map((d) => (
            <li key={d}>
              <span className="font-semibold text-ink">{d.slice(0, 3)}</span>{' '}
              <span className="text-muted">{themeDinners[d]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Lunch = the prior day's dinner leftovers.</p>
      </Card>

      <ListCard title="Meal framework" items={mealFramework} />
      <ListCard title="Supplements" items={supplements} />
      <ListCard title="Sleep" items={sleepProtocol} />

      <Card>
        <CardTitle>Labs &amp; medical reminders</CardTitle>
        <ul className="space-y-1 text-sm text-muted">
          {medicalReminders.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl border border-line bg-paper p-3 text-xs text-muted">
          These are reminders only. This app never interprets labs, diagnoses, or changes any
          medication. Those are conversations with your physician.
        </p>
      </Card>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ul className="space-y-1 text-sm text-muted">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </Card>
  );
}
