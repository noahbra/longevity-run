import { useState } from 'react';
import Today from './screens/Today';
import Week from './screens/Week';
import Plan from './screens/Plan';
import Log from './screens/Log';
import Settings from './screens/Settings';

type Tab = 'Today' | 'Week' | 'Plan' | 'Log' | 'Settings';
const TABS: Tab[] = ['Today', 'Week', 'Plan', 'Log', 'Settings'];

export default function App() {
  const [tab, setTab] = useState<Tab>('Today');

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col overflow-x-hidden">
      <main className="flex-1 px-4 pb-28 pt-5">
        {tab === 'Today' && <Today />}
        {tab === 'Week' && <Week />}
        {tab === 'Plan' && <Plan />}
        {tab === 'Log' && <Log />}
        {tab === 'Settings' && <Settings />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-card">
        <div className="mx-auto flex max-w-xl">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
