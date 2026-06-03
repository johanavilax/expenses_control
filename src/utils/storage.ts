import { DEFAULT_CONFIG, BUDGET_CATEGORIES, MONTHS } from '../data/defaultConfig';
import type { AppState, Presupuesto } from '../types';

const STORAGE_KEY = 'lf_dashboard';

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
