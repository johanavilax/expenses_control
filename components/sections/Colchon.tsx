'use client';

import { useAppState } from '@/lib/state';
import { fmtAUD } from '@/lib/format';

export default function Colchon() {
  const { state } = useAppState();
  const { config } = state;
  const meta = config.colchon_meta_meses * config.gastos_mensuales;

  return (
    <>
      <div className="section-header"><h2>🛡️ Colchón de Emergencia</h2></div>

      <div className="colchon-meta-bar card">
        <div className="colchon-meta-header">
          <span>Meta: <strong>{fmtAUD(meta)}</strong> ({config.colchon_meta_meses} meses × {fmtAUD(config.gastos_mensuales)})</span>
          <span>Aporte actual: <strong>{fmtAUD(config.colchon_aporte)}/mes</strong></span>
        </div>
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
