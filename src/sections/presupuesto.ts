import { BUDGET_CATEGORIES, MONTHS } from '../data/defaultConfig';
import { calcIngreso } from '../utils/calculations';
import { fmtAUD } from '../utils/format';
import type { AppState } from '../types';

export function renderPresupuesto(state: AppState, container: HTMLElement, onUpdate: () => void): void {
  const { config, presupuesto } = state;
  const ingreso = calcIngreso(config);

  container.innerHTML = `
    <div class="section-header">
      <h2>💰 Presupuesto Mensual</h2>
    </div>
    <div class="table-wrapper">
      <table class="budget-table">
        <thead>
          <tr>
            <th class="sticky-col">Categoría</th>
            <th>Budget</th>
            ${MONTHS.map(m => `<th>${m}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${BUDGET_CATEGORIES.map(cat => {
            const budget = cat.budget;
            return `<tr data-cat="${cat.id}">
              <td class="sticky-col cat-label">${cat.label}</td>
              <td class="budget-col">${fmtAUD(budget)}</td>
              ${MONTHS.map(mes => {
                const val = presupuesto?.[mes]?.[cat.id] ?? budget;
                const diff = val - budget;
                const diffClass = diff > 0 ? 'over' : diff < 0 ? 'under' : '';
                return `<td>
                  <div class="cell-wrap">
                    <input type="number" class="budget-input" data-mes="${mes}" data-cat="${cat.id}" value="${val}" min="0" step="1">
                    <span class="cell-diff ${diffClass}">${diff !== 0 ? (diff > 0 ? '+' : '') + Math.round(diff) : ''}</span>
                  </div>
                </td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td class="sticky-col"><strong>TOTAL</strong></td>
            <td class="budget-col"><strong>${fmtAUD(BUDGET_CATEGORIES.reduce((a, c) => a + c.budget, 0))}</strong></td>
            ${MONTHS.map(mes => {
              let total = 0;
              BUDGET_CATEGORIES.forEach(c => { total += presupuesto?.[mes]?.[c.id] ?? c.budget; });
              const diff = total - ingreso;
              return `<td class="total-cell ${diff > 0 ? 'over' : 'under'}" data-total-mes="${mes}"><strong>${fmtAUD(total)}</strong></td>`;
            }).join('')}
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  container.querySelectorAll<HTMLInputElement>('.budget-input').forEach(input => {
    input.addEventListener('change', () => {
      const mes = input.dataset.mes;
      const cat = input.dataset.cat;
      if (!mes || !cat) return;
      const val = parseFloat(input.value) || 0;
      if (!state.presupuesto[mes]) state.presupuesto[mes] = {};
      state.presupuesto[mes][cat] = val;
      onUpdate();
      // Update diff
      const budgetCat = BUDGET_CATEGORIES.find(c => c.id === cat);
      const diff = val - (budgetCat?.budget || 0);
      const diffEl = input.parentElement?.querySelector<HTMLElement>('.cell-diff');
      if (diffEl) {
        diffEl.textContent = diff !== 0 ? (diff > 0 ? '+' : '') + Math.round(diff) : '';
        diffEl.className = `cell-diff ${diff > 0 ? 'over' : diff < 0 ? 'under' : ''}`;
      }
      // Update total
      let total = 0;
      BUDGET_CATEGORIES.forEach(c => { total += state.presupuesto?.[mes]?.[c.id] ?? c.budget; });
      const totalEl = container.querySelector<HTMLElement>(`[data-total-mes="${mes}"]`);
      if (totalEl) {
        totalEl.innerHTML = `<strong>${fmtAUD(total)}</strong>`;
        totalEl.className = `total-cell ${total > ingreso ? 'over' : 'under'}`;
      }
    });
  });
}
