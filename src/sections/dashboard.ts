import Chart from 'chart.js/auto';
import { calcIngreso, calcTotalGasto, calcFiNumber, calcKPIs } from '../utils/calculations';
import { fmtAUD, fmtPct } from '../utils/format';
import { BUDGET_CATEGORIES } from '../data/defaultConfig';
import type { AppState } from '../types';

let chartPresup: Chart | null = null;

/** Suma de movimientos reales por categoría para un mes. */
function realPorCategoria(state: AppState, mes: string): Record<string, number> {
  const out: Record<string, number> = {};
  state.movimientos.filter(m => m.mes === mes && m.categoria).forEach(m => {
    out[m.categoria] = (out[m.categoria] || 0) + m.monto;
  });
  return out;
}

export function renderDashboard(state: AppState, container: HTMLElement): void {
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

  // Real (movimientos) vs presupuesto por categoría
  const real = realPorCategoria(state, mes);
  const filas = BUDGET_CATEGORIES.map(c => {
    const pres = presupuesto?.[mes]?.[c.id] ?? c.budget;
    const r = real[c.id] ?? 0;
    return { label: c.label, pres, real: r, diff: r - pres };
  }).filter(f => f.pres > 0 || f.real > 0);
  const totalReal = Object.values(real).reduce((a, b) => a + b, 0);
  const sinClasif = state.movimientos.filter(m => m.mes === mes && !m.categoria).length;

  container.innerHTML = `
    <div class="section-header">
      <h2>🏠 Dashboard Principal</h2>
      <div class="month-badge">${mes}</div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">💵 Ingreso mensual</div>
        <div class="kpi-value kpi-anim">${fmtAUD(ingreso)}</div>
      </div>
      <div class="kpi-card ${gasto > ingreso ? 'danger' : ''}">
        <div class="kpi-label">📊 Gasto mensual</div>
        <div class="kpi-value kpi-anim">${fmtAUD(gasto)}</div>
      </div>
      <div class="kpi-card ${ahorro < 0 ? 'danger' : 'success'}">
        <div class="kpi-label">💚 Ahorro neto</div>
        <div class="kpi-value kpi-anim">${fmtAUD(ahorro)} <span class="kpi-pct">(${fmtPct(ahorro/ingreso)})</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">🚀 Aporte inversión</div>
        <div class="kpi-value kpi-anim">${fmtAUD(ahorroNeto)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">🛡️ Aporte colchón</div>
        <div class="kpi-value kpi-anim">${fmtAUD(colchon)}</div>
      </div>
      <div class="kpi-card highlight">
        <div class="kpi-label">🎯 FI Number</div>
        <div class="kpi-value kpi-anim">${fmtAUD(fiNumber)}</div>
      </div>
    </div>

    <div class="fi-progress-section card">
      <div class="fi-progress-header">
        <span>📈 Progreso hacia Libertad Financiera</span>
        <span class="fi-progress-pct">${fmtPct(progreso)}</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width: 0%" data-target="${progreso * 100}"></div>
      </div>
      <div class="fi-progress-labels">
        <span>${fmtAUD(config.capital_inicial)}</span>
        <span>${fmtAUD(fiNumber)}</span>
      </div>
    </div>

    <div class="semaforos-section">
      <h3>🚦 Semáforos de KPIs</h3>
      <div class="semaforos-grid">
        ${kpis.map(k => `
          <div class="semaforo-card">
            <div class="semaforo-dot ${k.status} ${k.status === 'red' ? 'pulse-fast' : k.status === 'yellow' ? 'pulse-slow' : ''}"></div>
            <div class="semaforo-info">
              <div class="semaforo-label">${k.label}</div>
              <div class="semaforo-values">
                <span class="semaforo-real">${fmtPct(k.real_pct)}</span>
                <span class="semaforo-meta">meta: ${fmtPct(k.meta)}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:1.5rem">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
        <h3>📋 Presupuesto vs Real — ${mes}</h3>
        <span style="opacity:0.75">Gasto real: <strong>${fmtAUD(totalReal)}</strong>${sinClasif ? ` · ⚠️ ${sinClasif} sin clasificar` : ''}</span>
      </div>
      <div style="height:${Math.max(320, filas.length * 26)}px;margin:1rem 0">
        <canvas id="chartPresup"></canvas>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Categoría</th><th style="text-align:right">Presupuesto</th><th style="text-align:right">Real</th><th style="text-align:right">Diferencia</th></tr></thead>
          <tbody>
            ${filas.map(f => {
              const cls = f.diff > 0 ? 'red' : f.diff < 0 ? 'green' : '';
              const signo = f.diff > 0 ? '+' : '';
              return `<tr>
                <td>${f.label}</td>
                <td style="text-align:right">${fmtAUD(f.pres)}</td>
                <td style="text-align:right">${f.real ? fmtAUD(f.real) : '—'}</td>
                <td style="text-align:right" class="${cls}">${f.real ? signo + fmtAUD(f.diff) : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Gráfico Presupuesto vs Real por categoría
  if (chartPresup) chartPresup.destroy();
  const canvas = container.querySelector<HTMLCanvasElement>('#chartPresup');
  if (canvas && filas.length > 0) {
    chartPresup = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: filas.map(f => f.label),
        datasets: [
          { label: 'Presupuesto', data: filas.map(f => f.pres), backgroundColor: '#2E75B6' },
          { label: 'Real', data: filas.map(f => f.real), backgroundColor: '#00C896' },
        ],
      },
      options: {
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
      },
    });
  }

  // Animate progress bar
  requestAnimationFrame(() => {
    const bar = container.querySelector<HTMLElement>('.progress-bar-fill');
    if (bar) setTimeout(() => { bar.style.width = `${Math.min(progreso * 100, 100)}%`; }, 100);
  });
}
