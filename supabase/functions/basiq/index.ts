// Supabase Edge Function (Deno) — proxy seguro hacia la API de Basiq.
// El secreto BASIQ_API_KEY vive SOLO aquí, nunca en el frontend.
//
// Despliegue:
//   supabase functions deploy basiq
//   supabase secrets set BASIQ_API_KEY=tu_api_key_de_basiq
//
// deno-lint-ignore-file no-explicit-any

const BASIQ_BASE = 'https://au-api.basiq.io';
const BASIQ_VERSION = '3.0';

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function apiKey(): string {
  const key = Deno.env.get('BASIQ_API_KEY');
  if (!key) throw new Error('Falta el secreto BASIQ_API_KEY en la Edge Function.');
  return key;
}

/** Token de servidor (SERVER_ACCESS) para llamar a la API de Basiq. */
async function serverToken(): Promise<string> {
  const res = await fetch(`${BASIQ_BASE}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey()}`,
      'basiq-version': BASIQ_VERSION,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'scope=SERVER_ACCESS',
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

/** Reutiliza el usuario existente o crea uno nuevo en Basiq. */
async function ensureUser(token: string, userId: string | null, email: string): Promise<string> {
  if (userId) return userId;
  const res = await fetch(`${BASIQ_BASE}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'basiq-version': BASIQ_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`users ${res.status}: ${await res.text()}`);
  return (await res.json()).id as string;
}

/** Genera el enlace de consentimiento donde el usuario conecta CommBank. */
async function authLink(token: string, userId: string): Promise<string> {
  const res = await fetch(`${BASIQ_BASE}/users/${userId}/auth_link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': BASIQ_VERSION },
  });
  if (!res.ok) throw new Error(`auth_link ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.links?.public ?? json.url) as string;
}

/** Trae los movimientos del usuario (hasta 500). */
async function transactions(token: string, userId: string): Promise<any[]> {
  const res = await fetch(`${BASIQ_BASE}/users/${userId}/transactions?limit=500`, {
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': BASIQ_VERSION },
  });
  if (!res.ok) throw new Error(`transactions ${res.status}: ${await res.text()}`);
  return (await res.json()).data ?? [];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, userId, email } = await req.json();
    const token = await serverToken();

    if (action === 'connect') {
      const uid = await ensureUser(token, userId ?? null, email ?? 'user@example.com');
      const url = await authLink(token, uid);
      return json({ userId: uid, url });
    }

    if (action === 'transactions') {
      if (!userId) return json({ error: 'userId requerido' }, 400);
      return json({ transactions: await transactions(token, userId) });
    }

    return json({ error: `acción desconocida: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
