import { BUDGET_CATEGORIES } from './defaultConfig';
import type { Movimiento } from './types';

export interface BasiqTransaction {
  id: string;
  amount: string;
  description: string;
  postDate: string;
  direction: 'debit' | 'credit';
  account?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data?.error) throw new Error(data?.error ?? `Error ${res.status}`);
  return data as T;
}

export function connectBank(userId: string | null, email: string): Promise<{ userId: string; url: string }> {
  return post('/api/basiq', { action: 'connect', userId, email });
}

export async function fetchTransactions(userId: string): Promise<BasiqTransaction[]> {
  const data = await post<{ transactions: BasiqTransaction[] }>('/api/basiq', { action: 'transactions', userId });
  return data.transactions ?? [];
}

interface ClassifyResult { id: string; categoria: string }

/** Pide a la IA una categoría sugerida por movimiento. Devuelve { movId -> categoriaId }. */
export async function classifyMovimientos(movs: Movimiento[]): Promise<Record<string, string>> {
  if (movs.length === 0) return {};
  const data = await post<{ results: ClassifyResult[] }>('/api/classify', {
    items: movs.map(m => ({ id: m.id, descripcion: m.descripcion, monto: m.monto })),
    categorias: BUDGET_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
  });
  const valid = new Set(BUDGET_CATEGORIES.map(c => c.id));
  const map: Record<string, string> = {};
  for (const r of data.results ?? []) {
    if (r?.id && valid.has(r.categoria)) map[r.id] = r.categoria;
  }
  return map;
}
