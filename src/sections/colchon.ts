import Chart from 'chart.js/auto';
import type { TooltipItem } from 'chart.js';
import { calcColchonProjection, calcMesesParaColchon } from '../utils/calculations';
import { fmtAUD } from '../utils/format';
import type { AppState } from '../types';

let chartColchon: Chart | null = null;

interface Cuenta {
  id: string;
  label: string;
  tasa: number;
  color: string;
  condicion: string;
}

interface CuentaProyectada extends Cuenta {
  meses: number;
  data: number[];
}

const CUENTAS: Cuenta[] = [
  { id: 'ing', label: 'ING Maximiser', tasa: 0.055, color: '#00C896', condicion: '5 compras + A$1K dep.' },
  { id: 'amp', label: 'AMP GO Save', tasa: 0.051, color: '#F0B429', condicion: 'Sin condición' },
  { id: 'cba', label: 'CommBank GoalSaver', tasa: 0.050, color: '#2E75B6', condicion: 'Crecer saldo' },
];

export function renderColchon(state: AppState, container: HTMLElement): void {
  const { config } = state;
  const meta = config.colchon_meta_meses * config.gastos_mensuales;
  const aporte = config.colchon_aporte;
  const MESES = 36;

  const mesesData: CuentaProyectada[] = CUENTAS.map(c => ({
    ...c,
    meses: calcMesesParaColchon(meta, aporte, c.tasa),
    data: calcColchonProjection(meta, aporte, c.tasa, MESES),
  }));

  container.innerHTML = `
    <div class="section-header">
      <h2>🛡️ Colchón de Emergencia</h2>
    </div>

    <div class="colchon-meta-bar card">
      <div class="colchon-meta-header">
        <span>Meta: <strong>${fmtAUD(meta)}</strong> (${config.colchon_meta_meses} meses × ${fmtAUD(config.gastos_mensuales)})</span>
        <span>Aporte actual: <strong>${fmtAUD(aporte)}/mes</strong></span>
      </div>
    </div>

    <div class="card">
      <canvas id="chartColchon" style="max-height:320px"></canvas>
    </div>

    <div class="card" style="margin-top:1.5rem">
      <h3>Comparativa de cuentas</h3>
      <div class="slider-group" style="margin-bottom:1rem">
        <label>Aporte mensual: <span id="colchon-aporte-val">${fmtAUD(aporte)}</span></label>
        <input type="range" id="colchon-aporte-slider" min="300" max="1500" step="50" value="${aporte}">
      </div>
      <table class="data-table" id="colchon-table">
        <thead>
          <tr>
            <th>Cuenta</th><th>Tasa</th><th>Condición</th><th>Meses para meta</th><th>Interés ganado</th>
          </tr>
        </thead>
        <tbody>
          ${mesesData.map(c => `
            <tr>
              <td><span style="color:${c.color}">●</span> ${c.label}</td>
              <td>${(c.tasa * 100).toFixed(2)}%</td>
              <td>${c.condicion}</td>
              <td class="cuenta-meses" data-id="${c.id}">${isFinite(c.meses) ? `~${Math.ceil(c.meses)} meses` : '∞'}</td>
              <td>${fmtAUD(Math.max(0, calcInteresGanado(meta, aporte, c.tasa)))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="card colchon-timeline" style="margin-top:1.5rem">
      <h3>📅 Estrategia recomendada</h3>
      <div class="timeline">
        <div class="timeline-item active">
          <div class="tl-dot green"></div>
          <div class="tl-content">
            <strong>Mes 1-4</strong>: Pagar deuda Colombia (COP$900K/mes) + A$500 colchón
          </div>
        </div>
        <div class="timeline-item">
          <div class="tl-dot green"></div>
          <div class="tl-content">
            <strong>Mes 5-30</strong>: Colchón completo en ING 5.50% (A$500-800/mes)
          </div>
        </div>
        <div class="timeline-item">
          <div class="tl-dot blue"></div>
          <div class="tl-content">
            <strong>Mes 31+</strong>: Colchón → CommBank Term Deposit 5.20% (bloqueado, rinde más)
          </div>
        </div>
      </div>
    </div>
  `;

  drawColchonChart(meta, MESES, mesesData);

  const slider = document.getElementById('colchon-aporte-slider') as HTMLInputElement | null;
  if (slider) {
    slider.addEventListener('input', () => {
      const newAporte = parseFloat(slider.value);
      const valEl = document.getElementById('colchon-aporte-val');
      if (valEl) valEl.textContent = fmtAUD(newAporte);
      const newData: CuentaProyectada[] = CUENTAS.map(c => ({
        ...c,
        meses: calcMesesParaColchon(meta, newAporte, c.tasa),
        data: calcColchonProjection(meta, newAporte, c.tasa, MESES),
      }));
      drawColchonChart(meta, MESES, newData);
      CUENTAS.forEach(c => {
        const el = container.querySelector<HTMLElement>(`[data-id="${c.id}"]`);
        const m = calcMesesParaColchon(meta, newAporte, c.tasa);
        if (el) el.textContent = isFinite(m) ? `~${Math.ceil(m)} meses` : '∞';
      });
    });
  }
}

function calcInteresGanado(meta: number, aporte: number, tasa: number): number {
  const m = calcMesesParaColchon(meta, aporte, tasa);
  if (!isFinite(m)) return 0;
  const months = Math.ceil(m);
  const rate = tasa / 12;
  let bal = 0;
  let totalAporte = 0;
  for (let i = 0; i < months; i++) {
    bal = bal * (1 + rate) + aporte;
    totalAporte += aporte;
  }
  return bal - totalAporte;
}

function drawColchonChart(meta: number, meses: number, data: CuentaProyectada[]): void {
  if (chartColchon) chartColchon.destroy();
  const labels = Array.from({ length: meses + 1 }, (_, i) => `Mes ${i}`);
  chartColchon = new Chart(document.getElementById('chartColchon') as HTMLCanvasElement, {
    type: 'line',
    data: {
      labels,
      datasets: [
        ...data.map(c => ({
          label: c.label,
          data: c.data,
          borderColor: c.color,
          tension: 0.2,
          pointRadius: 0,
        })),
        {
          label: `Meta ${fmtAUD(meta)}`,
          data: labels.map(() => meta),
          borderColor: '#E53E3E',
          borderDash: [5, 3],
          pointRadius: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: '#94A3B8' } },
        tooltip: { callbacks: { label: (ctx: TooltipItem<'line'>) => `${ctx.dataset.label}: ${fmtAUD(ctx.parsed.y ?? 0)}` } },
      },
      scales: {
        x: { ticks: { color: '#94A3B8', maxTicksLimit: 12 }, grid: { color: '#2D3748' } },
        y: { ticks: { color: '#94A3B8', callback: (v: string | number) => fmtAUD(Number(v)) }, grid: { color: '#2D3748' } },
      },
    },
  });
}
