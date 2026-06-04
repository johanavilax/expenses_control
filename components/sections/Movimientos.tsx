'use client';

import { useRef, useState } from 'react';
import { useAppState } from '@/lib/state';
import { BUDGET_CATEGORIES, MONTHS } from '@/lib/defaultConfig';
import { mesDesdeFecha } from '@/lib/meses';
import { parseCsv } from '@/lib/csv';
import { classifyMovimientos } from '@/lib/api';
import type { Movimiento, Persona } from '@/lib/types';

const GROUPS = [...new Set(BUDGET_CATEGORIES.map(c => c.group))];
const PERSONAS: { value: Persona; label: string }[] = [
  { value: 'conjunto', label: '👥 Conjunto' },
  { value: 'tu', label: '🧑 Tú' },
  { value: 'pareja', label: '🧑‍🤝‍🧑 Pareja' },
];

const TIPOS: { value: Movimiento['tipo']; label: string }[] = [
  { value: 'gasto', label: '🛒 Gasto' },
  { value: 'sueldo', label: '💼 Sueldo' },
  { value: 'inversion', label: '📈 Inversión' },
  { value: 'esporadica', label: '🎁 Ganancia esporádica' },
];

function CategoryOptions() {
  return (
    <>
      <option value="">— sin clasificar —</option>
      {GROUPS.map(g => (
        <optgroup key={g} label={g}>
          {BUDGET_CATEGORIES.filter(c => c.group === g).map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export default function Movimientos() {
  const { state, update } = useAppState();
  const mes = state.currentMonth || MONTHS[0];
  const delMes = state.movimientos.filter(m => m.mes === mes);
  const sinClasificar = delMes.filter(m => m.tipo === 'gasto' && !m.categoria).length;

  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState<Movimiento['tipo']>('gasto');
  const [fecha, setFecha] = useState('');
  const [desc, setDesc] = useState('');
  const [monto, setMonto] = useState('');
  const [cat, setCat] = useState('');
  const [persona, setPersona] = useState<Persona>('conjunto');
  const fileRef = useRef<HTMLInputElement>(null);

  function setMonth(m: string) { update(d => { d.currentMonth = m; }); }

  function addManual() {
    const m = parseFloat(monto) || 0;
    if (!desc.trim() || m <= 0) { setMsg('❌ Pon descripción y monto > 0.'); return; }
    const f = fecha || new Date().toISOString().slice(0, 10);
    update(d => {
      d.movimientos.push({
        id: crypto.randomUUID(), fecha: f, descripcion: desc.trim(), monto: m,
        tipo, categoria: tipo === 'gasto' ? cat : '', mes: mesDesdeFecha(f), persona, origen: 'manual',
      });
      d.currentMonth = mesDesdeFecha(f);
    });
    setDesc(''); setMonto(''); setCat('');
  }

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const rows = parseCsv(String(ev.target?.result ?? ''));
        if (rows.length === 0) { setMsg('❌ No se detectaron movimientos en el CSV.'); return; }
        let n = 0;
        update(d => {
          const seen = new Set(d.movimientos.map(m => `${m.fecha}|${m.descripcion}|${m.monto}|${m.tipo}`));
          rows.forEach(r => {
            // Solo importamos gastos (débitos). Los ingresos se registran explícitamente.
            if (r.monto >= 0) return;
            const mt = Math.abs(r.monto);
            const key = `${r.fecha}|${r.descripcion}|${mt}|gasto`;
            if (mt <= 0 || seen.has(key)) return;
            seen.add(key);
            d.movimientos.push({
              id: crypto.randomUUID(), fecha: r.fecha, descripcion: r.descripcion, monto: mt,
              tipo: 'gasto', categoria: '', mes: mesDesdeFecha(r.fecha), persona: 'conjunto', origen: 'csv',
            });
            n++;
          });
        });
        setMsg(`✅ CSV importado: ${n} gastos nuevos. Los ingresos agrégalos a mano. Pulsa "Clasificar con IA".`);
      } catch (err) {
        setMsg(`❌ Error leyendo CSV: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function classify() {
    const gastos = delMes.filter(m => m.tipo === 'gasto');
    const pendientes = gastos.filter(m => !m.categoria);
    const objetivo = pendientes.length > 0 ? pendientes : gastos;
    if (objetivo.length === 0) { setMsg('No hay gastos para clasificar en este mes.'); return; }
    setMsg('🤖 Clasificando con IA…');
    try {
      const map = await classifyMovimientos(objetivo);
      let n = 0;
      update(d => {
        d.movimientos.forEach(m => { if (map[m.id]) { m.categoria = map[m.id]; n++; } });
      });
      setMsg(`✅ IA clasificó ${n} de ${objetivo.length}. Revisa y ajusta lo que quieras.`);
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const editField = (id: string, fn: (m: Movimiento) => void) =>
    update(d => { const m = d.movimientos.find(x => x.id === id); if (m) fn(m); });

  return (
    <>
      <div className="section-header">
        <h2>🧾 Movimientos</h2>
        <div className="month-selector">
          {MONTHS.map(m => (
            <button key={m} className={`month-btn ${m === mes ? 'active' : ''}`} onClick={() => setMonth(m)}>{m}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="config-actions" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => void classify()}>
            🤖 Clasificar con IA{sinClasificar ? ` (${sinClasificar} sin clasificar)` : ''}
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>📄 Subir CSV</button>
          <button className="btn-secondary" onClick={() => setShowForm(s => !s)}>➕ Añadir manual</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onCsv} />
        </div>

        {showForm && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end', marginBottom: '1rem' }}>
            <div className="config-field"><label>Tipo</label>
              <select className="config-input" value={tipo} onChange={e => setTipo(e.target.value as Movimiento['tipo'])}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="config-field"><label>Fecha</label>
              <input type="date" className="config-input" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
            <div className="config-field" style={{ flex: 2 }}><label>Descripción</label>
              <input type="text" className="config-input" value={desc} placeholder="Ej: Woolworths / Dividendos VAS" onChange={e => setDesc(e.target.value)} /></div>
            <div className="config-field"><label>Monto (A$)</label>
              <input type="number" className="config-input" min={0} step={0.01} value={monto} onChange={e => setMonto(e.target.value)} /></div>
            {tipo === 'gasto' && (
              <div className="config-field"><label>Categoría</label>
                <select className="config-input" value={cat} onChange={e => setCat(e.target.value)}><CategoryOptions /></select></div>
            )}
            <div className="config-field"><label>Persona</label>
              <select className="config-input" value={persona} onChange={e => setPersona(e.target.value as Persona)}>
                {PERSONAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select></div>
            <button className="btn-primary" onClick={addManual}>Guardar</button>
          </div>
        )}

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Monto</th><th>Categoría / Tipo</th><th>Persona</th><th>Mes</th><th></th></tr></thead>
            <tbody>
              {delMes.length === 0 ? (
                <tr><td colSpan={7} style={{ opacity: 0.6 }}>Sin movimientos en {mes}. Importa de 🏦 Banco, sube un CSV o añade manual.</td></tr>
              ) : delMes.map(m => {
                const esIng = m.tipo !== 'gasto';
                return (
                  <tr key={m.id} className={!esIng && !m.categoria ? 'highlight-row' : ''}>
                    <td><input type="date" className="inline-input" value={m.fecha?.slice(0, 10) ?? ''}
                      onChange={e => editField(m.id, x => { x.fecha = e.target.value; x.mes = mesDesdeFecha(e.target.value); })} /></td>
                    <td><input type="text" className="inline-input" value={m.descripcion} style={{ minWidth: 160 }}
                      onChange={e => editField(m.id, x => { x.descripcion = e.target.value; })} /></td>
                    <td><input type="number" className={`inline-input ${esIng ? 'green' : ''}`} value={m.monto} min={0} step={0.01}
                      style={{ width: 90, textAlign: 'right' }}
                      onChange={e => editField(m.id, x => { x.monto = parseFloat(e.target.value) || 0; })} /></td>
                    <td>{esIng ? (
                      <select className="inline-input" value={m.tipo} onChange={e => editField(m.id, x => { x.tipo = e.target.value as Movimiento['tipo']; })}>
                        {TIPOS.filter(t => t.value !== 'gasto').map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    ) : (
                      <select className="inline-input" value={m.categoria} onChange={e => editField(m.id, x => { x.categoria = e.target.value; })}>
                        <CategoryOptions />
                      </select>
                    )}</td>
                    <td>
                      <select className="inline-input" value={m.persona} onChange={e => editField(m.id, x => { x.persona = e.target.value as Persona; })}>
                        {PERSONAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="inline-input" value={m.mes} onChange={e => editField(m.id, x => { x.mes = e.target.value; })}>
                        {MONTHS.map(mm => <option key={mm} value={mm}>{mm}</option>)}
                      </select>
                    </td>
                    <td><button className="btn-danger" title="Eliminar" onClick={() => update(d => { d.movimientos = d.movimientos.filter(x => x.id !== m.id); })}>🗑️</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '0.75rem', opacity: 0.85 }}>{msg}</p>
      </div>
    </>
  );
}
