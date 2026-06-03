import Chart from 'chart.js/auto';
import { calcCopAmortizacion } from '../utils/calculations';
import { fmtCOP, fmtAUD } from '../utils/format';
import type { AppState } from '../types';

let chartAmort: Chart | null = null;

export function renderColombia(state: AppState, container: HTMLElement): void {
  const { config } = state;
  const { cop_deuda, cop_ingreso, cop_cuota, cop_tasa, tipo_cambio } = config;

  const amort = calcCopAmortizacion(cop_deuda, cop_cuota, cop_tasa);
  const totalInteres = amort.reduce((a, r) => a + r.interes, 0);
  const mesesDeuda = amort.length;
  const saldoFinal = amort.at(-1)?.saldo ?? 0;
  const progresoPct = Math.max(0, Math.min(1, 1 - saldoFinal / cop_deuda));

  const aporteAUD = cop_ingreso / tipo_cambio;
  const aporteAUDpostDeuda = cop_ingreso / tipo_cambio;

  container.innerHTML = `
    <div class="section-header">
      <h2>🇨🇴 Colombia COP</h2>
    </div>

    <div class="col-2">
      <!-- Columna deuda -->
      <div class="card">
        <h3>🔴 Deuda</h3>
        <div class="progress-bar-wrap" style="margin:1rem 0">
          <div class="progress-bar-fill" style="width:${progresoPct * 100}%" ></div>
        </div>
        <div class="data-rows">
          <div class="data-row"><span>Saldo actual</span><strong class="red">${fmtCOP(cop_deuda)}</strong></div>
          <div class="data-row"><span>Cuota mensual</span><strong>${fmtCOP(cop_cuota)}</strong></div>
          <div class="data-row"><span>Tasa E.A.</span><strong>${(cop_tasa * 100).toFixed(0)}%</strong></div>
          <div class="data-row"><span>Meses para liquidar</span><strong>${mesesDeuda} meses</strong></div>
          <div class="data-row"><span>Total intereses</span><strong class="red">${fmtCOP(totalInteres)}</strong></div>
        </div>

        <h4 style="margin-top:1.5rem">Amortización</h4>
        <canvas id="chartAmort" style="max-height:240px"></canvas>
      </div>

      <!-- Columna ahorro -->
      <div class="card">
        <h3>🟢 Ahorro post-deuda</h3>
        <table class="data-table">
          <thead>
            <tr><th>Entidad</th><th>Producto</th><th>Tasa E.A.</th><th>Liquidez</th></tr>
          </thead>
          <tbody>
            <tr><td>Koa/Santander</td><td>CDT Digital 12m</td><td>13.3%</td><td>❌</td></tr>
            <tr><td>Banco W</td><td>CDT Digital</td><td>13.2%</td><td>❌</td></tr>
            <tr><td>Pibank</td><td>Cuenta digital</td><td>~11%</td><td>✅</td></tr>
            <tr class="highlight-row"><td><strong>Nu Colombia ⭐</strong></td><td>Cajitas</td><td><strong>11.25%</strong></td><td>✅</td></tr>
            <tr><td>Lulo Bank</td><td>Bolsillos</td><td>11.5%</td><td>✅</td></tr>
            <tr><td>Ban100</td><td>Cuenta 100pre</td><td>10%</td><td>✅</td></tr>
          </tbody>
        </table>

        <h4 style="margin-top:1.5rem">📊 Equivalencia COP → AUD</h4>
        <div class="data-rows">
          <div class="data-row">
            <span>Tipo de cambio</span>
            <input type="number" id="tipo-cambio-input" class="inline-input" value="${tipo_cambio}" min="1000" step="10">
          </div>
          <div class="data-row"><span>Fase deuda (45% ahorro)</span><strong>${fmtAUD(aporteAUD * 0.45)}/mes</strong></div>
          <div class="data-row"><span>Fase post-deuda (100%)</span><strong class="green">${fmtAUD(aporteAUDpostDeuda)}/mes</strong></div>
          <div class="data-row"><span>Aporte anual al portafolio</span><strong class="green">${fmtAUD(aporteAUDpostDeuda * 12)}</strong></div>
        </div>

        <h4 style="margin-top:1.5rem">📅 Timeline</h4>
        <div class="timeline">
          <div class="timeline-item"><div class="tl-dot red"></div><div class="tl-content"><strong>Fase 1 (meses 1-4)</strong>: Pagar deuda COP$3M</div></div>
          <div class="timeline-item"><div class="tl-dot green"></div><div class="tl-content"><strong>Fase 2 (mes 5+)</strong>: CDT Koa 13.3% (70%) + Nu Cajita (30%)</div></div>
          <div class="timeline-item"><div class="tl-dot blue"></div><div class="tl-content"><strong>Objetivo anual</strong>: COP$18M ≈ ${fmtAUD(18000000 / tipo_cambio)} extras</div></div>
        </div>
      </div>
    </div>
  `;

  // Amortization chart
  if (chartAmort) chartAmort.destroy();
  chartAmort = new Chart(container.querySelector<HTMLCanvasElement>('#chartAmort')!, {
    type: 'bar',
    data: {
      labels: amort.map(r => `M${r.mes}`),
      datasets: [
        { label: 'Capital', data: amort.map(r => r.capital), backgroundColor: '#00C896', stack: 'a' },
        { label: 'Interés', data: amort.map(r => r.interes), backgroundColor: '#E53E3E', stack: 'a' },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: '#94A3B8' } } },
      scales: {
        x: { stacked: true, ticks: { color: '#94A3B8', maxTicksLimit: 6 }, grid: { color: '#2D3748' } },
        y: { stacked: true, ticks: { color: '#94A3B8', callback: (v: string | number) => fmtCOP(Number(v)) }, grid: { color: '#2D3748' } },
      },
    },
  });

  const tcInput = document.getElementById('tipo-cambio-input') as HTMLInputElement | null;
  if (tcInput) {
    tcInput.addEventListener('change', () => {
      state.config.tipo_cambio = parseFloat(tcInput.value) || config.tipo_cambio;
      renderColombia(state, container);
    });
  }
}
