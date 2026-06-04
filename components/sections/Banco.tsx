'use client';

import { useState } from 'react';
import { useAppState } from '@/lib/state';
import { connectBank, fetchTransactions, type BasiqTransaction } from '@/lib/api';
import { mesDesdeFecha } from '@/lib/meses';
import { fmtAUD } from '@/lib/format';

function esGasto(t: BasiqTransaction): boolean {
  return t.direction === 'debit' || (parseFloat(t.amount) || 0) < 0;
}

export default function Banco() {
  const { state, update, userEmail } = useAppState();
  const connected = !!state.basiqUserId;
  const [email, setEmail] = useState(userEmail);
  const [txs, setTxs] = useState<BasiqTransaction[]>([]);
  const [msg, setMsg] = useState('');

  async function connect() {
    if (!email.trim()) { setMsg('❌ Escribe un email válido primero.'); return; }
    setMsg('⏳ Generando enlace de consentimiento…');
    try {
      const { userId, url } = await connectBank(state.basiqUserId ?? null, email.trim());
      update(d => { d.basiqUserId = userId; });
      window.open(url, '_blank', 'noopener');
      setMsg('✅ Se abrió el flujo de Basiq en otra pestaña. Conecta CommBank y luego "Traer movimientos".');
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function fetchTx() {
    if (!state.basiqUserId) return;
    setMsg('⏳ Trayendo movimientos…');
    try {
      const data = await fetchTransactions(state.basiqUserId);
      setTxs(data);
      setMsg(`✅ ${data.length} movimientos cargados (${data.filter(esGasto).length} gastos importables).`);
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function importMov() {
    let n = 0;
    update(d => {
      const existentes = new Set(d.movimientos.map(m => m.id));
      txs.filter(esGasto).forEach(t => {
        if (existentes.has(t.id)) return;
        const fecha = (t.postDate ?? '').slice(0, 10);
        d.movimientos.push({
          id: t.id, fecha, descripcion: t.description ?? '(sin descripción)',
          monto: Math.abs(parseFloat(t.amount) || 0), tipo: 'gasto', categoria: '',
          mes: mesDesdeFecha(fecha), persona: 'conjunto', origen: 'basiq',
        });
        n++;
      });
    });
    setMsg(`✅ Importados ${n} gastos nuevos. Ve a 🧾 Movimientos y pulsa "Clasificar con IA".`);
  }

  return (
    <>
      <div className="section-header"><h2>🏦 Banco (CommBank vía Basiq)</h2></div>

      <div className="card">
        <h3>{connected ? '✅ Cuenta conectada' : '🔌 Conectar tu banco'}</h3>
        <div className="data-rows">
          <div className="data-row">
            <span>Email (para Basiq)</span>
            <input type="email" className="inline-input" value={email} placeholder="tu@email.com"
              style={{ minWidth: 220 }} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="data-row">
            <span>Estado</span>
            <strong>{connected ? `Conectado (user: ${state.basiqUserId})` : 'Sin conectar'}</strong>
          </div>
        </div>
        <div className="config-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={() => void connect()}>🔗 {connected ? 'Reconectar / añadir banco' : 'Conectar CommBank'}</button>
          <button className="btn-secondary" disabled={!connected} onClick={() => void fetchTx()}>📥 Traer movimientos</button>
          <button className="btn-primary" disabled={txs.filter(esGasto).length === 0} onClick={importMov}>📲 Importar a Movimientos</button>
        </div>
        <p style={{ marginTop: '0.75rem', opacity: 0.85 }}>{msg}</p>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Movimientos del banco</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
            <tbody>
              {txs.length === 0 ? (
                <tr><td colSpan={3} style={{ opacity: 0.6 }}>Sin movimientos cargados.</td></tr>
              ) : txs.map(t => {
                const amount = parseFloat(t.amount) || 0;
                return (
                  <tr key={t.id}>
                    <td>{t.postDate?.slice(0, 10) ?? ''}</td>
                    <td>{t.description ?? ''}</td>
                    <td style={{ textAlign: 'right' }} className={amount < 0 ? 'red' : 'green'}>{fmtAUD(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
