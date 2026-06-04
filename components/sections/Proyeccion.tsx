'use client';

import { useAppState } from '@/lib/state';
import { projectCapital, calcFiNumber } from '@/lib/calculations';
import { fmtAUD, fmtPct } from '@/lib/format';

export default function Proyeccion() {
  const { state } = useAppState();
  const { config } = state;
  const fiNumber = calcFiNumber(config);

  return (
    <>
      <div className="section-header"><h2>🚀 Libertad Financiera</h2></div>

      <div className="fi-cards">
        <div className="fi-info-card"><div className="fi-icon">💰</div><div className="fi-title">FI Number</div><div className="fi-val">{fmtAUD(fiNumber)}</div><div className="fi-desc">Gastos anuales ÷ 4% SWR</div></div>
        <div className="fi-info-card"><div className="fi-icon">📈</div><div className="fi-title">CAGR Personal</div><div className="fi-val">{fmtPct(config.cagr)}</div><div className="fi-desc">Real: {fmtPct((1 + config.cagr) / (1 + config.inflacion) - 1)}</div></div>
        <div className="fi-info-card"><div className="fi-icon">⚡</div><div className="fi-title">Inyección Asimétrica</div><div className="fi-val">{fmtAUD(config.aporte_boom)}/mes</div><div className="fi-desc">Años 1-{config.anos_boom} BOOM → {fmtAUD(config.aporte_cruise)}/mes CRUISE</div></div>
        <div className="fi-info-card"><div className="fi-icon">🔮</div><div className="fi-title">Horizonte</div><div className="fi-val">{config.horizonte} años</div><div className="fi-desc">Capital proyectado: {fmtAUD(projectCapital(config).at(-1)?.capital ?? 0)}</div></div>
      </div>
    </>
  );
}
