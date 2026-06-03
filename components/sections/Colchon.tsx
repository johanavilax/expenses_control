'use client';

import '@/lib/chartSetup';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useAppState } from '@/lib/state';
import { calcColchonProjection, calcMesesParaColchon } from '@/lib/calculations';
import { fmtAUD } from '@/lib/format';

const MESES = 36;
const CUENTAS = [
  { id: 'ing', label: 'ING Maximiser', tasa: 0.055, color: '#00C896', condicion: '5 compras + A$1K dep.' },
  { id: 'amp', label: 'AMP GO Save', tasa: 0.051, color: '#F0B429', condicion: 'Sin condición' },
  { id: 'cba', label: 'CommBank GoalSaver', tasa: 0.050, color: '#2E75B6', condicion: 'Crecer saldo' },
];

function interesGanado(meta: number, aporte: number, tasa: number): number {
  const m = calcMesesParaColchon(meta, aporte, tasa);
  if (!Number.isFinite(m)) return 0;
  const months = Math.ceil(m);
  const rate = tasa / 12;
  let bal = 0, totalAporte = 0;
  for (let i = 0; i < months; i++) { bal = bal * (1 + rate) + aporte; totalAporte += aporte; }
  return bal - totalAporte;
}

export default function Colchon() {
  const { state } = useAppState();
  const { config } = state;
  const meta = config.colchon_meta_meses * config.gastos_mensuales;
  const [aporte, setAporte] = useState(config.colchon_aporte);

  const labels = Array.from({ length: MESES + 1 }, (_, i) => `Mes ${i}`);
  const datasets = [
    ...CUENTAS.map(c => ({ label: c.label, data: calcColchonProjection(meta, aporte, c.tasa, MESES), borderColor: c.color, tension: 0.2, pointRadius: 0 })),
    { label: `Meta ${fmtAUD(meta)}`, data: labels.map(() => meta), borderColor: '#E53E3E', borderDash: [5, 3], pointRadius: 0 },
  ];

  return (
    <>
      <div className="section-header"><h2>🛡️ Colchón de Emergencia</h2></div>

      <div className="colchon-meta-bar card">
        <div className="colchon-meta-header">
          <span>Meta: <strong>{fmtAUD(meta)}</strong> ({config.colchon_meta_meses} meses × {fmtAUD(config.gastos_mensuales)})</span>
          <span>Aporte actual: <strong>{fmtAUD(aporte)}/mes</strong></span>
        </div>
      </div>

      <div className="card">
        <div style={{ maxHeight: 320 }}>
          <Line data={{ labels, datasets }} options={{
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#94A3B8' } },
              tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtAUD(ctx.parsed.y ?? 0)}` } },
            },
            scales: {
              x: { ticks: { color: '#94A3B8', maxTicksLimit: 12 }, grid: { color: '#2D3748' } },
              y: { ticks: { color: '#94A3B8', callback: v => fmtAUD(Number(v)) }, grid: { color: '#2D3748' } },
            },
          }} />
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Comparativa de cuentas</h3>
        <div className="slider-group" style={{ marginBottom: '1rem' }}>
          <label>Aporte mensual: <span>{fmtAUD(aporte)}</span></label>
          <input type="range" min={300} max={1500} step={50} value={aporte} onChange={e => setAporte(Number(e.target.value))} />
        </div>
        <table className="data-table">
          <thead><tr><th>Cuenta</th><th>Tasa</th><th>Condición</th><th>Meses para meta</th><th>Interés ganado</th></tr></thead>
          <tbody>
            {CUENTAS.map(c => {
              const m = calcMesesParaColchon(meta, aporte, c.tasa);
              return (
                <tr key={c.id}>
                  <td><span style={{ color: c.color }}>●</span> {c.label}</td>
                  <td>{(c.tasa * 100).toFixed(2)}%</td>
                  <td>{c.condicion}</td>
                  <td>{Number.isFinite(m) ? `~${Math.ceil(m)} meses` : '∞'}</td>
                  <td>{fmtAUD(Math.max(0, interesGanado(meta, aporte, c.tasa)))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card colchon-timeline" style={{ marginTop: '1.5rem' }}>
        <h3>📅 Estrategia recomendada</h3>
        <div className="timeline">
          <div className="timeline-item active"><div className="tl-dot green" /><div className="tl-content"><strong>Mes 1-4</strong>: Pagar deuda Colombia (COP$900K/mes) + A$500 colchón</div></div>
          <div className="timeline-item"><div className="tl-dot green" /><div className="tl-content"><strong>Mes 5-30</strong>: Colchón completo en ING 5.50% (A$500-800/mes)</div></div>
          <div className="timeline-item"><div className="tl-dot blue" /><div className="tl-content"><strong>Mes 31+</strong>: Colchón → CommBank Term Deposit 5.20% (bloqueado, rinde más)</div></div>
        </div>
      </div>
    </>
  );
}
