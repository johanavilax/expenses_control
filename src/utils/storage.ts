import { DEFAULT_CONFIG, BUDGET_CATEGORIES, MONTHS } from '../data/defaultConfig';
import { supabase } from './supabase';
import type { AppState, Presupuesto } from '../types';

const STORAGE_KEY = 'lf_dashboard';

/** Tabla y fila únicas en Supabase (app de un solo usuario). */
const CLOUD_TABLE = 'lf_state';
const CLOUD_ID = 'default';

function getDefaultBudget(): Presupuesto {
  const budget: Presupuesto = {};
  const defaults: Record<string, number> = {};
  BUDGET_CATEGORIES.forEach(c => { defaults[c.id] = c.budget; });
  MONTHS.forEach(m => { budget[m] = { ...defaults }; });
  return budget;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {}
  return {
    config: { ...DEFAULT_CONFIG },
    presupuesto: getDefaultBudget(),
    colchon_real: {},
    notas: {},
  };
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

/** Sube el estado completo a Supabase. No-op si no está configurado. */
export async function pushStateToCloud(state: AppState): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(CLOUD_TABLE)
    .upsert({ id: CLOUD_ID, data: state, updated_at: new Date().toISOString() });
  if (error) console.warn('[supabase] push falló:', error.message);
}

/** Lee el estado desde Supabase. Devuelve null si no hay datos o no está configurado. */
export async function pullStateFromCloud(): Promise<AppState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .select('data')
    .eq('id', CLOUD_ID)
    .maybeSingle();
  if (error) {
    console.warn('[supabase] pull falló:', error.message);
    return null;
  }
  return (data?.data as AppState) ?? null;
}
