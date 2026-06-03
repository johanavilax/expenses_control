import { DEFAULT_CONFIG, BUDGET_CATEGORIES, MONTHS } from '../data/defaultConfig';
import { supabase } from './supabase';
import type { AppState, Presupuesto } from '../types';

const STORAGE_KEY = 'lf_dashboard';
const CLOUD_TABLE = 'lf_state';

function getDefaultBudget(): Presupuesto {
  const budget: Presupuesto = {};
  const defaults: Record<string, number> = {};
  BUDGET_CATEGORIES.forEach(c => { defaults[c.id] = c.budget; });
  MONTHS.forEach(m => { budget[m] = { ...defaults }; });
  return budget;
}

function emptyState(): AppState {
  return {
    config: { ...DEFAULT_CONFIG },
    presupuesto: getDefaultBudget(),
    colchon_real: {},
    notas: {},
    movimientos: [],
  };
}

/** Rellena campos faltantes en estados guardados con versiones anteriores. */
function normalize(state: Partial<AppState>): AppState {
  return {
    ...emptyState(),
    ...state,
    movimientos: state.movimientos ?? [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<AppState>);
  } catch {}
  return emptyState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function resetState(): AppState {
  localStorage.removeItem(STORAGE_KEY);
  return loadState();
}

/** Sube el estado del usuario a Supabase. No-op si no hay cliente o userId. */
export async function pushStateToCloud(state: AppState, userId: string | null): Promise<void> {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from(CLOUD_TABLE)
    .upsert({ id: userId, data: state, updated_at: new Date().toISOString() });
  if (error) console.warn('[supabase] push falló:', error.message);
}

/** Lee el estado del usuario desde Supabase. null si no hay datos/cliente/userId. */
export async function pullStateFromCloud(userId: string | null): Promise<AppState | null> {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .select('data')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[supabase] pull falló:', error.message);
    return null;
  }
  return data?.data ? normalize(data.data as Partial<AppState>) : null;
}
