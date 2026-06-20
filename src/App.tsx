import { useState } from 'react';
import Today from './screens/Today';
import Train from './screens/Train';
import Eat from './screens/Eat';
import Measure from './screens/Measure';
import Habits from './screens/Habits';
import Week from './screens/Week';
import Labs from './screens/Labs';
import Plan from './screens/Plan';
import Log from './screens/Log';
import Settings from './screens/Settings';

export type Tab = 'Today' | 'Train' | 'Eat' | 'Measure' | 'Habits' | 'Week' | 'Labs' | 'Plan' | 'Log' | 'Settings';
const PRIMARY: Tab[] = ['Today', 'Train', 'Eat', 'Measure', 'Habits', 'Week'];
const SECONDARY: Tab[] = ['Labs', 'Plan', 'Log', 'Settings'];

export default function App() {
  const [tab, setTab] = useState<Tab>('Today');
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (t: Tab) => {
    setTab(t);
    setMoreOpen(false);
  };

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col overflow-x-hidden">
      <main className="flex-1 px-4 pb-28 pt-5">
        {tab === 'Today' && <Today onNavigate={go} />}
        {tab === 'Train' && <Train />}
        {tab === 'Eat' && <Eat />}
        {tab === 'Measure' && <Measure />}
        {tab === 'Habits' && <Habits />}
        {tab === 'Week' && <Week />}
        {tab === 'Labs' && <Labs />}
        {tab === 'Plan' && <Plan />}
        {tab === 'Log' && <Log />}
        {tab === 'Settings' && <Settings />}
      </main>

      {moreOpen && (
        <div className="fixed inset-x-0 bottom-12 z-10 mx-auto max-w-xl border-t border-line bg-card shadow-lg">
          {SECONDARY.map((t) => (
            <button
              key={t}
              onClick={() => go(t)}
              className={`block w-full px-4 py-3 text-left text-sm font-medium ${
                tab === t ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-card">
        <div className="mx-auto flex max-w-xl">
          {PRIMARY.map((t) => (
            <button
              key={t}
              onClick={() => go(t)}
              className={`flex-1 py-3 text-[11px] font-medium transition-colors ${
                tab === t ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex-1 py-3 text-[11px] font-medium transition-colors ${
              SECONDARY.includes(tab) ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
