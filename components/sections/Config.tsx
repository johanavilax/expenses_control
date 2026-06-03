'use client';

import { useRef } from 'react';
import { useAppState, emptyState } from '@/lib/state';
import type { AppState, Config as Cfg } from '@/lib/types';

interface Field { key: keyof Cfg; label: string; min: number; max: number; step?: number; pct?: boolean }

const SECTIONS: { title: string; fields: Field[] }[] = [
  { title: '💵 Ingresos', fields: [
    { key: 'ingreso_tu', label: 'Tu sueldo (A$)', min: 0, max: 20000 },
    { key: 'ingreso_pareja', label: 'Sueldo pareja (A$)', min: 0, max: 20000 },
    { key: 'ingreso_intereses', label: 'Intereses mensuales (A$)', min: 0, max: 1000 },
  ]},
  { title: '🚀 Modelo LF', fields: [
    { key: 'capital_inicial', label: 'Capital inicial (A$)', min: 0, max: 500000, step: 500 },
    { key: 'aporte_boom', label: 'Aporte BOOM/mes (A$)', min: 0, max: 10000, step: 100 },
    { key: 'aporte_cruise', label: 'Aporte CRUISE/mes (A$)', min: 0, max: 10000, step: 100 },
    { key: 'cagr', label: 'CAGR anual', min: 1, max: 30, step: 0.5, pct: true },
    { key: 'inflacion', label: 'Inflación anual', min: 0, max: 15, step: 0.1, pct: true },
    { key: 'swr', label: 'SWR (tasa retiro seguro)', min: 1, max: 10, step: 0.1, pct: true },
    { key: 'anos_boom', label: 'Años fase BOOM', min: 1, max: 10 },
    { key: 'horizonte', label: 'Horizonte (años)', min: 5, max: 40 },
    { key: 'gastos_mensuales', label: 'Gastos mensuales (A$)', min: 1000, max: 20000, step: 50 },
  ]},
  { title: '🇨🇴 Colombia', fields: [
    { key: 'cop_deuda', label: 'Deuda total (COP$)', min: 0, max: 50000000, step: 100000 },
    { key: 'cop_ingreso', label: 'Ingreso mensual (COP$)', min: 0, max: 20000000, step: 100000 },
    { key: 'cop_cuota', label: 'Cuota mensual (COP$)', min: 0, max: 5000000, step: 50000 },
    { key: 'cop_tasa', label: 'Tasa E.A.', min: 5, max: 60, step: 1, pct: true },
    { key: 'tipo_cambio', label: 'Tipo de cambio COP/AUD', min: 1000, max: 10000, step: 10 },
  ]},
  { title: '🛡️ Colchón', fields: [
    { key: 'colchon_meta_meses', label: 'Meta en meses de gastos', min: 3, max: 12 },
    { key: 'colchon_aporte', label: 'Aporte mensual (A$)', min: 100, max: 2000, step: 50 },
  ]},
];

export default function Config() {
  const { state, update } = useAppState();
  const { config } = state;
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'lf_config.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(String(ev.target?.result)) as Partial<AppState>;
        update(d => {
          if (imported.config) Object.assign(d.config, imported.config);
          if (imported.presupuesto) Object.assign(d.presupuesto, imported.presupuesto);
          if (imported.movimientos) d.movimientos = imported.movimientos;
        });
        alert('✅ Configuración importada');
      } catch { alert('❌ Error al importar'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function reset() {
    if (!confirm('¿Resetear todos los valores al modelo base? (no borra tus movimientos)')) return;
    update(d => { const e = emptyState(); d.config = e.config; d.presupuesto = e.presupuesto; });
  }

  return (
    <>
      <div className="section-header"><h2>⚙️ Configuración</h2></div>
      <div className="config-sections">
        {SECTIONS.map(sec => (
          <div className="card" key={sec.title}>
            <h3>{sec.title}</h3>
            {sec.fields.map(f => (
              <div className="config-field" key={f.key}>
                <label>{f.label}</label>
                <input type="number" className="config-input"
                  value={f.pct ? +(config[f.key] * 100).toFixed(1) : config[f.key]}
                  min={f.min} max={f.max} step={f.step ?? 1}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    update(d => { d.config[f.key] = f.pct ? v / 100 : v; });
                  }} />
                {f.pct && <span className="config-unit">%</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="config-actions">
        <button className="btn-secondary" onClick={exportJson}>📤 Exportar JSON</button>
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>📥 Importar JSON</button>
        <button className="btn-danger" onClick={reset}>🔁 Resetear valores base</button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importJson} />
      </div>
    </>
  );
}
