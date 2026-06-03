import { supabase } from './supabase';
import { BUDGET_CATEGORIES } from '../data/defaultConfig';
import type { Movimiento } from '../types';

interface ClassifyResult {
  id: string;
  categoria: string;
}

/**
 * Pide a la IA una categoría sugerida para cada movimiento.
 * Devuelve un mapa { movimientoId -> categoriaId }.
 */
export async function classifyMovimientos(movs: Movimiento[]): Promise<Record<string, string>> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  if (movs.length === 0) return {};

  const { data, error } = await supabase.functions.invoke('classify', {
    body: {
      items: movs.map(m => ({ id: m.id, descripcion: m.descripcion, monto: m.monto })),
      categorias: BUDGET_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const valid = new Set(BUDGET_CATEGORIES.map(c => c.id));
  const map: Record<string, string> = {};
  for (const r of (data?.results as ClassifyResult[]) ?? []) {
    if (r?.id && valid.has(r.categoria)) map[r.id] = r.categoria;
  }
  return map;
}
