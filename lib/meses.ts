import { MONTHS } from './defaultConfig';

export const MES_CORTO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convierte una fecha ISO a la etiqueta de mes usada por la app, p.ej. "May-26". */
export function mesDesdeFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return MONTHS[0];
  return `${MES_CORTO[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

export function parseMes(label: string): { mIdx: number; year: number } {
  const [mon, yy] = label.split('-');
  const mIdx = Math.max(0, MES_CORTO.indexOf(mon));
  return { mIdx, year: 2000 + (Number.parseInt(yy, 10) || 26) };
}

export function buildMes(mIdx: number, year: number): string {
  return `${MES_CORTO[mIdx]}-${String(year).slice(2)}`;
}
