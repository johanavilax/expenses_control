import type { AppState, Config } from '../types';

export function renderConfiguracion(
  state: AppState,
  container: HTMLElement,
  onUpdate: () => void,
  onReset: () => void,
): void {
  const { config } = state;

  const field = (key: keyof Config, label: string, min: number, max: number, step: number = 1, pct = false): string => `
    <div class="config-field">
      <label>${label}</label>
      <input type="number" class="config-input" data-key="${key}"
        value="${pct ? (config[key] * 100).toFixed(1) : config[key]}"
        min="${min}" max="${max}" step="${step}">
      ${pct ? '<span class="config-unit">%</span>' : ''}
    </div>
  `;

  container.innerHTML = `
    <div class="section-header">
      <h2>⚙️ Configuración</h2>
    </div>

    <div class="config-sections">
      <div class="card">
        <h3>💵 Ingresos</h3>
        ${field('ingreso_tu', 'Tu sueldo (A$)', 0, 20000)}
        ${field('ingreso_pareja', 'Sueldo pareja (A$)', 0, 20000)}
        ${field('ingreso_intereses', 'Intereses mensuales (A$)', 0, 1000)}
      </div>

      <div class="card">
        <h3>🚀 Modelo LF</h3>
        ${field('capital_inicial', 'Capital inicial (A$)', 0, 500000, 500)}
        ${field('aporte_boom', 'Aporte BOOM/mes (A$)', 0, 10000, 100)}
        ${field('aporte_cruise', 'Aporte CRUISE/mes (A$)', 0, 10000, 100)}
        ${field('cagr', 'CAGR anual', 1, 30, 0.5, true)}
        ${field('inflacion', 'Inflación anual', 0, 15, 0.1, true)}
        ${field('swr', 'SWR (tasa retiro seguro)', 1, 10, 0.1, true)}
        ${field('anos_boom', 'Años fase BOOM', 1, 10)}
        ${field('horizonte', 'Horizonte (años)', 5, 40)}
        ${field('gastos_mensuales', 'Gastos mensuales (A$)', 1000, 20000, 50)}
      </div>

      <div class="card">
        <h3>🇨🇴 Colombia</h3>
        ${field('cop_deuda', 'Deuda total (COP$)', 0, 50000000, 100000)}
        ${field('cop_ingreso', 'Ingreso mensual (COP$)', 0, 20000000, 100000)}
        ${field('cop_cuota', 'Cuota mensual (COP$)', 0, 5000000, 50000)}
        ${field('cop_tasa', 'Tasa E.A.', 5, 60, 1, true)}
        ${field('tipo_cambio', 'Tipo de cambio COP/AUD', 1000, 10000, 10)}
      </div>

      <div class="card">
        <h3>🛡️ Colchón</h3>
        ${field('colchon_meta_meses', 'Meta en meses de gastos', 3, 12)}
        ${field('colchon_aporte', 'Aporte mensual (A$)', 100, 2000, 50)}
      </div>
    </div>

    <div class="config-actions">
      <button id="btn-recalcular" class="btn-primary">🔄 Recalcular todo</button>
      <button id="btn-export" class="btn-secondary">📤 Exportar JSON</button>
      <button id="btn-import" class="btn-secondary">📥 Importar JSON</button>
      <button id="btn-reset" class="btn-danger">🔁 Resetear valores base</button>
    </div>
    <input type="file" id="import-file" accept=".json" style="display:none">
  `;

  // Live update inputs
  container.querySelectorAll<HTMLInputElement>('.config-input').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.key as keyof Config | undefined;
      if (!key) return;
      const isPct = input.nextElementSibling?.textContent === '%';
      state.config[key] = isPct ? parseFloat(input.value) / 100 : parseFloat(input.value);
      onUpdate();
    });
  });

  document.getElementById('btn-recalcular')?.addEventListener('click', onUpdate);

  document.getElementById('btn-export')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'lf_config.json'; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });

  document.getElementById('import-file')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(String(ev.target?.result)) as Partial<AppState>;
        if (imported.config) Object.assign(state.config, imported.config);
        if (imported.presupuesto) Object.assign(state.presupuesto, imported.presupuesto);
        onUpdate();
        alert('✅ Configuración importada');
      } catch { alert('❌ Error al importar'); }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('¿Resetear todos los valores al modelo base?')) onReset();
  });
}
