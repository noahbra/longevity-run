import { useRef, useState } from 'react';
import { useStore } from '../store';
import { exportJSON } from '../state/storage';
import { SESSION_LABELS } from '../engine/reference';
import type { SessionType } from '../types';
import { updateLift, updateScheduleSlot, updateSettings } from '../lib/appActions';
import { Button, Card, CardTitle, ScreenTitle } from '../components/ui';

const SESSION_OPTIONS: SessionType[] = ['StrengthA', 'StrengthB', 'StrengthC', 'Zone2', 'Intervals', 'Recovery'];

export default function Settings() {
  const { data, update, reset, importData } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([exportJSON(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run-export-${data.state.deloadStartDate ?? 'data'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    file.text().then((text) => {
      try {
        importData(text);
        setMsg('Imported. Full state restored.');
      } catch (e) {
        setMsg(`Import failed: ${(e as Error).message}`);
      }
    });
  };

  const doReset = () => {
    if (window.confirm('Reset all data to the seeded deload week? This cannot be undone.')) {
      reset();
      setMsg('Reset to seed.');
    }
  };

  return (
    <div className="space-y-4">
      <ScreenTitle title="Settings" />

      <Card>
        <CardTitle>Data</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" onClick={doExport}>Export JSON</Button>
          <Button variant="subtle" onClick={() => fileRef.current?.click()}>Import JSON</Button>
          <Button variant="subtle" onClick={doReset}>Reset</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
        <p className="mt-2 text-xs text-muted">
          All data lives in this browser. Export regularly to back it up.
        </p>
      </Card>

      <Card>
        <CardTitle>Weekly schedule</CardTitle>
        <div className="space-y-2">
          {data.state.schedule.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-sm text-muted">{i + 1}</span>
              <select
                value={s}
                onChange={(e) => update((d) => updateScheduleSlot(d, i, e.target.value as SessionType))}
                className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink"
              >
                {SESSION_OPTIONS.map((o) => (
                  <option key={o} value={o}>{SESSION_LABELS[o]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Lifts — load, increment, rep range</CardTitle>
        <div className="space-y-3">
          {Object.entries(data.state.lifts).map(([name, lift]) => (
            <div key={name} className="border-b border-line pb-3 last:border-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{name}</span>
                <span className="text-xs text-muted">{lift.kind}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <NumField label="Load" value={lift.weight} onChange={(v) => update((d) => updateLift(d, name, { weight: v }))} />
                <NumField label="Inc" value={lift.increment} onChange={(v) => update((d) => updateLift(d, name, { increment: v }))} />
                <NumField label="Low" value={lift.scheme.repLow} onChange={(v) => update((d) => updateLift(d, name, { scheme: { ...lift.scheme, repLow: v } }))} />
                <NumField label="High" value={lift.scheme.repHigh} onChange={(v) => update((d) => updateLift(d, name, { scheme: { ...lift.scheme, repHigh: v } }))} />
              </div>
              <input
                type="text"
                value={data.settings.substitutions[name] ?? ''}
                placeholder="Substitute (optional)"
                onChange={(e) =>
                  update((d) =>
                    updateSettings(d, {
                      substitutions: { ...d.settings.substitutions, [name]: e.target.value },
                    }),
                  )
                }
                className="mt-2 w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Reminders</CardTitle>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={data.settings.showMedicalReminders}
            onChange={(e) => update((d) => updateSettings(d, { showMedicalReminders: e.target.checked }))}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <span className="text-ink">Show medical reminder cards</span>
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-muted">Caffeine cutoff hour (24h)</span>
          <input
            type="number"
            min={0}
            max={23}
            value={data.settings.caffeineCutoffHour}
            onChange={(e) => update((d) => updateSettings(d, { caffeineCutoffHour: Number(e.target.value) }))}
            className="mt-1 w-24 min-w-0 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink"
          />
        </label>
      </Card>

      <Card>
        <CardTitle>Medical guardrails</CardTitle>
        <p className="text-sm text-muted">
          This app reminds and references. It never starts, stops, or changes any medication, never
          diagnoses, and never interprets lab values or sleep-study results. New diffuse muscle
          soreness is logged as a note for your doctor and never changes your training. Those
          decisions belong to you and your physician.
        </p>
      </Card>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink"
      />
    </label>
  );
}
