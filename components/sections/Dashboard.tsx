'use client';

import '@/lib/chartSetup';
import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useAppState } from '@/lib/state';
import { calcIngreso, calcTotalGasto, calcFiNumber, calcKPIs } from '@/lib/calculations';
import { fmtAUD, fmtPct } from '@/lib/format';
import { BUDGET_CATEGORIES } from '@/lib/defaultConfig';
import { MES_CORTO, parseMes, buildMes } from '@/lib/meses';
import type { AppState, Persona } from '@/lib/types';

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];
type Filtro = 'hogar' | Persona;
const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'hogar', label: '👥 Hogar' },
  { value: 'tu', label: '🧑 Tú' },
  { value: 'pareja', label: '🧑‍🤝‍🧑 Pareja' },
];

function realPorCategoria(state: AppState, mes: string, filtro: Filtro): Record<string, number> {
  const out: Record<string, number> = {};
  state.movimientos
    .filter(m => m.mes === mes && m.tipo === 'gasto' && m.categoria && (filtro === 'hogar' || m.persona === filtro))
    .forEach(m => { out[m.categoria] = (out[m.categoria] || 0) + m.monto; });
  return out;
}

export default function Dashboard() {
  const { state, update } = useAppState();
  const [filtro, setFiltro] = useState<Filtro>('hogar');
  const { config, presupuesto } = state;
  const mes = state.currentMonth || 'May-26';
  const ingreso = calcIngreso(config);
  const gasto = calcTotalGasto(presupuesto, mes);
  const ahorro = ingreso - gasto;
  const ahorroNeto = presupuesto?.[mes]?.inversion ?? config.aporte_boom;
  const colchon = presupuesto?.[mes]?.colchon ?? config.colchon_aporte;
  const fiNumber = calcFiNumber(config);
  const progreso = config.capital_inicial / fiNumber;
  const kpis = calcKPIs(config, presupuesto, mes);

  const real = realPorCategoria(state, mes, filtro);
  const filas = BUDGET_CATEGORIES.map(c => {
    const pres = presupuesto?.[mes]?.[c.id] ?? c.budget;
    const r = real[c.id] ?? 0;
    return { label: c.label, pres, real: r, diff: r - pres };
  }).filter(f => f.pres > 0 || f.real > 0);
  const totalReal = Object.values(real).reduce((a, b) => a + b, 0);
  const sinClasif = state.movimientos.filter(m => m.mes === mes && m.tipo === 'gasto' && !m.categoria).length;
  const ingresosRegistrados = state.movimientos
    .filter(m => m.mes === mes && m.tipo !== 'gasto' && (filtro === 'hogar' || m.persona === filtro))
    .reduce((a, m) => a + m.monto, 0);
  const { mIdx, year } = parseMes(mes);

  const setPeriod = (m: number, y: number): void => update(d => { d.currentMonth = buildMes(m, y); });

  return (
    <>
      <div className="section-header">
        <h2>🏠 Dashboard Principal</h2>
        <div className="month-selector" style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="config-input" style={{ width: 'auto' }} value={filtro}
            onChange={e => setFiltro(e.target.value as Filtro)}>
            {FILTROS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select className="config-input" style={{ width: 'auto' }} value={mIdx}
            onChange={e => setPeriod(Number(e.target.value), year)}>
            {MES_CORTO.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="config-input" style={{ width: 'auto' }} value={year}
            onChange={e => setPeriod(mIdx, Number(e.target.value))}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">💵 Ingreso mensual</div>
          <div className="kpi-value">{fmtAUD(ingreso)}</div>
        </div>
        <div className={`kpi-card ${gasto > ingreso ? 'danger' : ''}`}>
          <div className="kpi-label">📊 Gasto mensual</div>
          <div className="kpi-value">{fmtAUD(gasto)}</div>
        </div>
        <div className={`kpi-card ${ahorro < 0 ? 'danger' : 'success'}`}>
          <div className="kpi-label">💚 Ahorro neto</div>
          <div className="kpi-value">{fmtAUD(ahorro)} <span className="kpi-pct">({fmtPct(ahorro / ingreso)})</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">🚀 Aporte inversión</div>
          <div className="kpi-value">{fmtAUD(ahorroNeto)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">🛡️ Aporte colchón</div>
          <div className="kpi-value">{fmtAUD(colchon)}</div>
        </div>
        <div className={`kpi-card ${ingresosRegistrados > 0 ? 'success' : ''}`}>
          <div className="kpi-label">📈 Ingresos registrados</div>
          <div className="kpi-value">{fmtAUD(ingresosRegistrados)}</div>
        </div>
        <div className="kpi-card highlight">
          <div className="kpi-label">🎯 FI Number</div>
          <div className="kpi-value">{fmtAUD(fiNumber)}</div>
        </div>
      </div>

      <div className="fi-progress-section card">
        <div className="fi-progress-header">
          <span>📈 Progreso hacia Libertad Financiera</span>
          <span className="fi-progress-pct">{fmtPct(progreso)}</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${Math.min(progreso * 100, 100)}%` }} />
        </div>
        <div className="fi-progress-labels">
          <span>{fmtAUD(config.capital_inicial)}</span>
          <span>{fmtAUD(fiNumber)}</span>
        </div>
      </div>

      <div className="semaforos-section">
        <h3>🚦 Semáforos de KPIs</h3>
        <div className="semaforos-grid">
          {kpis.map(k => (
            <div className="semaforo-card" key={k.id}>
              <div className={`semaforo-dot ${k.status} ${k.status === 'red' ? 'pulse-fast' : k.status === 'yellow' ? 'pulse-slow' : ''}`} />
              <div className="semaforo-info">
                <div className="semaforo-label">{k.label}</div>
                <div className="semaforo-values">
                  <span className="semaforo-real">{fmtPct(k.real_pct)}</span>
                  <span className="semaforo-meta">meta: {fmtPct(k.meta)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3>📋 Presupuesto vs Real — {mes}</h3>
          <span style={{ opacity: 0.75 }}>Gasto real: <strong>{fmtAUD(totalReal)}</strong>{sinClasif ? ` · ⚠️ ${sinClasif} sin clasificar` : ''}</span>
        </div>
        {filas.length > 0 && (
          <div style={{ height: Math.max(320, filas.length * 26), margin: '1rem 0' }}>
            <Bar
              data={{
                labels: filas.map(f => f.label),
                datasets: [
                  { label: 'Presupuesto', data: filas.map(f => f.pres), backgroundColor: '#2E75B6' },
                  // La serie "Real" solo aparece cuando ya hay gastos clasificados
                  ...(totalReal > 0
                    ? [{ label: 'Real', data: filas.map(f => f.real), backgroundColor: '#00C896' }]
                    : []),
                ],
              }}
              options={{
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: {
                  legend: { labels: { color: '#94A3B8' } },
                  tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtAUD(ctx.parsed.x ?? 0)}` } },
                },
                scales: {
                  x: { ticks: { color: '#94A3B8', callback: v => fmtAUD(Number(v)) }, grid: { color: '#2D3748' } },
                  y: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { display: false } },
                },
              }}
            />
          </div>
        )}
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Categoría</th><th style={{ textAlign: 'right' }}>Presupuesto</th><th style={{ textAlign: 'right' }}>Real</th><th style={{ textAlign: 'right' }}>Diferencia</th></tr></thead>
            <tbody>
              {filas.map(f => {
                const cls = f.diff > 0 ? 'red' : f.diff < 0 ? 'green' : '';
                const signo = f.diff > 0 ? '+' : '';
                return (
                  <tr key={f.label}>
                    <td>{f.label}</td>
                    <td style={{ textAlign: 'right' }}>{fmtAUD(f.pres)}</td>
                    <td style={{ textAlign: 'right' }}>{f.real ? fmtAUD(f.real) : '—'}</td>
                    <td style={{ textAlign: 'right' }} className={cls}>{f.real ? signo + fmtAUD(f.diff) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
