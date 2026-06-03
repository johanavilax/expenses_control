import { calcIngreso, calcTotalGasto, calcFiNumber, calcKPIs } from '../utils/calculations';
import { fmtAUD, fmtPct } from '../utils/format';
import type { AppState } from '../types';

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
  `;

  // Animate progress bar
  requestAnimationFrame(() => {
    const bar = container.querySelector<HTMLElement>('.progress-bar-fill');
    if (bar) setTimeout(() => { bar.style.width = `${Math.min(progreso * 100, 100)}%`; }, 100);
  });
}
