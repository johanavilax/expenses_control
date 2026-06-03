#!/usr/bin/env bash
# Corre el seed contra el Supabase LOCAL (supabase start).
# Toma la URL y la service_role key del stack local automáticamente.
# Las credenciales del usuario (SEED_USER_EMAIL/PASSWORD o SEED_USERS) se leen de .env.
#
# Requisitos previos (una vez):
#   supabase start        # levanta el stack local
#   supabase db reset     # aplica migraciones (crea la tabla lf_state)
set -euo pipefail

command -v supabase >/dev/null 2>&1 || { echo "❌ Falta el Supabase CLI (https://supabase.com/docs/guides/cli)"; exit 1; }
[ -f .env ] || { echo "❌ No existe .env (copia .env.example y pon SEED_USER_EMAIL/PASSWORD)"; exit 1; }

status="$(supabase status -o env 2>/dev/null)" || {
  echo "❌ El Supabase local no está corriendo. Ejecuta: supabase start  (y luego: supabase db reset)"; exit 1;
}
eval "$status"

echo "🌱 Sembrando en Supabase local: ${API_URL}"
exec env \
  NEXT_PUBLIC_SUPABASE_URL="${API_URL:?}" \
  SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:?}" \
  node --env-file=.env supabase/seed.mjs
