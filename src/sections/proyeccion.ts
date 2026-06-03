import Chart from 'chart.js/auto';
import type { TooltipItem } from 'chart.js';
import { projectCapital, projectCapitalReal, calcFiNumber } from '../utils/calculations';
import { fmtAUD, fmtPct } from '../utils/format';
import type { AppState, Config } from '../types';

let chartFI: Chart | null = null;

export function renderProyeccion(state: AppState, container: HTMLElement): void {
  const { config } = state;
  const fiNumber = calcFiNumber(config);

  container.innerHTML = `
    <div class="section-header">
      <h2>🚀 Proyección Libertad Financiera</h2>
    </div>

    <div class="card">
      <canvas id="chartFI" style="max-height:380px"></canvas>
    </div>

    <div class="fi-cards">
      <div class="fi-info-card">
        <div class="fi-icon">💰</div>
        <div class="fi-title">FI Number</div>
        <div class="fi-val">${fmtAUD(fiNumber)}</div>
        <div class="fi-desc">Gastos anuales ÷ 4% SWR</div>
      </div>
      <div class="fi-info-card">
        <div class="fi-icon">📈</div>
        <div class="fi-title">CAGR Personal</div>
        <div class="fi-val">${fmtPct(config.cagr)}</div>
        <div class="fi-desc">Real: ${fmtPct((1 + config.cagr)/(1 + config.inflacion) - 1)}</div>
      </div>
      <div class="fi-info-card">
        <div class="fi-icon">⚡</div>
        <div class="fi-title">Inyección Asimétrica</div>
        <div class="fi-val">${fmtAUD(config.aporte_boom)}/mes</div>
        <div class="fi-desc">Años 1-${config.anos_boom} BOOM → ${fmtAUD(config.aporte_cruise)}/mes CRUISE</div>
      </div>
      <div class="fi-info-card">
        <div class="fi-icon">🔮</div>
        <div class="fi-title">Horizonte</div>
        <div class="fi-val">${config.horizonte} años</div>
        <div class="fi-desc">Capital proyectado: ${fmtAUD(projectCapital(config).at(-1)?.capital ?? 0)}</div>
      </div>
    </div>

    <div class="card calculator-card">
      <h3>🧮 Calculadora Interactiva</h3>
      <div class="calc-sliders">
        <div class="slider-group">
          <label>Capital inicial: <span id="calc-capital-val">${fmtAUD(config.capital_inicial)}</span></label>
          <input type="range" id="calc-capital" min="0" max="200000" step="1000" value="${config.capital_inicial}">
        </div>
        <div class="slider-group">
          <label>Aporte mensual BOOM: <span id="calc-aporte-val">${fmtAUD(config.aporte_boom)}</span></label>
          <input type="range" id="calc-aporte" min="500" max="5000" step="100" value="${config.aporte_boom}">
        </div>
        <div class="slider-group">
          <label>Tasa retorno: <span id="calc-cagr-val">${fmtPct(config.cagr)}</span></label>
          <input type="range" id="calc-cagr" min="0.04" max="0.18" step="0.005" value="${config.cagr}">
        </div>
        <div class="slider-group">
          <label>Años: <span id="calc-anos-val">${config.horizonte}</span></label>
          <input type="range" id="calc-anos" min="5" max="35" step="1" value="${config.horizonte}">
        </div>
      </div>
      <div class="calc-result">
        <span id="calc-years-msg"></span>
      </div>
    </div>
  `;

  drawChart(config, fiNumber, container);
  setupCalculator(config, container);
}

function drawChart(config: Config, fiNumber: number, container: HTMLElement): void {
  const nominal = projectCapital(config);
  const real = projectCapitalReal(config);
  const labels = nominal.map(p => `Año ${p.year}`);

  if (chartFI) chartFI.destroy();
  chartFI = new Chart(container.querySelector<HTMLCanvasElement>('#chartFI')!, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Capital proyectado',
          data: nominal.map(p => p.capital),
          borderColor: '#00C896',
          backgroundColor: 'rgba(0,200,150,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        },
        {
          label: 'Capital real (ajustado inflación)',
          data: real.map(p => p.capital),
          borderColor: '#2E75B6',
          borderDash: [6, 4],
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: `FI Number (${fmtAUD(fiNumber)})`,
          data: nominal.map(() => fiNumber),
          borderColor: '#E53E3E',
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: '#94A3B8' } },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'line'>) => {
              const val = ctx.parsed.y ?? 0;
              if (ctx.dataset.label?.startsWith('FI')) return `${ctx.dataset.label}: ${fmtAUD(val)}`;
              const pct = (val / fiNumber * 100).toFixed(1);
              const pasivo = (val * 0.04 / 12).toFixed(0);
              return [`${ctx.dataset.label}: ${fmtAUD(val)}`, `Progreso FI: ${pct}%`, `Ingreso pasivo/mes: A$${pasivo}`];
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: '#94A3B8' }, grid: { color: '#2D3748' } },
        y: {
          ticks: { color: '#94A3B8', callback: (v: string | number) => `A$${(Number(v)/1000).toFixed(0)}K` },
          grid: { color: '#2D3748' },
        },
      },
    },
  });
}

interface SliderDef {
  id: string;
  key: keyof Config;
  valId: string;
  fmt: (v: number) => string;
}

function setupCalculator(baseConfig: Config, container: HTMLElement): void {
  const calcConfig: Config = { ...baseConfig };

  function update(): void {
    const nominal = projectCapital(calcConfig);
    const fi = calcFiNumber(calcConfig);
    const crossover = nominal.findIndex(p => p.capital >= fi);
    const msg = document.getElementById('calc-years-msg');
    if (msg) {
      msg.textContent = crossover >= 0
        ? `🎉 Libertad Financiera en ${crossover} años — capital: ${fmtAUD(nominal[crossover].capital)}`
        : `⏳ Con estos parámetros, no se alcanza en ${calcConfig.horizonte} años (${fmtAUD(nominal.at(-1)?.capital ?? 0)} proyectado)`;
    }
    drawChart(calcConfig, fi, container);
  }

  const sliders: SliderDef[] = [
    { id: 'calc-capital', key: 'capital_inicial', valId: 'calc-capital-val', fmt: fmtAUD },
    { id: 'calc-aporte', key: 'aporte_boom', valId: 'calc-aporte-val', fmt: fmtAUD },
    { id: 'calc-cagr', key: 'cagr', valId: 'calc-cagr-val', fmt: fmtPct },
    { id: 'calc-anos', key: 'horizonte', valId: 'calc-anos-val', fmt: (v: number) => `${Math.round(v)}` },
  ];

  sliders.forEach(({ id, key, valId, fmt }) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.addEventListener('input', () => {
      calcConfig[key] = parseFloat(el.value);
      const valEl = document.getElementById(valId);
      if (valEl) valEl.textContent = fmt(calcConfig[key]);
      update();
    });
  });

  update();
}
