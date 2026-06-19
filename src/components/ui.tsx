import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{children}</h2>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  tone?: (v: T) => 'go' | 'hold' | 'stop' | 'neutral';
}

export function Segmented<T extends string>({ value, options, onChange, tone }: SegmentedProps<T>) {
  const toneClass = (v: T, active: boolean) => {
    if (!active) return 'bg-paper text-muted hover:text-ink';
    const t = tone ? tone(v) : 'neutral';
    switch (t) {
      case 'go':
        return 'bg-go-soft text-go ring-1 ring-go/30';
      case 'hold':
        return 'bg-hold-soft text-hold ring-1 ring-hold/30';
      case 'stop':
        return 'bg-stop-soft text-stop ring-1 ring-stop/30';
      default:
        return 'bg-accent text-white';
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${toneClass(o.value, active)}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Stacked label-over-control row — keeps wide segmented controls from
// overflowing narrow phone widths.
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-ink">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'subtle';
  className?: string;
}) {
  const v =
    variant === 'primary'
      ? 'bg-accent text-white hover:opacity-90'
      : variant === 'subtle'
        ? 'bg-paper text-ink border border-line hover:bg-line/40'
        : 'text-muted hover:text-ink';
  return (
    <button onClick={onClick} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${v} ${className}`}>
      {children}
    </button>
  );
}
