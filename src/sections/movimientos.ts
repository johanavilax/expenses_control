import { BUDGET_CATEGORIES, MONTHS } from '../data/defaultConfig';
import { classifyMovimientos } from '../utils/classify';
import { isSupabaseConfigured } from '../utils/supabase';
import { fmtAUD } from '../utils/format';
import type { AppState, Movimiento } from '../types';

const MES_CORTO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convierte una fecha ISO a la etiqueta de mes usada por la app, p.ej. "May-26". */
export function mesDesdeFecha(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return MONTHS[0];
  return `${MES_CORTO[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

function catLabel(id: string): string {
  return BUDGET_CATEGORIES.find(c => c.id === id)?.label ?? '— sin clasificar —';
}

/** <select> agrupado por grupo de presupuesto. */
function categorySelect(selected: string, cls: string, dataId: string): string {
  const groups = [...new Set(BUDGET_CATEGORIES.map(c => c.group))];
  const opts = groups.map(g => {
    const inner = BUDGET_CATEGORIES.filter(c => c.group === g)
      .map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${c.label}</option>`)
      .join('');
    return `<optgroup label="${g}">${inner}</optgroup>`;
  }).join('');
  return `<select class="${cls}" data-id="${dataId}">
    <option value="" ${selected === '' ? 'selected' : ''}>— sin clasificar —</option>
    ${opts}
  </select>`;
}

function monthSelect(selected: string, cls: string, dataId: string): string {
  return `<select class="${cls}" data-id="${dataId}">
    ${MONTHS.map(m => `<option value="${m}" ${m === selected ? 'selected' : ''}>${m}</option>`).join('')}
  </select>`;
}

