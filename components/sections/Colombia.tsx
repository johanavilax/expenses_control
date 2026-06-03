'use client';

import '@/lib/chartSetup';
import { Bar } from 'react-chartjs-2';
import { useAppState } from '@/lib/state';
import { calcCopAmortizacion } from '@/lib/calculations';
import { fmtCOP, fmtAUD } from '@/lib/format';

export default function Colombia() {
  const { state, update } = useAppState();
  const { cop_deuda, cop_ingreso, cop_cuota, cop_tasa, tipo_cambio } = state.config;

  const amort = calcCopAmortizacion(cop_deuda, cop_cuota, cop_tasa);
  const totalInteres = amort.reduce((a, r) => a + r.interes, 0);
  const saldoFinal = amort.at(-1)?.saldo ?? 0;
  const progresoPct = Math.max(0, Math.min(1, 1 - saldoFinal / cop_deuda));
  const aporteAUD = cop_ingreso / tipo_cambio;

  return (
    <>
      <div className="section-header"><h2>🇨🇴 Colombia COP</h2></div>
      <div className="col-2">
        <div className="card">
          <h3>🔴 Deuda</h3>
          <div className="progress-bar-wrap" style={{ margin: '1rem 0' }}>
            <div className="progress-bar-fill" style={{ width: `${progresoPct * 100}%` }} />
          </div>
          <div className="data-rows">
            <div className="data-row"><span>Saldo actual</span><strong className="red">{fmtCOP(cop_deuda)}</strong></div>
            <div className="data-row"><span>Cuota mensual</span><strong>{fmtCOP(cop_cuota)}</strong></div>
            <div className="data-row"><span>Tasa E.A.</span><strong>{(cop_tasa * 100).toFixed(0)}%</strong></div>
            <div className="data-row"><span>Meses para liquidar</span><strong>{amort.length} meses</strong></div>
            <div className="data-row"><span>Total intereses</span><strong className="red">{fmtCOP(totalInteres)}</strong></div>
          </div>
          <h4 style={{ marginTop: '1.5rem' }}>Amortización</h4>
          <div style={{ maxHeight: 240 }}>
            <Bar
              data={{
                labels: amort.map(r => `M${r.mes}`),
                datasets: [
                  { label: 'Capital', data: amort.map(r => r.capital), backgroundColor: '#00C896', stack: 'a' },
                  { label: 'Interés', data: amort.map(r => r.interes), backgroundColor: '#E53E3E', stack: 'a' },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94A3B8' } } },
                scales: {
                  x: { stacked: true, ticks: { color: '#94A3B8', maxTicksLimit: 6 }, grid: { color: '#2D3748' } },
                  y: { stacked: true, ticks: { color: '#94A3B8', callback: v => fmtCOP(Number(v)) }, grid: { color: '#2D3748' } },
                },
              }}
            />
          </div>
        </div>

        <div className="card">
          <h3>🟢 Ahorro post-deuda</h3>
          <table className="data-table">
            <thead><tr><th>Entidad</th><th>Producto</th><th>Tasa E.A.</th><th>Liquidez</th></tr></thead>
            <tbody>
              <tr><td>Koa/Santander</td><td>CDT Digital 12m</td><td>13.3%</td><td>❌</td></tr>
              <tr><td>Banco W</td><td>CDT Digital</td><td>13.2%</td><td>❌</td></tr>
              <tr><td>Pibank</td><td>Cuenta digital</td><td>~11%</td><td>✅</td></tr>
              <tr className="highlight-row"><td><strong>Nu Colombia ⭐</strong></td><td>Cajitas</td><td><strong>11.25%</strong></td><td>✅</td></tr>
              <tr><td>Lulo Bank</td><td>Bolsillos</td><td>11.5%</td><td>✅</td></tr>
              <tr><td>Ban100</td><td>Cuenta 100pre</td><td>10%</td><td>✅</td></tr>
            </tbody>
          </table>

          <h4 style={{ marginTop: '1.5rem' }}>📊 Equivalencia COP → AUD</h4>
          <div className="data-rows">
            <div className="data-row">
              <span>Tipo de cambio</span>
              <input type="number" className="inline-input" value={tipo_cambio} min={1000} step={10}
                onChange={e => update(d => { d.config.tipo_cambio = parseFloat(e.target.value) || tipo_cambio; })} />
            </div>
            <div className="data-row"><span>Fase deuda (45% ahorro)</span><strong>{fmtAUD(aporteAUD * 0.45)}/mes</strong></div>
            <div className="data-row"><span>Fase post-deuda (100%)</span><strong className="green">{fmtAUD(aporteAUD)}/mes</strong></div>
            <div className="data-row"><span>Aporte anual al portafolio</span><strong className="green">{fmtAUD(aporteAUD * 12)}</strong></div>
          </div>

          <h4 style={{ marginTop: '1.5rem' }}>📅 Timeline</h4>
          <div className="timeline">
            <div className="timeline-item"><div className="tl-dot red" /><div className="tl-content"><strong>Fase 1 (meses 1-4)</strong>: Pagar deuda COP$3M</div></div>
            <div className="timeline-item"><div className="tl-dot green" /><div className="tl-content"><strong>Fase 2 (mes 5+)</strong>: CDT Koa 13.3% (70%) + Nu Cajita (30%)</div></div>
            <div className="timeline-item"><div className="tl-dot blue" /><div className="tl-content"><strong>Objetivo anual</strong>: COP$18M ≈ {fmtAUD(18000000 / tipo_cambio)} extras</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
