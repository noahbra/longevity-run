import { priorLabs, upcomingLabs } from '../engine/reference';
import type { UpcomingLab } from '../engine/reference';
import { Card, CardTitle, ScreenTitle } from '../components/ui';

export default function Labs() {
  const now = upcomingLabs.filter((l) => l.group === 'now');
  const recurring = upcomingLabs.filter((l) => l.group === 'recurring');

  return (
    <div className="space-y-4">
      <ScreenTitle title="Labs" subtitle="Reference — your history + what's next" />

      <Card>
        <CardTitle>Previous labs</CardTitle>
        <ul className="divide-y divide-line">
          {priorLabs.map((l) => (
            <li key={l.name} className="py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-ink">{l.name}</span>
                <span className="shrink-0 text-sm font-semibold text-ink">{l.value}</span>
              </div>
              {l.note && <p className="mt-0.5 text-xs text-muted">{l.note}</p>}
            </li>
          ))}
        </ul>
      </Card>

      <LabScheduleCard title="Order now" labs={now} />
      <LabScheduleCard title="Recurring" labs={recurring} />

      <p className="px-1 text-xs text-muted">
        Reference only, pulled from your plan. This app never interprets labs or changes medication,
        take these to your physician. Ask me to add new results when you get them.
      </p>
    </div>
  );
}

function LabScheduleCard({ title, labs }: { title: string; labs: UpcomingLab[] }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ul className="space-y-2.5">
        {labs.map((l) => (
          <li key={l.name}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-ink">{l.name}</span>
              <span className="shrink-0 text-xs font-medium text-accent">{l.when}</span>
            </div>
            {l.why && <p className="mt-0.5 text-xs text-muted">{l.why}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
