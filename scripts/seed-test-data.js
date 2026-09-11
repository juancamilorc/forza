#!/usr/bin/env node
/**
 * FORZA — Seed de datos de prueba
 * =====================================================
 * Borra TODA la data de dominio (deportistas, planes, pagos, sesiones,
 * evaluaciones, agenda…) y la reemplaza por un set fijo y documentado.
 *
 * NO toca: auth.users, public.users, public.trainers  (cuentas se conservan)
 *
 * Uso:
 *   node scripts/seed-test-data.js           → dry-run (muestra qué haría)
 *   node scripts/seed-test-data.js --wipe    → ejecuta borrado + inserción
 *
 * Requiere en .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Fixtures documentados en ai-context/TEST-DATA.md
 * =====================================================
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Cargar .env ──────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env');
fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) {
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
});

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}
const db = createClient(URL, KEY);
const WIPE = process.argv.includes('--wipe');

// ── Helpers de fecha ─────────────────────────────────────────
const iso = (d) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
// end_date del plan: start + 1 mes + 1 semana, recorte a fin de mes (== backend)
const planEndDate = (startStr) => {
  const d = new Date(`${startStr}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  d.setUTCDate(d.getUTCDate() + 7);
  return iso(d);
};
const dayBefore = (startStr) => {
  const d = new Date(`${startStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return iso(d);
};

// ── Trainers existentes (se conservan) ───────────────────────
const TRAINER_DEXTER = 'bbbb0001-0000-0000-0000-000000000001';
const TRAINER_CAMILO = 'bbbb0001-0000-0000-0000-000000000002';

// ── IDs fijos de los fixtures ───────────────────────────────
const A = (n) => `f0a70000-0000-4000-8000-00000000000${n}`;
const P = (n) => `f0910000-0000-4000-8000-00000000000${n}`;
const PAY = (n) => `f09a0000-0000-4000-8000-00000000000${n}`;
const S = (n) => `f0530000-0000-4000-8000-00000000000${n}`;
const G = (n) => `f09d0000-0000-4000-8000-00000000000${n}`;

// ── Definición de fixtures ──────────────────────────────────
const P1_START = daysFromNow(-15);
const P2_START = daysFromNow(-20);
const P3_START = daysFromNow(-5);
const P5_START = daysFromNow(-30);

const athletes = [
  { id: A(1), first_name: 'PRUEBA AlDia',   last_name: 'Pérez', gender: 'M', status: 'active', trainer_id: TRAINER_DEXTER, birth_date: '2012-03-10', notes: 'Fixture: plan activo + pago al día' },
  { id: A(2), first_name: 'PRUEBA Debe',    last_name: 'Gómez', gender: 'F', status: 'active', trainer_id: TRAINER_DEXTER, birth_date: '2010-07-22', notes: 'Fixture: pago pendiente vencido (widget + badge Debe)' },
  { id: A(3), first_name: 'PRUEBA Parcial', last_name: 'Ruiz',  gender: 'M', status: 'active', trainer_id: TRAINER_CAMILO, birth_date: '2011-11-02', notes: 'Fixture: pago parcial, vencimiento futuro' },
  { id: A(4), first_name: 'PRUEBA SinPlan', last_name: 'Díaz',  gender: 'F', status: 'trial',  trainer_id: null,            birth_date: '2014-01-15', notes: 'Fixture: en prueba, sin plan ni entrenador' },
  { id: A(5), first_name: 'PRUEBA Sesiones',last_name: 'Torres',gender: 'M', status: 'active', trainer_id: TRAINER_CAMILO, birth_date: '2009-05-30', notes: 'Fixture: plan de 4 clases con 2 completadas (FOR-62)' },
];

const plans = [
  { id: P(1), athlete_id: A(1), plan_type: 'momentum', total_sessions: 8,  start_date: P1_START, end_date: planEndDate(P1_START), is_active: true },
  { id: P(2), athlete_id: A(2), plan_type: 'elite',    total_sessions: 12, start_date: P2_START, end_date: planEndDate(P2_START), is_active: true },
  { id: P(3), athlete_id: A(3), plan_type: 'master',   total_sessions: 8,  start_date: P3_START, end_date: planEndDate(P3_START), is_active: true },
  { id: P(5), athlete_id: A(5), plan_type: 'momentum', total_sessions: 4,  start_date: P5_START, end_date: planEndDate(P5_START), is_active: true },
];

const payments = [
  { id: PAY(1), athlete_id: A(1), plan_id: P(1), amount: 150000, amount_paid: 150000, status: 'pagado',    method: 'transferencia', payment_date: P1_START, due_date: dayBefore(P1_START), notes: 'Fixture: pago completo' },
  { id: PAY(2), athlete_id: A(2), plan_id: P(2), amount: 520000, amount_paid: 0,      status: 'pendiente', method: null,            payment_date: null,     due_date: daysFromNow(-21),   notes: 'Fixture: sin abonar, vencido' },
  { id: PAY(3), athlete_id: A(3), plan_id: P(3), amount: 480000, amount_paid: 240000, status: 'parcial',   method: 'efectivo',      payment_date: P3_START, due_date: daysFromNow(10),    notes: 'Fixture: abono 50%' },
  { id: PAY(5), athlete_id: A(5), plan_id: P(5), amount: 150000, amount_paid: 150000, status: 'pagado',    method: 'transferencia', payment_date: P5_START, due_date: dayBefore(P5_START), notes: 'Fixture: pago completo' },
];

const sessions = [
  { id: S(1), plan_id: P(5), trainer_id: TRAINER_CAMILO, athlete_id: A(5), session_number: 1, session_date: daysFromNow(-21), session_time: '16:00:00', session_name: 'Clase 1', location: 'Cancha La 70, Medellín', status: 'completed', confirmation_status: 'verified', confirmed_by_trainer: true,  confirmed_by_guardian: true },
  { id: S(2), plan_id: P(5), trainer_id: TRAINER_CAMILO, athlete_id: A(5), session_number: 2, session_date: daysFromNow(-14), session_time: '16:00:00', session_name: 'Clase 2', location: 'Cancha La 70, Medellín', status: 'completed', confirmation_status: 'verified', confirmed_by_trainer: true,  confirmed_by_guardian: true },
  { id: S(3), plan_id: P(5), trainer_id: TRAINER_CAMILO, athlete_id: A(5), session_number: 3, session_date: daysFromNow(2),   session_time: '16:00:00', session_name: 'Clase 3', location: 'Cancha La 70, Medellín', status: 'pending',   confirmation_status: 'pending',  confirmed_by_trainer: false, confirmed_by_guardian: false },
];

const guardians = [
  { id: G(1), athlete_id: A(1), full_name: 'PRUEBA Acudiente Pérez', whatsapp_phone: '+573001112233', is_primary: true },
];

// Orden de borrado: hijos → padres
const WIPE_ORDER = [
  'session_reschedule_history',
  'notifications',
  'payments',
  'sessions',
  'appointments',
  'nutritional_assessments',
  'technical_assessments',
  'physical_assessments',
  'trial_sessions',
  'trainer_blocks',
  'guardians',
  'plans',
  'athletes',
];

async function counts() {
  const out = {};
  for (const t of WIPE_ORDER) {
    const { count, error } = await db.from(t).select('*', { count: 'exact', head: true });
    out[t] = error ? `(${error.message})` : count;
  }
  return out;
}

async function wipeAll() {
  for (const t of WIPE_ORDER) {
    // borra todo: filtro siempre-verdadero sobre id
    const { error } = await db.from(t).delete().not('id', 'is', null);
    if (error && !/does not exist/i.test(error.message)) {
      throw new Error(`Borrando ${t}: ${error.message}`);
    }
    console.log(`  🗑  ${t}`);
  }
}

async function insert(table, rows) {
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`Insertando en ${table}: ${error.message}`);
  console.log(`  ✅ ${table}: ${rows.length}`);
}

(async () => {
  console.log(`\nFORZA seed — ${WIPE ? '⚠️  MODO WIPE (borra + inserta)' : 'dry-run (solo lectura)'}\n`);
  console.log('Conteos actuales:');
  console.table(await counts());

  if (!WIPE) {
    console.log('\nFixtures que se crearían:');
    console.log(`  athletes: ${athletes.length}  |  plans: ${plans.length}  |  payments: ${payments.length}  |  sessions: ${sessions.length}  |  guardians: ${guardians.length}`);
    console.log('\nPara ejecutar de verdad:  node scripts/seed-test-data.js --wipe\n');
    return;
  }

  console.log('\nBorrando data de dominio (users/trainers se conservan)…');
  await wipeAll();

  console.log('\nInsertando fixtures…');
  await insert('athletes', athletes);
  await insert('plans', plans);
  await insert('payments', payments);
  await insert('sessions', sessions);
  await insert('guardians', guardians);

  console.log('\nConteos finales:');
  console.table(await counts());
  console.log('\n✅ Listo. Ver ai-context/TEST-DATA.md para el detalle de cada fixture.\n');
})().catch((e) => {
  console.error('\n❌', e.message, '\n');
  process.exit(1);
});
