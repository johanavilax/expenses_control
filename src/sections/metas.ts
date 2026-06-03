import Chart from 'chart.js/auto';
import { BUDGET_CATEGORIES, GROUP_COLORS, KPI_LIMITS, MONTHS } from '../data/defaultConfig';
import { calcIngreso, calcGrupoPorMes, calcKPIs } from '../utils/calculations';
import { fmtPct } from '../utils/format';
import type { AppState } from '../types';

let chartIdeal: Chart | null = null;
let chartReal: Chart | null = null;
let chartBars: Chart | null = null;

export function renderMetas(state: AppState, container: HTMLElement): void {
  const { config, presupuesto } = state;
  const mes = state.currentMonth || 'May-26';
  const ingreso = calcIngreso(config);
  const kpis = calcKPIs(config, presupuesto, mes);

  // Build group totals for ideal
  const groupLabels = Object.keys(GROUP_COLORS);
  const idealTotals: Record<string, number> = {};
  groupLabels.forEach(g => { idealTotals[g] = 0; });
  BUDGET_CATEGORIES.forEach(c => { idealTotals[c.group] = (idealTotals[c.group] || 0) + c.budget; });

  const realTotals = calcGrupoPorMes(presupuesto, mes);
  const realGroupTotals: Record<string, number> = {};
  groupLabels.forEach(g => { realGroupTotals[g] = 0; });
  BUDGET_CATEGORIES.forEach(c => { realGroupTotals[c.group] = (realGroupTotals[c.group] || 0) + (realTotals[c.id] || 0); });

  container.innerHTML = `
    <div class="section-header">
      <h2>🎯 Metas & Semáforos</h2>
      <div class="month-selector">
        ${MONTHS.map(m => `<button class="month-btn ${m === mes ? 'active' : ''}" data-mes="${m}">${m}</button>`).join('')}
      </div>
    </div>

    <div class="donuts-row">
      <div class="card donut-card">
        <h3>Budget Ideal</h3>
        <canvas id="chartIdeal"></canvas>
      </div>
      <div class="card donut-card">
        <h3>Real — ${mes}</h3>
        <canvas id="chartReal"></canvas>
      </div>
    </div>

    <div class="card" style="margin-top:1.5rem">
      <h3>Tracker temporal — % por categoría</h3>
      <canvas id="chartBars" style="max-height:320px"></canvas>
    </div>

    <div class="semaforos-detail">
      <h3>Panel de Semáforos</h3>
      <div class="semaforos-detail-grid">
        ${kpis.map(k => `
          <div class="sem-detail-card" data-kpi="${k.id}">
            <div class="sem-header">
              <span class="sem-name">${k.label}</span>
              <span class="semaforo-dot ${k.status} ${k.status === 'red' ? 'pulse-fast' : k.status === 'yellow' ? 'pulse-slow' : ''}"></span>
            </div>
            <div class="sem-nums">
              <div><span class="sem-num-val">${fmtPct(k.real_pct)}</span><span class="sem-num-label"> real</span></div>
              <div><span class="sem-num-val">${fmtPct(k.meta)}</span><span class="sem-num-label"> meta</span></div>
              <div class="${k.real_pct > k.meta ? (k.tipo === 'ahorro' ? 'under' : 'over') : 'under-ok'}">
                <span class="sem-num-val">${fmtPct(Math.abs(k.real_pct - k.meta))}</span><span class="sem-num-label"> dif</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Donut charts
  if (chartIdeal) chartIdeal.destroy();
  if (chartReal) chartReal.destroy();

  const donutOptions = {
    plugins: { legend: { position: 'right' as const, labels: { color: '#94A3B8', boxWidth: 12, font: { size: 11 } } } },
    animation: { duration: 800 },
  };

  chartIdeal = new Chart(container.querySelector<HTMLCanvasElement>('#chartIdeal')!, {
    type: 'doughnut',
    data: {
      labels: groupLabels.map(g => g.charAt(0).toUpperCase() + g.slice(1)),
      datasets: [{ data: groupLabels.map(g => idealTotals[g] || 0), backgroundColor: groupLabels.map(g => GROUP_COLORS[g]) }],
    },
    options: donutOptions,
  });

  chartReal = new Chart(container.querySelector<HTMLCanvasElement>('#chartReal')!, {
    type: 'doughnut',
    data: {
      labels: groupLabels.map(g => g.charAt(0).toUpperCase() + g.slice(1)),
      datasets: [{ data: groupLabels.map(g => realGroupTotals[g] || 0), backgroundColor: groupLabels.map(g => GROUP_COLORS[g]) }],
    },
    options: donutOptions,
  });

  // Bars chart
  if (chartBars) chartBars.destroy();
  const barDatasets = KPI_LIMITS.slice(0, 6).map(kpi => ({
    label: kpi.label,
    data: MONTHS.map(m => {
      const g = calcGrupoPorMes(presupuesto, m);
      const sum = kpi.grupos.reduce((acc, gr) => acc + (g[gr] || 0), 0);
      return +(sum / ingreso * 100).toFixed(1);
    }),
    backgroundColor: GROUP_COLORS[kpi.grupos[0]] || '#2E75B6',
  }));

  chartBars = new Chart(container.querySelector<HTMLCanvasElement>('#chartBars')!, {
    type: 'bar',
    data: { labels: MONTHS, datasets: barDatasets },
    options: {
      plugins: { legend: { labels: { color: '#94A3B8' } } },
      scales: {
        x: { ticks: { color: '#94A3B8' }, grid: { color: '#2D3748' } },
        y: { ticks: { color: '#94A3B8', callback: (v: string | number) => v + '%' }, grid: { color: '#2D3748' } },
      },
      animation: { duration: 600 },
    },
  });

  // Month buttons
  container.querySelectorAll<HTMLButtonElement>('.month-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMonth = btn.dataset.mes;
      renderMetas(state, container);
    });
  });
}
