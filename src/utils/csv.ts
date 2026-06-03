/** Fila parseada de un CSV bancario. `monto` viene con signo (negativo = gasto). */
export interface CsvRow {
  fecha: string; // ISO YYYY-MM-DD
  descripcion: string;
  monto: number; // con signo
}

const DATE_RE = /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/;

/** Divide una línea CSV respetando comillas dobles. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/** Convierte "$1,234.50", "(50.00)", "-12" → número con signo. NaN si no es monto. */
function parseAmount(raw: string): number {
  let s = raw.replace(/[$\s]/g, '').replace(/,/g, '');
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  if (s === '' || !/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = parseFloat(s);
  return neg ? -n : n;
}

/** Normaliza fechas DD/MM/YYYY (day-first, formato AU) o YYYY-MM-DD → ISO. */
function normalizeDate(raw: string): string {
  const parts = raw.split(/[/-]/);
  if (parts.length !== 3) return raw;
  let [a, b, c] = parts;
  if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`; // YYYY-MM-DD
  if (c.length === 2) c = `20${c}`;
  return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // DD/MM/YYYY (day-first)
}

/**
 * Parser heurístico para CSV de banco (p.ej. CommBank NetBank: Fecha, Monto, Descripción).
 * Detecta por fila: la columna fecha, la columna monto y la descripción (texto restante).
 * Salta filas sin monto (cabeceras).
 */
export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: CsvRow[] = [];

  for (const line of lines) {
    const cols = splitLine(line);
    let fecha = '';
    let monto = NaN;
    const textos: string[] = [];

    for (const col of cols) {
      if (!fecha && DATE_RE.test(col)) { fecha = normalizeDate(col); continue; }
      if (isNaN(monto)) {
        const n = parseAmount(col);
        if (!isNaN(n)) { monto = n; continue; }
      }
      if (col) textos.push(col);
    }

    if (isNaN(monto)) continue; // cabecera o fila inválida
    rows.push({
      fecha: fecha || new Date().toISOString().slice(0, 10),
      descripcion: textos.sort((a, b) => b.length - a.length)[0] ?? '(sin descripción)',
      monto,
    });
  }
  return rows;
}
