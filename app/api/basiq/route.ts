import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BASIQ_BASE = 'https://au-api.basiq.io';
const BASIQ_VERSION = '3.0';

function apiKey(): string {
  const key = process.env.BASIQ_API_KEY;
  if (!key) throw new Error('Falta BASIQ_API_KEY en el entorno del servidor.');
  return key;
}

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

async function ensureUser(token: string, userId: string | null, email: string): Promise<string> {
  if (userId) return userId;
  const res = await fetch(`${BASIQ_BASE}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': BASIQ_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`users ${res.status}: ${await res.text()}`);
  return (await res.json()).id as string;
}

async function authLink(token: string, userId: string): Promise<string> {
  const res = await fetch(`${BASIQ_BASE}/users/${userId}/auth_link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': BASIQ_VERSION },
  });
  if (!res.ok) throw new Error(`auth_link ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.links?.public ?? json.url) as string;
}

async function transactions(token: string, userId: string): Promise<unknown[]> {
  const res = await fetch(`${BASIQ_BASE}/users/${userId}/transactions?limit=500`, {
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': BASIQ_VERSION },
  });
  if (!res.ok) throw new Error(`transactions ${res.status}: ${await res.text()}`);
  return (await res.json()).data ?? [];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { action, userId, email } = await request.json();
    const token = await serverToken();

    if (action === 'connect') {
      const uid = await ensureUser(token, userId ?? null, email ?? user.email ?? 'user@example.com');
      const url = await authLink(token, uid);
      return NextResponse.json({ userId: uid, url });
    }
    if (action === 'transactions') {
      if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
      return NextResponse.json({ transactions: await transactions(token, userId) });
    }
    return NextResponse.json({ error: `acción desconocida: ${action}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
