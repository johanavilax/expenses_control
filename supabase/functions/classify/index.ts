// Supabase Edge Function (Deno) — clasifica movimientos en categorías de presupuesto
// usando Anthropic Claude (Haiku). El ANTHROPIC_API_KEY vive solo aquí.
//
// Despliegue:
//   supabase functions deploy classify
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// deno-lint-ignore-file no-explicit-any

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

interface Item { id: string; descripcion: string; monto: number }
interface Categoria { id: string; label: string }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'Falta el secreto ANTHROPIC_API_KEY.' }, 500);

    const { items, categorias } = (await req.json()) as { items: Item[]; categorias: Categoria[] };
    if (!Array.isArray(items) || items.length === 0) return json({ results: [] });

    const catList = (categorias ?? []).map((c) => `${c.id}: ${c.label}`).join('\n');
    const txList = items
      .map((t) => `- id="${t.id}" | "${t.descripcion}" | A$${t.monto}`)
      .join('\n');

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
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return json({ error: `anthropic ${res.status}: ${await res.text()}` }, 502);

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const results = match ? JSON.parse(match[0]) : [];
    return json({ results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
