'use client';

import '@/lib/chartSetup';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useAppState } from '@/lib/state';
import { projectCapital, projectCapitalReal, calcFiNumber } from '@/lib/calculations';
import { fmtAUD, fmtPct } from '@/lib/format';
import type { Config } from '@/lib/types';

export default function Proyeccion() {
  const { state } = useAppState();
  const { config } = state;
  const fiNumber = calcFiNumber(config);

  const [calc, setCalc] = useState<Config>({ ...config });
  const fiCalc = calcFiNumber(calc);
  const nominal = projectCapital(calc);
  const real = projectCapitalReal(calc);
  const labels = nominal.map(p => `Año ${p.year}`);
  const crossover = nominal.findIndex(p => p.capital >= fiCalc);

  const set = (k: keyof Config, v: number) => setCalc(c => ({ ...c, [k]: v }));

  return (
    <>
      <div className="section-header"><h2>🚀 Proyección Libertad Financiera</h2></div>

      <div className="card">
        <div style={{ maxHeight: 380 }}>
          <Line
            data={{
              labels,
              datasets: [
                { label: 'Capital proyectado', data: nominal.map(p => p.capital), borderColor: '#00C896', backgroundColor: 'rgba(0,200,150,0.08)', fill: true, tension: 0.3, pointRadius: 4 },
                { label: 'Capital real (ajustado inflación)', data: real.map(p => p.capital), borderColor: '#2E75B6', borderDash: [6, 4], tension: 0.3, pointRadius: 3 },
                { label: `FI Number (${fmtAUD(fiCalc)})`, data: nominal.map(() => fiCalc), borderColor: '#E53E3E', borderDash: [4, 4], pointRadius: 0, fill: false },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: {
                legend: { labels: { color: '#94A3B8' } },
                tooltip: {
                  callbacks: {
                    label: ctx => {
                      const val = ctx.parsed.y ?? 0;
                      if (ctx.dataset.label?.startsWith('FI')) return `${ctx.dataset.label}: ${fmtAUD(val)}`;
                      const pct = (val / fiCalc * 100).toFixed(1);
                      const pasivo = (val * 0.04 / 12).toFixed(0);
                      return [`${ctx.dataset.label}: ${fmtAUD(val)}`, `Progreso FI: ${pct}%`, `Ingreso pasivo/mes: A$${pasivo}`];
                    },
                  },
                },
              },
              scales: {
                x: { ticks: { color: '#94A3B8' }, grid: { color: '#2D3748' } },
                y: { ticks: { color: '#94A3B8', callback: v => `A$${(Number(v) / 1000).toFixed(0)}K` }, grid: { color: '#2D3748' } },
              },
            }}
          />
        </div>
      </div>

      <div className="fi-cards">
        <div className="fi-info-card"><div className="fi-icon">💰</div><div className="fi-title">FI Number</div><div className="fi-val">{fmtAUD(fiNumber)}</div><div className="fi-desc">Gastos anuales ÷ 4% SWR</div></div>
        <div className="fi-info-card"><div className="fi-icon">📈</div><div className="fi-title">CAGR Personal</div><div className="fi-val">{fmtPct(config.cagr)}</div><div className="fi-desc">Real: {fmtPct((1 + config.cagr) / (1 + config.inflacion) - 1)}</div></div>
        <div className="fi-info-card"><div className="fi-icon">⚡</div><div className="fi-title">Inyección Asimétrica</div><div className="fi-val">{fmtAUD(config.aporte_boom)}/mes</div><div className="fi-desc">Años 1-{config.anos_boom} BOOM → {fmtAUD(config.aporte_cruise)}/mes CRUISE</div></div>
        <div className="fi-info-card"><div className="fi-icon">🔮</div><div className="fi-title">Horizonte</div><div className="fi-val">{config.horizonte} años</div><div className="fi-desc">Capital proyectado: {fmtAUD(projectCapital(config).at(-1)?.capital ?? 0)}</div></div>
      </div>

      <div className="card calculator-card">
        <h3>🧮 Calculadora Interactiva</h3>
        <div className="calc-sliders">
          <div className="slider-group">
            <label>Capital inicial: <span>{fmtAUD(calc.capital_inicial)}</span></label>
            <input type="range" min={0} max={200000} step={1000} value={calc.capital_inicial} onChange={e => set('capital_inicial', Number(e.target.value))} />
          </div>
          <div className="slider-group">
            <label>Aporte mensual BOOM: <span>{fmtAUD(calc.aporte_boom)}</span></label>
            <input type="range" min={500} max={5000} step={100} value={calc.aporte_boom} onChange={e => set('aporte_boom', Number(e.target.value))} />
          </div>
          <div className="slider-group">
            <label>Tasa retorno: <span>{fmtPct(calc.cagr)}</span></label>
            <input type="range" min={0.04} max={0.18} step={0.005} value={calc.cagr} onChange={e => set('cagr', Number(e.target.value))} />
          </div>
          <div className="slider-group">
            <label>Años: <span>{calc.horizonte}</span></label>
            <input type="range" min={5} max={35} step={1} value={calc.horizonte} onChange={e => set('horizonte', Number(e.target.value))} />
          </div>
        </div>
        <div className="calc-result">
          <span>{crossover >= 0
            ? `🎉 Libertad Financiera en ${crossover} años — capital: ${fmtAUD(nominal[crossover].capital)}`
            : `⏳ Con estos parámetros, no se alcanza en ${calc.horizonte} años (${fmtAUD(nominal.at(-1)?.capital ?? 0)} proyectado)`}</span>
        </div>
      </div>
    </>
  );
}
