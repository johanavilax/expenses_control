# 💸 LF Dashboard — Melbourne

Dashboard de libertad financiera: presupuesto por categorías, movimientos
(manuales, CSV o banco vía Basiq), clasificación con IA y proyección a 20 años.

## Stack
- **Next.js (App Router) + React + TypeScript**
- **Supabase** — Auth (email/contraseña, cookies SSR) y base de datos (`lf_state`)
- **Chart.js** (react-chartjs-2)
- Lógica sensible (Basiq, clasificación IA) en **Route Handlers** `app/api/*` (secretos solo en el server)

## Desarrollo
```bash
cp .env.example .env   # rellena NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev            # http://localhost:3000
```

### Variables de entorno
| Variable | Dónde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | cliente Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | cliente Supabase (anon) |
| `BASIQ_API_KEY` | **secreto server** | `/api/basiq` |
| `ANTHROPIC_API_KEY` | **secreto server** | `/api/classify` (Claude Haiku) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreto, solo seed** | `npm run seed` |

## Base de datos (migraciones)
```bash
supabase link --project-ref <ref>
supabase db push        # aplica supabase/migrations/*
```
También corre solo en CI (`.github/workflows/deploy-supabase.yml`).

## Seed
```bash
npm run seed            # contra el proyecto del .env
npm run seed:local      # contra Supabase local (supabase start)
```

## Deploy (Vercel)
1. Importa el repo en [Vercel](https://vercel.com) (detecta Next automáticamente).
2. En **Project → Settings → Environment Variables** añade las variables de server/público
   (`NEXT_PUBLIC_*`, `BASIQ_API_KEY`, `ANTHROPIC_API_KEY`).
3. Cada push a `main` despliega solo. El workflow `ci.yml` valida typecheck + build en cada PR.
