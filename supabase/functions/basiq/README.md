# Edge Function `basiq`

Proxy seguro entre la app y la API de [Basiq](https://www.basiq.io) (agregador CDR / Open Banking
australiano). El secreto `BASIQ_API_KEY` vive **solo** aquí, nunca en el frontend.

## Flujo

```
App  →  invoke('basiq', {action:'connect'})   →  esta función  →  Basiq  →  devuelve URL de consentimiento
App  →  abre la URL                            →  el usuario conecta CommBank (login + consentimiento CDR)
App  →  invoke('basiq', {action:'transactions'}) →  esta función  →  Basiq  →  movimientos
```

## Requisitos

1. Cuenta en https://dashboard.basiq.io y una **API key** (Developer → API Keys).
2. [Supabase CLI](https://supabase.com/docs/guides/cli) instalado y `supabase login`.

## Despliegue

```bash
# desde la raíz del proyecto
supabase link --project-ref <tu-project-ref>      # una sola vez
supabase functions deploy basiq
supabase secrets set BASIQ_API_KEY=<tu_api_key_de_basiq>
```

> `BASIQ_API_KEY` es un **secreto de la función**, NO una variable `VITE_`.
> Nunca debe terminar en el bundle del navegador.

## Probar local

```bash
supabase functions serve basiq --env-file ./supabase/.env.local
# ./supabase/.env.local debe contener: BASIQ_API_KEY=...
```

## Acciones que acepta (POST con JSON)

| body                                         | devuelve                  |
|----------------------------------------------|---------------------------|
| `{ "action": "connect", "email": "..." }`    | `{ userId, url }`         |
| `{ "action": "transactions", "userId": "" }` | `{ transactions: [...] }` |