export function renderMovimientos(state: AppState, container: HTMLElement, onUpdate: () => void): void {
  const mes = state.currentMonth || MONTHS[0];
  const delMes = state.movimientos.filter(m => m.mes === mes);
  const sinClasificar = delMes.filter(m => !m.categoria).length;

  container.innerHTML = `
    <div class="section-header">
      <h2>🧾 Movimientos</h2>
      <div class="month-selector">
        ${MONTHS.map(m => `<button class="month-btn ${m === mes ? 'active' : ''}" data-mes="${m}">${m}</button>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="config-actions" style="margin-bottom:1rem;flex-wrap:wrap">
        <button id="btn-classify" class="btn-primary" ${isSupabaseConfigured() ? '' : 'disabled title="Requiere Supabase"'}>
          🤖 Clasificar con IA${sinClasificar ? ` (${sinClasificar} sin clasificar)` : ''}
        </button>
        <button id="btn-add" class="btn-secondary">➕ Añadir manual</button>
      </div>

      <div class="add-form" id="add-form" style="display:none;gap:0.5rem;flex-wrap:wrap;align-items:end;margin-bottom:1rem">
        <div class="config-field"><label>Fecha</label><input type="date" id="m-fecha" class="config-input"></div>
        <div class="config-field" style="flex:2"><label>Descripción</label><input type="text" id="m-desc" class="config-input" placeholder="Ej: Woolworths"></div>
        <div class="config-field"><label>Monto (A$)</label><input type="number" id="m-monto" class="config-input" min="0" step="0.01"></div>
        <div class="config-field"><label>Categoría</label>${categorySelect('', 'config-input', 'new')}</div>
        <button id="btn-add-save" class="btn-primary">Guardar</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Descripción</th><th style="text-align:right">Monto</th><th>Categoría</th><th>Mes</th><th></th></tr></thead>
          <tbody id="mov-body">
            ${delMes.length === 0
              ? `<tr><td colspan="6" style="opacity:0.6">Sin movimientos en ${mes}. Importa desde 🏦 Banco o añade manual.</td></tr>`
              : delMes.map(m => `
                <tr ${m.categoria ? '' : 'class="highlight-row"'}>
                  <td>${m.fecha?.slice(0, 10) ?? ''}</td>
                  <td>${m.descripcion}</td>
                  <td style="text-align:right">${fmtAUD(m.monto)}</td>
                  <td>${categorySelect(m.categoria, 'cat-select', m.id)}</td>
                  <td>${monthSelect(m.mes, 'mes-select', m.id)}</td>
                  <td><button class="btn-danger btn-del" data-id="${m.id}" title="Eliminar">🗑️</button></td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p id="mov-msg" style="margin-top:0.75rem;opacity:0.85"></p>
    </div>
  `;

  const msgEl = container.querySelector<HTMLElement>('#mov-msg');
  const setMsg = (t: string): void => { if (msgEl) msgEl.textContent = t; };

  // Cambiar mes activo
  container.querySelectorAll<HTMLButtonElement>('.month-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMonth = btn.dataset.mes;
      renderMovimientos(state, container, onUpdate);
    });
  });

  // Cambiar categoría (mover/recategorizar)
  container.querySelectorAll<HTMLSelectElement>('.cat-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const mov = state.movimientos.find(m => m.id === sel.dataset.id);
      if (mov) { mov.categoria = sel.value; onUpdate(); setMsg(`✅ "${mov.descripcion}" → ${catLabel(sel.value)}`); }
    });
  });

  // Mover de mes
  container.querySelectorAll<HTMLSelectElement>('.mes-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const mov = state.movimientos.find(m => m.id === sel.dataset.id);
      if (mov) { mov.mes = sel.value; onUpdate(); renderMovimientos(state, container, onUpdate); }
    });
  });

  // Eliminar
  container.querySelectorAll<HTMLButtonElement>('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.movimientos = state.movimientos.filter(m => m.id !== btn.dataset.id);
      onUpdate();
      renderMovimientos(state, container, onUpdate);
    });
  });

  // Formulario manual
  const form = container.querySelector<HTMLElement>('#add-form');
  container.querySelector<HTMLButtonElement>('#btn-add')?.addEventListener('click', () => {
    if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  });
  container.querySelector<HTMLButtonElement>('#btn-add-save')?.addEventListener('click', () => {
    const fecha = container.querySelector<HTMLInputElement>('#m-fecha')?.value || new Date().toISOString().slice(0, 10);
    const descripcion = container.querySelector<HTMLInputElement>('#m-desc')?.value.trim() || '';
    const monto = parseFloat(container.querySelector<HTMLInputElement>('#m-monto')?.value || '0') || 0;
    const categoria = container.querySelector<HTMLSelectElement>('.cat-select[data-id="new"]')?.value || '';
    if (!descripcion || monto <= 0) { setMsg('❌ Pon descripción y monto > 0.'); return; }
    const nuevo: Movimiento = {
      id: crypto.randomUUID(),
      fecha,
      descripcion,
      monto,
      categoria,
      mes: mesDesdeFecha(fecha),
      origen: 'manual',
    };
    state.movimientos.push(nuevo);
    state.currentMonth = nuevo.mes;
    onUpdate();
    renderMovimientos(state, container, onUpdate);
  });

  // Clasificar con IA
  container.querySelector<HTMLButtonElement>('#btn-classify')?.addEventListener('click', async () => {
    const pendientes = delMes.filter(m => !m.categoria);
    const objetivo = pendientes.length > 0 ? pendientes : delMes;
    if (objetivo.length === 0) { setMsg('No hay movimientos para clasificar en este mes.'); return; }
    setMsg('🤖 Clasificando con IA…');
    try {
      const map = await classifyMovimientos(objetivo);
      let n = 0;
      objetivo.forEach(m => { if (map[m.id]) { m.categoria = map[m.id]; n++; } });
      onUpdate();
      renderMovimientos(state, container, onUpdate);
      setMsg(`✅ IA clasificó ${n} de ${objetivo.length}. Revisa y ajusta lo que quieras.`);
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}
