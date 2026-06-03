'use client';

import { useAppState } from '@/lib/state';
import { BUDGET_CATEGORIES, MONTHS } from '@/lib/defaultConfig';
import { calcIngreso } from '@/lib/calculations';
import { fmtAUD } from '@/lib/format';

export default function Presupuesto() {
  const { state, update } = useAppState();
  const { presupuesto } = state;
  const ingreso = calcIngreso(state.config);
  const totalBudget = BUDGET_CATEGORIES.reduce((a, c) => a + c.budget, 0);

  function setVal(mes: string, cat: string, val: number) {
    update(d => {
      if (!d.presupuesto[mes]) d.presupuesto[mes] = {};
      d.presupuesto[mes][cat] = val;
    });
  }

  return (
    <>
      <div className="section-header"><h2>💰 Presupuesto Mensual</h2></div>
      <div className="table-wrapper">
        <table className="budget-table">
          <thead>
            <tr>
              <th className="sticky-col">Categoría</th>
              <th>Budget</th>
              {MONTHS.map(m => <th key={m}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {BUDGET_CATEGORIES.map(cat => (
              <tr key={cat.id}>
                <td className="sticky-col cat-label">{cat.label}</td>
                <td className="budget-col">{fmtAUD(cat.budget)}</td>
                {MONTHS.map(mes => {
                  const val = presupuesto?.[mes]?.[cat.id] ?? cat.budget;
                  const diff = val - cat.budget;
                  const diffClass = diff > 0 ? 'over' : diff < 0 ? 'under' : '';
                  return (
                    <td key={mes}>
                      <div className="cell-wrap">
                        <input type="number" className="budget-input" value={val} min={0} step={1}
                          onChange={e => setVal(mes, cat.id, parseFloat(e.target.value) || 0)} />
                        <span className={`cell-diff ${diffClass}`}>{diff !== 0 ? (diff > 0 ? '+' : '') + Math.round(diff) : ''}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td className="sticky-col"><strong>TOTAL</strong></td>
              <td className="budget-col"><strong>{fmtAUD(totalBudget)}</strong></td>
              {MONTHS.map(mes => {
                let total = 0;
                BUDGET_CATEGORIES.forEach(c => { total += presupuesto?.[mes]?.[c.id] ?? c.budget; });
                return (
                  <td key={mes} className={`total-cell ${total > ingreso ? 'over' : 'under'}`}><strong>{fmtAUD(total)}</strong></td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
