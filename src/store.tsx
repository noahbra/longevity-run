// ── Store (thin) ─────────────────────────────────────────────────────────────
// Holds AppData, persists it via storage.ts, and hands the engine its inputs.
// Components read/write through here; nothing else imports storage.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData } from './types';
import { loadAppData, parseImport, resetAppData, saveAppData } from './state/storage';
import { reconcileDeload } from './engine';
import { todayISO } from './lib/date';

// Load persisted data and reconcile the deload window for today in one pass
// (exit after 7 days / enter on trigger) — done at init so there's no extra render.
function loadReconciled(today: string): AppData {
  const data = loadAppData(today);
  const state = reconcileDeload(data.state, today);
  return state === data.state ? data : { ...data, state };
}

interface StoreValue {
  data: AppData;
  today: string;
  update: (fn: (draft: AppData) => AppData) => void;
  reset: () => void;
  importData: (json: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => todayISO(), []);
  const [data, setData] = useState<AppData>(() => loadReconciled(today));

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  const update = useCallback((fn: (draft: AppData) => AppData) => {
    setData((prev) => fn(structuredClone(prev)));
  }, []);

  const reset = useCallback(() => {
    setData(resetAppData(today));
  }, [today]);

  const importData = useCallback((json: string) => {
    const next = parseImport(json);
    saveAppData(next);
    setData(next);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({ data, today, update, reset, importData }),
    [data, today, update, reset, importData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook colocated by design
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
