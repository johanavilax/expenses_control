// Seed de Supabase: crea usuarios (vía Admin API / service role) y siembra su
// estado inicial (config + presupuesto por categoría) según el modelo de Melbourne.
//
// Uso:
//   node --env-file=.env supabase/seed.mjs
//
// Variables de entorno requeridas (en .env, NO con prefijo VITE_ las secretas):
//   VITE_SUPABASE_URL            URL del proyecto (se reutiliza la del frontend)
//   SUPABASE_SERVICE_ROLE_KEY    clave service_role (SECRETA — solo servidor/seed)
//   Usuarios a crear, una de estas dos formas:
//     SEED_USERS='[{"email":"a@b.com","password":"secreto123"}]'   (JSON, varios)
//     SEED_USER_EMAIL=... y SEED_USER_PASSWORD=...                  (uno solo)

import { createClient } from '@supabase/supabase-js';

// ── Modelo Melbourne (refleja src/data/defaultConfig.ts) ─────────────────────
const CONFIG = {
  ingreso_tu: 5800,
  ingreso_pareja: 3000,
  ingreso_intereses: 55,
  capital_inicial: 12500,
  aporte_boom: 2200,
  aporte_cruise: 1200,
  cagr: 0.1,
  swr: 0.04,
  inflacion: 0.035,
  gastos_mensuales: 4350,
  anos_boom: 5,
  horizonte: 20,
  fi_number: 1200000,
  colchon_meta_meses: 6,
  colchon_aporte: 800,
  cop_deuda: 3000000,
  cop_ingreso: 1500000,
  cop_cuota: 900000,
  cop_tasa: 0.28,
  tipo_cambio: 3100,
};

// Presupuesto por categoría (A$/mes). Suma de grupos y % meta según el documento.
const CATEGORY_BUDGET = {
  // 🏠 Vivienda & Hogar (meta 22%)
  alquiler: 1600, electricidad: 120, gas: 55, internet: 90, seguro_hogar: 45, mantenimiento_hogar: 50,
  // 🛒 Alimentación (meta 16%)
  woolworths: 900, mercados: 80, restaurantes: 250, delivery: 80, alcohol: 60,
  // 🚗 Transporte (meta 9%)
  myki: 360, uber: 60, seguro_auto: 150, combustible: 150, rego: 83, mantenimiento_auto: 32,
  // ❤️ Salud (meta 5%)
  health_insurance: 240, medicamentos: 40, consultas: 40, gym: 80, higiene: 55,
  // 🎮 Ocio (meta 6%)
  streaming: 40, spotify: 20, salidas: 130, viajes: 150, hobbies: 70,
  // 📱 Móvil & Suscripciones (meta 1.5%)
  movil_tu: 45, movil_pareja: 45, software: 25, suscripciones: 20,
  // 💊 Seguros & Protección (meta 2%)
  income_protection: 80, life_insurance: 55, otros_seguros: 25,
  // 🎁 Varios & Buffer (meta 6%)
  ropa: 130, regalos: 50, mascotas: 0, buffer: 100, gastos_tu: 200, gastos_pareja: 200,
  // 🛡️ Colchón (meta 6%) — A$800/mes según hoja "Colchón Acelerado"
  colchon: 800,
  // 🚀 Inversión LF BOOM (meta 25%)
  inversion: 2200, super_voluntario: 0,
};

const MONTHS = ['May-26', 'Jun-26', 'Jul-26', 'Aug-26', 'Sep-26', 'Oct-26', 'Nov-26', 'Dec-26', 'Jan-27', 'Feb-27', 'Mar-27', 'Apr-27'];

function buildState() {
  const presupuesto = {};
  for (const m of MONTHS) presupuesto[m] = { ...CATEGORY_BUDGET };
  return {
    config: { ...CONFIG },
    presupuesto,
    colchon_real: {},
    notas: {},
    movimientos: [],
    currentMonth: 'May-26',
  };
}

function seedUsers() {
  if (process.env.SEED_USERS) return JSON.parse(process.env.SEED_USERS);
  if (process.env.SEED_USER_EMAIL && process.env.SEED_USER_PASSWORD) {
    return [{ email: process.env.SEED_USER_EMAIL, password: process.env.SEED_USER_PASSWORD }];
  }
  throw new Error('Define SEED_USERS (JSON) o SEED_USER_EMAIL + SEED_USER_PASSWORD en el .env');
}

async function ensureUser(admin, email, password) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!error && data?.user) return { user: data.user, creado: true };
  // Si ya existe, búscalo
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list?.users?.find((u) => u.email === email);
  if (found) return { user: found, creado: false };
  throw error ?? new Error(`No se pudo crear/encontrar el usuario ${email}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Falta VITE_SUPABASE_URL (o SUPABASE_URL).');
  if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY (clave service_role).');

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const users = seedUsers();
  const state = buildState();

  for (const { email, password } of users) {
    const { user, creado } = await ensureUser(admin, email, password);
    const { error } = await admin
      .from('lf_state')
      .upsert({ id: user.id, data: state, updated_at: new Date().toISOString() });
    if (error) throw new Error(`No se pudo sembrar el estado de ${email}: ${error.message}`);
    console.log(`✅ ${creado ? 'Creado' : 'Existente'} + sembrado: ${email} (${user.id})`);
  }
  console.log(`\n🌱 Listo. ${users.length} usuario(s) sembrado(s) con el modelo Melbourne.`);
}

main().catch((e) => {
  console.error(`❌ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
