export const fmtAUD = (v: number): string => `A$${Math.round(v).toLocaleString('en-AU')}`;
export const fmtCOP = (v: number): string => `COP$${Math.round(v).toLocaleString('es-CO')}`;
export const fmtPct = (v: number): string => `${(v * 100).toFixed(1)}%`;
export const fmtNum = (v: number): string => Math.round(v).toLocaleString('en-AU');
