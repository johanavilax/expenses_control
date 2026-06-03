import { BUDGET_CATEGORIES, KPI_LIMITS } from '../data/defaultConfig';
import type {
  Config,
  Presupuesto,
  KpiResult,
  SemaforoTipo,
  SemaforoStatus,
  CapitalPoint,
  AmortRow,
} from '../types';

export function calcIngreso(cfg: Config): number {
  return cfg.ingreso_tu + cfg.ingreso_pareja + cfg.ingreso_intereses;
}

export function calcGrupoPorMes(presupuesto: Presupuesto, mes: string): Record<string, number> {
  const totals: Record<string, number> = {};
  BUDGET_CATEGORIES.forEach(c => {
    const val = presupuesto?.[mes]?.[c.id] ?? c.budget;
    totals[c.group] = (totals[c.group] || 0) + val;
    totals[c.id] = val;
  });
  return totals;
}

export function calcTotalGasto(presupuesto: Presupuesto, mes: string): number {
  let total = 0;
  BUDGET_CATEGORIES.forEach(c => {
    total += presupuesto?.[mes]?.[c.id] ?? c.budget;
  });
  return total;
}

export function calcAhorroNeto(ingreso: number, gasto: number): number {
  return ingreso - gasto;
}

export function semaforo(real_pct: number, meta_pct: number, tolerancia: number, tipo: SemaforoTipo): SemaforoStatus {
  if (tipo === 'ahorro') {
    if (real_pct >= meta_pct) return 'green';
    if (real_pct >= meta_pct - tolerancia) return 'yellow';
    return 'red';
  } else {
    if (real_pct <= meta_pct) return 'green';
    if (real_pct <= meta_pct + tolerancia) return 'yellow';
    return 'red';
  }
}

export function calcKPIs(config: Config, presupuesto: Presupuesto, mes: string): KpiResult[] {
  const ingreso = calcIngreso(config);
  const grupos = calcGrupoPorMes(presupuesto, mes);
  const total_gasto = calcTotalGasto(presupuesto, mes);
  const ahorro = calcAhorroNeto(ingreso, total_gasto);

  return KPI_LIMITS.map(kpi => {
    let real: number;
    if (kpi.id === 'ahorro_neto') {
      real = ahorro / ingreso;
    } else {
      const sum = kpi.grupos.reduce((acc, g) => acc + (grupos[g] || 0), 0);
      real = sum / ingreso;
    }
    return {
      ...kpi,
      real_pct: real,
      status: semaforo(real, kpi.meta, kpi.tolerancia, kpi.tipo),
    };
  });
}

export function calcFiNumber(config: Config): number {
  return config.gastos_mensuales * 12 / config.swr;
}

export function projectCapital(config: Config): CapitalPoint[] {
  const { capital_inicial, aporte_boom, aporte_cruise, cagr, anos_boom, horizonte } = config;
  const points: CapitalPoint[] = [{ year: 0, capital: capital_inicial }];
  let cap = capital_inicial;
  for (let y = 1; y <= horizonte; y++) {
    const aporte = y <= anos_boom ? aporte_boom * 12 : aporte_cruise * 12;
    cap = cap * (1 + cagr) + aporte;
    points.push({ year: y, capital: Math.round(cap) });
  }
  return points;
}

export function projectCapitalReal(config: Config): CapitalPoint[] {
  return projectCapital(config).map(p => ({
    year: p.year,
    capital: Math.round(p.capital / Math.pow(1 + config.inflacion, p.year)),
  }));
}

export function calcColchonProjection(meta: number, aporte: number, rateAnual: number, meses: number): number[] {
  const rate = rateAnual / 12;
  const data: number[] = [0];
  for (let i = 1; i <= meses; i++) {
    const prev = data[i - 1];
    data.push(Math.min(meta, prev * (1 + rate) + aporte));
  }
  return data;
}

export function calcMesesParaColchon(meta: number, aporte: number, rateAnual: number): number {
  const rate = rateAnual / 12;
  if (aporte <= 0) return Infinity;
  return Math.ceil(Math.log(meta / (meta - aporte / rate)) / Math.log(1 + rate));
}

export function calcCopAmortizacion(deuda: number, cuota: number, tasaEA: number): AmortRow[] {
  const tasaMensual = Math.pow(1 + tasaEA, 1 / 12) - 1;
  const data: AmortRow[] = [];
  let saldo = deuda;
  let mes = 0;
  while (saldo > 0 && mes < 120) {
    mes++;
    const interes = saldo * tasaMensual;
    const capital = Math.min(cuota - interes, saldo);
    saldo = Math.max(0, saldo - capital);
    data.push({ mes, interes: Math.round(interes), capital: Math.round(capital), saldo: Math.round(saldo) });
    if (capital <= 0) break;
  }
  return data;
}

export function animateValue(
  el: HTMLElement,
  from: number,
  to: number,
  duration: number,
  formatter: (value: number) => string,
): void {
  const start = performance.now();
  function update(now: number): void {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = from + (to - from) * eased;
    el.textContent = formatter(value);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
