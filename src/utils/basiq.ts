import { supabase } from './supabase';

/** Movimiento bancario tal como lo devuelve Basiq (campos relevantes). */
export interface BasiqTransaction {
  id: string;
  /** Monto como string; negativo para débitos, p.ej. "-25.00". */
  amount: string;
  description: string;
  postDate: string;
  direction: 'debit' | 'credit';
  account?: string;
}

interface ConnectResult {
  userId: string;
  /** URL del flujo de consentimiento Basiq donde el usuario conecta CommBank. */
  url: string;
}

/**
 * Crea (o reutiliza) el usuario en Basiq y devuelve el enlace de consentimiento
 * para conectar el banco. Toda la lógica con el secreto vive en la Edge Function.
 */
export async function connectBank(userId: string | null, email: string): Promise<ConnectResult> {
  if (!supabase) throw new Error('Supabase no está configurado (revisa el .env).');
  const { data, error } = await supabase.functions.invoke('basiq', {
    body: { action: 'connect', userId, email },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as ConnectResult;
}

/** Trae los movimientos de las cuentas conectadas a Basiq. */
export async function fetchTransactions(userId: string): Promise<BasiqTransaction[]> {
  if (!supabase) throw new Error('Supabase no está configurado (revisa el .env).');
  const { data, error } = await supabase.functions.invoke('basiq', {
    body: { action: 'transactions', userId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.transactions as BasiqTransaction[]) ?? [];
}
