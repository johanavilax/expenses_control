'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from './supabase/client';
import { DEFAULT_CONFIG, BUDGET_CATEGORIES, MONTHS } from './defaultConfig';
import type { AppState, Presupuesto } from './types';

const STORAGE_KEY = 'lf_dashboard';
const CLOUD_TABLE = 'lf_state';

function getDefaultBudget(): Presupuesto {
  const budget: Presupuesto = {};
  const defaults: Record<string, number> = {};
  BUDGET_CATEGORIES.forEach(c => { defaults[c.id] = c.budget; });
  MONTHS.forEach(m => { budget[m] = { ...defaults }; });
  return budget;
}

export function emptyState(): AppState {
  return {
    config: { ...DEFAULT_CONFIG },
    presupuesto: getDefaultBudget(),
    colchon_real: {},
    notas: {},
    movimientos: [],
    currentMonth: 'May-26',
  };
}

function normalize(s: Partial<AppState>): AppState {
  return {
    ...emptyState(),
    ...s,
    movimientos: (s.movimientos ?? []).map(m => ({
      ...m,
      tipo: ((m.tipo as string) === 'ingreso' ? 'inversion' : m.tipo) ?? 'gasto',
      persona: m.persona ?? 'conjunto',
    })),
    currentMonth: s.currentMonth ?? 'May-26',
  };
}

function loadLocal(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<AppState>);
  } catch {}
  return null;
}

interface Ctx {
  state: AppState;
  update: (mutator: (draft: AppState) => void) => void;
  loading: boolean;
  userId: string;
  userEmail: string;
}

const StateContext = createContext<Ctx | null>(null);

export function useAppState(): Ctx {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState debe usarse dentro de <StateProvider>');
  return ctx;
}

export function StateProvider({ storageKey, userId, userEmail, children }: { storageKey: string; userId: string; userEmail: string; children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<AppState>(emptyState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const local = loadLocal();
    if (local && active) setState(local);
    (async () => {
      const { data } = await supabase.from(CLOUD_TABLE).select('data').eq('id', storageKey).maybeSingle();
      if (active && data?.data) setState(normalize(data.data as Partial<AppState>));
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase, storageKey]);

  const update = (mutator: (draft: AppState) => void): void => {
    setState(prev => {
      const next = structuredClone(prev);
      mutator(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      void supabase.from(CLOUD_TABLE).upsert({ id: storageKey, data: next, updated_at: new Date().toISOString() });
      return next;
    });
  };

  return (
    <StateContext.Provider value={{ state, update, loading, userId, userEmail }}>
      {children}
    </StateContext.Provider>
  );
}
