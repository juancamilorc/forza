#!/usr/bin/env node
/**
 * FORZA — Carga de datos de la DEMO
 * =====================================================
 * Reemplaza todo el dominio (deportistas, planes, pagos, sesiones, evaluaciones,
 * clases de prueba, videos, entrenadores) por un conjunto ficticio y crea las
 * cuentas demo (admin, entrenadores y nutricionista; nunca super_admin).
 *
 * Uso:
 *   node scripts/seed-demo.js                 → dry-run: muestra qué haría (solo lee)
 *   node scripts/seed-demo.js --apply         → ejecuta el borrado y la carga
 *   node scripts/seed-demo.js --offline       → muestra los datos sin conectarse a nada
 *   Opciones: --demo-env <ruta> (por defecto .env.demo)  --today AAAA-MM-DD
 *
 * Candados (se evalúan antes de cualquier conexión):
 *   - Lee SOLO .env.demo (ignorado por git); nunca el .env del proyecto real.
 *   - Se niega a correr si SUPABASE_URL no coincide con DEMO_SUPABASE_URL.
 *   - Se niega si public.users contiene cuentas que no sean de la demo.
 *
 * Variables de .env.demo: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_SUPABASE_URL
 * =====================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const data = require('./seed-demo.data');

const DOMAIN_WIPE_ORDER = [
  'payments', 'session_reschedule_history', 'notifications', 'sessions',
  'nutritional_assessments', 'technical_assessments', 'physical_assessments',
  'trial_sessions', 'trainer_blocks', 'guardians', 'plans', 'training_videos',
  'athletes', 'trainers',
];

const normalizeUrl = (u) => String(u ?? '').trim().replace(/\/+$/, '').toLowerCase();

function parseEnvFile(file) {
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf-8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** Devuelve un mensaje de error si el entorno no permite correr, o null si todo está bien. */
function checkEnv(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return 'Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo de entorno de la demo.';
  }
  if (!env.DEMO_SUPABASE_URL) {
    return 'Falta DEMO_SUPABASE_URL. Define en .env.demo la URL del proyecto de la demo.';
  }
  if (normalizeUrl(env.SUPABASE_URL) !== normalizeUrl(env.DEMO_SUPABASE_URL)) {
    return 'SUPABASE_URL no coincide con DEMO_SUPABASE_URL. No se hizo nada.';
  }
  return null;
}

const isDemoEmail = (email) => String(email).toLowerCase().endsWith(data.DEMO_DOMAIN);

// Las columnas que empiezan con "_" son solo para verificar; no se insertan.
const clean = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith('_')));

function parseArgs(argv) {
  const args = { apply: false, offline: false, envFile: path.join(__dirname, '..', '.env.demo'), today: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--offline') args.offline = true;
    else if (argv[i] === '--demo-env') args.envFile = path.resolve(argv[++i]);
    else if (argv[i] === '--today') args.today = argv[++i];
    else throw new Error(`Opción desconocida: ${argv[i]}`);
  }
  if (args.apply && args.offline) throw new Error('--offline no se puede combinar con --apply');
  if (args.today && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) throw new Error('--today debe ser AAAA-MM-DD');
  return args;
}

