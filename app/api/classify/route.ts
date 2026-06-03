import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';

interface Item { id: string; descripcion: string; monto: number }
interface Categoria { id: string; label: string }

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY en el servidor.' }, { status: 500 });

  try {
    const { items, categorias } = (await request.json()) as { items: Item[]; categorias: Categoria[] };
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ results: [] });

    const catList = (categorias ?? []).map(c => `${c.id}: ${c.label}`).join('\n');
    const txList = items.map(t => `- id="${t.id}" | "${t.descripcion}" | A$${t.monto}`).join('\n');

    const system =
      'Eres un clasificador de gastos personales. Asignas a cada movimiento la categoría ' +
      'más apropiada de la lista dada. Responde SOLO con un array JSON, sin texto extra, ' +
      'con la forma [{"id":"<id del movimiento>","categoria":"<id de categoría>"}]. ' +
      'Usa exactamente los ids de categoría provistos. Si ninguna encaja, usa "".';

    const prompt =
      `Categorías disponibles (id: nombre):\n${catList}\n\n` +
      `Movimientos a clasificar:\n${txList}\n\n` +
      `Devuelve el array JSON con la categoría de cada movimiento.`;

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return NextResponse.json({ error: `anthropic ${res.status}: ${await res.text()}` }, { status: 502 });

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const results = match ? JSON.parse(match[0]) : [];
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
