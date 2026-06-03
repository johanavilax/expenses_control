'use client';

import '@/lib/chartSetup';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAppState } from '@/lib/state';
import { BUDGET_CATEGORIES, GROUP_COLORS, KPI_LIMITS, MONTHS } from '@/lib/defaultConfig';
import { calcIngreso, calcGrupoPorMes, calcKPIs } from '@/lib/calculations';
import { fmtPct } from '@/lib/format';

export default function Metas() {
  const { state, update } = useAppState();
  const { presupuesto } = state;
  const mes = state.currentMonth || 'May-26';
  const ingreso = calcIngreso(state.config);
  const kpis = calcKPIs(state.config, presupuesto, mes);

  const groupLabels = Object.keys(GROUP_COLORS);
  const idealTotals: Record<string, number> = {};
  groupLabels.forEach(g => { idealTotals[g] = 0; });
  BUDGET_CATEGORIES.forEach(c => { idealTotals[c.group] = (idealTotals[c.group] || 0) + c.budget; });

  const realTotals = calcGrupoPorMes(presupuesto, mes);
  const realGroupTotals: Record<string, number> = {};
  groupLabels.forEach(g => { realGroupTotals[g] = 0; });
  BUDGET_CATEGORIES.forEach(c => { realGroupTotals[c.group] = (realGroupTotals[c.group] || 0) + (realTotals[c.id] || 0); });

  const donutLabels = groupLabels.map(g => g.charAt(0).toUpperCase() + g.slice(1));
  const colors = groupLabels.map(g => GROUP_COLORS[g]);
  const donutOptions = {
    plugins: { legend: { position: 'right' as const, labels: { color: '#94A3B8', boxWidth: 12, font: { size: 11 } } } },
  };

  const barDatasets = KPI_LIMITS.slice(0, 6).map(kpi => ({
    label: kpi.label,
    data: MONTHS.map(m => {
      const g = calcGrupoPorMes(presupuesto, m);
      const sum = kpi.grupos.reduce((acc, gr) => acc + (g[gr] || 0), 0);
      return +(sum / ingreso * 100).toFixed(1);
    }),
    backgroundColor: GROUP_COLORS[kpi.grupos[0]] || '#2E75B6',
  }));

  return (
    <>
      <div className="section-header">
        <h2>🎯 Metas & Semáforos</h2>
        <div className="month-selector">
          {MONTHS.map(m => (
            <button key={m} className={`month-btn ${m === mes ? 'active' : ''}`} onClick={() => update(d => { d.currentMonth = m; })}>{m}</button>
          ))}
        </div>
      </div>

      <div className="donuts-row">
        <div className="card donut-card">
          <h3>Budget Ideal</h3>
          <Doughnut data={{ labels: donutLabels, datasets: [{ data: groupLabels.map(g => idealTotals[g] || 0), backgroundColor: colors }] }} options={donutOptions} />
        </div>
        <div className="card donut-card">
          <h3>Real — {mes}</h3>
          <Doughnut data={{ labels: donutLabels, datasets: [{ data: groupLabels.map(g => realGroupTotals[g] || 0), backgroundColor: colors }] }} options={donutOptions} />
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Tracker temporal — % por categoría</h3>
        <div style={{ maxHeight: 320 }}>
          <Bar
            data={{ labels: MONTHS, datasets: barDatasets }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { labels: { color: '#94A3B8' } } },
              scales: {
                x: { ticks: { color: '#94A3B8' }, grid: { color: '#2D3748' } },
                y: { ticks: { color: '#94A3B8', callback: v => v + '%' }, grid: { color: '#2D3748' } },
              },
            }}
          />
        </div>
      </div>

      <div className="semaforos-detail">
        <h3>Panel de Semáforos</h3>
        <div className="semaforos-detail-grid">
          {kpis.map(k => (
            <div className="sem-detail-card" key={k.id}>
              <div className="sem-header">
                <span className="sem-name">{k.label}</span>
                <span className={`semaforo-dot ${k.status} ${k.status === 'red' ? 'pulse-fast' : k.status === 'yellow' ? 'pulse-slow' : ''}`} />
              </div>
              <div className="sem-nums">
                <div><span className="sem-num-val">{fmtPct(k.real_pct)}</span><span className="sem-num-label"> real</span></div>
                <div><span className="sem-num-val">{fmtPct(k.meta)}</span><span className="sem-num-label"> meta</span></div>
                <div className={k.real_pct > k.meta ? (k.tipo === 'ahorro' ? 'under' : 'over') : 'under-ok'}>
                  <span className="sem-num-val">{fmtPct(Math.abs(k.real_pct - k.meta))}</span><span className="sem-num-label"> dif</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