function printSummary(ds, today, mode) {
  const rows = (k) => ds[k].length;
  console.log(`\nDatos que ${mode} (fecha de referencia: ${today}):`);
  console.log(`  cuentas demo ......... ${data.USERS.length}  (1 admin, 4 entrenadores, 1 nutricionista; ninguna super_admin)`);
  console.log(`  entrenadores ......... ${rows('trainers')}`);
  console.log(`  deportistas .......... ${rows('athletes')}  (${ds.athletes.filter((a) => a.status === 'active').length} activos, ${ds.athletes.filter((a) => a.status === 'inactive').length} inactivos, ${ds.athletes.filter((a) => a.status === 'trial').length} en prueba)`);
  console.log(`  acudientes ........... ${rows('guardians')}`);
  console.log(`  planes ............... ${rows('plans')}  (${ds.plans.filter((p) => p.is_active).length} activos, ${ds.plans.filter((p) => p.is_frozen).length} congelado, ${ds.plans.filter((p) => !p.is_active).length} cancelados/inactivos, ${ds.plans.filter((p) => p.extended_times).length} extendido)`);
  const pay = (s) => ds.payments.filter((p) => p.status === s).length;
  console.log(`  pagos ................ ${rows('payments')}  (${pay('pagado')} pagados, ${pay('parcial')} parciales, ${pay('pendiente')} pendientes)`);
  const ses = (s) => ds.sessions.filter((x) => x.status === s).length;
  console.log(`  sesiones ............. ${rows('sessions')}  (${ses('completed')} completadas, ${ses('pending')} pendientes, ${ses('cancelled')} canceladas, ${ds.sessions.filter((s) => s.rescheduled_from).length} reprogramadas, ${ds.sessions.filter((s) => !s.plan_id).length} extra)`);
  console.log(`  evaluaciones ......... ${rows('technical_assessments')} técnicas, ${rows('physical_assessments')} físicas, ${rows('nutritional_assessments')} nutricionales`);
  console.log(`  clases de prueba ..... ${rows('trial_sessions')}`);
  console.log(`  videos ............... ${rows('training_videos')}`);
  console.log('\nCuentas de entrada (la demo entra por rol, sin contraseña; las contraseñas son aleatorias y no se guardan):');
  for (const u of data.USERS) console.log(`  ${u.role.padEnd(13)} ${u.email}  (${u.full_name})`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const today = args.today ?? new Date().toISOString().slice(0, 10);

  // ── Modo sin conexión: solo muestra los datos ──────────────
  if (args.offline) {
    const userIds = Object.fromEntries(data.USERS.map((u, i) => [u.key, data.uid('a0000001', i + 1)]));
    printSummary(data.buildDataset({ today, userIds }), today, 'se crearían');
    console.log('\n(--offline: no se leyó ni se escribió nada)');
    return;
  }

  // ── Candados, antes de cualquier conexión ──────────────────
  if (!fs.existsSync(args.envFile)) {
    console.error(`❌ No existe ${path.basename(args.envFile)}. Cópialo de .env.demo.example y complétalo (no se versiona).`);
    process.exit(1);
  }
  const env = parseEnvFile(args.envFile);
  const envError = checkEnv(env);
  if (envError) {
    console.error(`❌ ${envError}`);
    process.exit(1);
  }

  const { createClient } = require('@supabase/supabase-js');
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // ── Solo lectura: cuentas existentes ───────────────────────
  const { data: existing, error: usersError } = await db.from('users').select('id, email');
  if (usersError) {
    console.error(`❌ No se pudo leer la base de la demo: ${usersError.message}`);
    console.error('   Revisa la URL y la clave de .env.demo, y que hayas aplicado 000_baseline.sql y 007 en ese proyecto.');
    process.exit(1);
  }
  const foreign = existing.filter((u) => !isDemoEmail(u.email));
  if (foreign.length) {
    console.error(`❌ La base contiene ${foreign.length} cuenta(s) que no son de la demo. No se hizo nada.`);
    console.error('   Esta no parece ser la base de la demo; revisa SUPABASE_URL y DEMO_SUPABASE_URL.');
    process.exit(1);
  }
  const idByEmail = Object.fromEntries(existing.map((u) => [u.email.toLowerCase(), u.id]));
  const userIds = Object.fromEntries(data.USERS.map((u, i) => [u.key, idByEmail[u.email.toLowerCase()] ?? data.uid('a0000001', i + 1)]));
  const dataset = data.buildDataset({ today, userIds });

  if (!args.apply) {
    printSummary(dataset, today, 'se crearían');
    const missing = data.USERS.filter((u) => !idByEmail[u.email.toLowerCase()]).length;
    console.log(`\nCuentas por crear: ${missing} de ${data.USERS.length}. Todo el dominio actual se reemplazaría.`);
    console.log('\nDRY-RUN: no se escribió nada. Para cargar los datos: node scripts/seed-demo.js --apply');
    return;
  }

  const problems = await applySeed(db, { today, idByEmail, userIds });
  if (problems.length) {
    console.error('\n❌ La verificación encontró problemas:');
    problems.forEach((p) => console.error('  - ' + p));
    process.exit(1);
  }
  console.log('\n✅ Carga completada y verificada.');
}

/** Borra el dominio, asegura las cuentas, carga los datos y verifica. Devuelve la lista de problemas. */
async function applySeed(db, { today, idByEmail, userIds }) {
  const fail = (what, error) => { throw new Error(`${what}: ${error.message}`); };

  console.log('Borrando el dominio actual…');
  for (const table of DOMAIN_WIPE_ORDER) {
    const { error } = await db.from(table).delete().not('id', 'is', null);
    if (error && !/does not exist/i.test(error.message)) fail(`Borrando ${table}`, error);
  }

  console.log('Asegurando las cuentas demo…');
  for (const u of data.USERS) {
    let id = idByEmail[u.email.toLowerCase()];
    if (!id) {
      const password = crypto.randomBytes(24).toString('base64url'); // nunca se muestra ni se guarda
      const { data: created, error } = await db.auth.admin.createUser({
        email: u.email, password, email_confirm: true, user_metadata: { full_name: u.full_name, role: u.role },
      });
      if (error) fail(`Creando la cuenta ${u.email}`, error);
      id = created.user.id;
      const { error: insError } = await db.from('users').insert({ id, email: u.email, full_name: u.full_name, role: u.role, is_active: true });
      if (insError) fail(`Insertando users ${u.email}`, insError);
    } else {
      const { error } = await db.from('users').update({ full_name: u.full_name, role: u.role, is_active: true }).eq('id', id);
      if (error) fail(`Actualizando users ${u.email}`, error);
    }
    userIds[u.key] = id;
  }
  const finalData = data.buildDataset({ today, userIds }); // con los ids reales

  const insert = async (table, rows) => {
    if (!rows.length) return;
    const { error } = await db.from(table).insert(rows.map(clean));
    if (error) fail(`Insertando ${table}`, error);
    console.log(`  ✔ ${table}: ${rows.length}`);
  };

  console.log('Cargando datos…');
  await insert('trainers', finalData.trainers);
  await insert('athletes', finalData.athletes);
  await insert('guardians', finalData.guardians);
  await insert('plans', finalData.plans);
  await insert('payments', finalData.payments);
  // Una por una y en orden cronológico: el trigger numera las sesiones por orden de inserción
  // y calcula confirmation_status a partir de confirmed_by_trainer / confirmed_by_guardian.
  for (const s of finalData.sessions) {
    const { error } = await db.from('sessions').insert(clean(s));
    if (error) fail(`Insertando sesión ${s.id}`, error);
  }
  console.log(`  ✔ sessions: ${finalData.sessions.length}`);
  await insert('technical_assessments', finalData.technical_assessments);
  await insert('physical_assessments', finalData.physical_assessments);
  await insert('nutritional_assessments', finalData.nutritional_assessments);
  await insert('trial_sessions', finalData.trial_sessions);
  await insert('training_videos', finalData.training_videos);

  // ── Verificación ───────────────────────────────────────────
  console.log('Verificando…');
  const problems = [];
  const count = async (table) => (await db.from(table).select('*', { count: 'exact', head: true })).count;
  for (const t of ['trainers', 'athletes', 'guardians', 'plans', 'payments', 'sessions', 'technical_assessments', 'physical_assessments', 'nutritional_assessments', 'trial_sessions', 'training_videos']) {
    const got = await count(t);
    if (got !== finalData[t].length) problems.push(`${t}: esperadas ${finalData[t].length}, hay ${got}`);
  }
  const { data: sess, error: sessError } = await db.from('sessions').select('id, plan_id, session_number, confirmation_status, created_at').order('created_at');
  if (sessError) fail('Leyendo sesiones', sessError);
  const expected = Object.fromEntries(finalData.sessions.map((s) => [s.id, s._expected_confirmation_status]));
  const perPlan = {};
  for (const s of sess) {
    if (s.confirmation_status !== expected[s.id]) problems.push(`sesión ${s.id}: confirmation_status ${s.confirmation_status}, esperado ${expected[s.id]}`);
    const key = s.plan_id ?? 'sin-plan';
    perPlan[key] = (perPlan[key] ?? 0) + 1;
    if (s.plan_id && s.session_number !== perPlan[key]) problems.push(`sesión ${s.id}: número ${s.session_number}, esperado ${perPlan[key]}`);
  }
  const { data: allUsers } = await db.from('users').select('email, role');
  if (allUsers.some((u) => !isDemoEmail(u.email))) problems.push('hay cuentas que no son de la demo');
  if (allUsers.some((u) => u.role === 'super_admin')) problems.push('hay una cuenta super_admin');

  return problems;
}

if (require.main === module) {
  main().catch((e) => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  });
}

module.exports = { applySeed, DOMAIN_WIPE_ORDER, checkEnv, parseEnvFile, parseArgs, isDemoEmail, clean, normalizeUrl };
