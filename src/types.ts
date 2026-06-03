export interface Config {
  ingreso_tu: number;
  ingreso_pareja: number;
  ingreso_intereses: number;
  capital_inicial: number;
  aporte_boom: number;
  aporte_cruise: number;
  cagr: number;
  swr: number;
  inflacion: number;
  gastos_mensuales: number;
  anos_boom: number;
  horizonte: number;
  fi_number: number;
  colchon_meta_meses: number;
  colchon_aporte: number;
  cop_deuda: number;
  cop_ingreso: number;
  cop_cuota: number;
  cop_tasa: number;
  tipo_cambio: number;
}

export interface BudgetCategory {
  id: string;
  label: string;
  budget: number;
  group: string;
}

export type SemaforoTipo = 'gasto' | 'ahorro';
export type SemaforoStatus = 'green' | 'yellow' | 'red';

export interface KpiLimit {
  id: string;
  label: string;
  meta: number;
  tolerancia: number;
  tipo: SemaforoTipo;
  grupos: string[];
}

export interface KpiResult extends KpiLimit {
  real_pct: number;
  status: SemaforoStatus;
}

/** Per-month, per-category budgeted amounts. */
export type Presupuesto = Record<string, Record<string, number>>;

export interface AppState {
  config: Config;
  presupuesto: Presupuesto;
  colchon_real: Record<string, number>;
  notas: Record<string, string>;
  currentMonth?: string;
  /** ID del usuario en Basiq, tras conectar la cuenta bancaria. */
  basiqUserId?: string;
}

export interface CapitalPoint {
  year: number;
  capital: number;
}

export interface AmortRow {
  mes: number;
  interes: number;
  capital: number;
  saldo: number;
}
