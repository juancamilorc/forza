// Prueba de la ruta --apply con una base SIMULADA (sin red). Ejecutar con:
//   node --test scripts/seed-demo.apply.test.js
//
// La base simulada valida contra el esquema real (migrations/000_baseline.sql): columnas
// existentes, NOT NULL sin default, valores de enum y claves foráneas (orden de borrado
// e inserción), y reproduce los triggers que importan: numeración de sesiones por plan y
// confirmation_status calculado desde los dos indicadores de confirmación.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const data = require('./seed-demo.data');
const { applySeed, isDemoEmail } = require('./seed-demo');

// ── Esquema leído del baseline ───────────────────────────────
const SQL = fs.readFileSync(path.join(__dirname, '..', 'migrations', '000_baseline.sql'), 'utf-8');
const ENUMS = {};
for (const m of SQL.matchAll(/CREATE TYPE public\.(\w+) AS ENUM \(([^)]*)\)/g)) {
  ENUMS[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const SCHEMA = {};
for (const m of SQL.matchAll(/CREATE TABLE public\.(\w+) \(\n([\s\S]*?)\n\);/g)) {
  const cols = {};
  for (const line of m[2].split('\n')) {
    const c = line.match(/^    ("?\w+"?) (.+?),?$/);
    if (!c || c[1] === 'CONSTRAINT') continue;
    const name = c[1].replace(/"/g, '');
    const rest = c[2];
    cols[name] = {
      required: /NOT NULL/.test(rest) && !/DEFAULT/.test(rest),
      enum: (rest.match(/^public\.(\w+)/) || [])[1],
    };
  }
  SCHEMA[m[1]] = cols;
}

// Claves foráneas que el simulador hace cumplir: [tabla, columna, tabla referenciada]
const FKS = [
  ['trainers', 'user_id', 'users'], ['athletes', 'trainer_id', 'trainers'], ['guardians', 'athlete_id', 'athletes'],
  ['plans', 'athlete_id', 'athletes'], ['payments', 'athlete_id', 'athletes'], ['payments', 'plan_id', 'plans'],
  ['payments', 'registered_by', 'users'], ['sessions', 'athlete_id', 'athletes'], ['sessions', 'trainer_id', 'trainers'],
  ['sessions', 'plan_id', 'plans'], ['sessions', 'rescheduled_from', 'sessions'],
  ['technical_assessments', 'athlete_id', 'athletes'], ['technical_assessments', 'evaluator_id', 'users'],
  ['physical_assessments', 'athlete_id', 'athletes'], ['physical_assessments', 'evaluator_id', 'users'],
  ['nutritional_assessments', 'athlete_id', 'athletes'], ['nutritional_assessments', 'evaluator_id', 'users'],
  ['trial_sessions', 'trainer_id', 'trainers'], ['trial_sessions', 'converted_to_athlete_id', 'athletes'],
  ['training_videos', 'uploaded_by', 'users'],
];

function makeDb({ existingUsers = [], numberSessions = true } = {}) {
  const tables = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t, []]));
  tables.users = existingUsers.map((u) => ({ ...u }));
  const log = { createUser: [], inserted: {} };
  let seq = 0;

  const insertRows = (table, rows) => {
    const cols = SCHEMA[table];
    if (!cols) return { message: `tabla desconocida ${table}` };
    for (const r of rows) {
      for (const k of Object.keys(r)) if (!(k in cols)) return { message: `columna inexistente ${table}.${k}` };
      for (const [name, def] of Object.entries(cols)) {
        if (def.required && (r[name] === undefined || r[name] === null)) return { message: `NOT NULL ${table}.${name}` };
        if (def.enum && r[name] != null && !ENUMS[def.enum].includes(r[name])) return { message: `valor inválido ${table}.${name}=${r[name]}` };
      }
      for (const [t, c, ref] of FKS) {
        if (t === table && r[c] != null && !tables[ref].some((x) => x.id === r[c]) && !(ref === table && r[c] === r.id)) {
          return { message: `FK ${table}.${c} → ${ref} (${r[c]})` };
        }
      }
      if (tables[table].some((x) => x.id === r.id)) return { message: `id duplicado en ${table}` };
      if (table === 'users' && tables.users.some((x) => x.email === r.email)) return { message: 'email duplicado' };
      const row = { ...r, created_at: `t${String(++seq).padStart(8, '0')}` };
      if (table === 'sessions') { // triggers de la base
        row.session_number = numberSessions ? tables.sessions.filter((s) => s.plan_id === r.plan_id && r.plan_id !== null).length + 1 : 1;
        row.confirmation_status = r.confirmed_by_trainer ? (r.confirmed_by_guardian ? 'verified' : 'partial') : 'pending';
      }
      tables[table].push(row);
      (log.inserted[table] ??= []).push(r);
    }
    return null;
  };

  const builder = (table) => {
    const state = { op: null, payload: null, head: false, filter: null };
    const run = () => {
      if (state.op === 'insert') { const e = insertRows(table, state.payload); return { error: e }; }
      if (state.op === 'delete') {
        for (const [t, c, ref] of FKS) {
          // Una FK a la misma tabla no impide borrar todas las filas en una sola sentencia
          if (ref === table && t !== table && tables[t].some((x) => x[c] != null)) return { error: { message: `FK ${t}.${c} aún referencia ${table}` } };
        }
        tables[table] = [];
        return { error: null };
      }
      if (state.op === 'update') {
        tables[table].filter((r) => r[state.filter[0]] === state.filter[1]).forEach((r) => Object.assign(r, state.payload));
        return { error: null };
      }
      if (state.head) return { count: tables[table].length, error: null };
      return { data: tables[table].map((r) => ({ ...r })), error: null };
    };
    const b = {
      insert(p) { state.op = 'insert'; state.payload = Array.isArray(p) ? p : [p]; return b; },
      delete() { state.op = 'delete'; return b; },
      update(p) { state.op = 'update'; state.payload = p; return b; },
      select(_cols, opts) { state.head = !!opts?.head; return b; },
      not() { return b; },
      eq(c, v) { state.filter = [c, v]; return b; },
      order() { return b; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return b;
  };

  return {
    tables, log,
    from: (t) => builder(t),
    auth: { admin: { createUser: async ({ email, password, user_metadata }) => {
      log.createUser.push({ email, passwordLength: password.length, role: user_metadata.role });
      return { data: { user: { id: data.uid('b0000001', log.createUser.length) } }, error: null };
    } } },
  };
}

const quiet = async (fn) => {
  const out = [];
  const orig = console.log;
  console.log = (...a) => out.push(a.join(' '));
  try { return { result: await fn(), out }; } finally { console.log = orig; }
};
const TODAY = '2026-11-04';
const emptyArgs = () => ({ today: TODAY, idByEmail: {}, userIds: Object.fromEntries(data.USERS.map((u, i) => [u.key, data.uid('a0000001', i + 1)])) });

test('--apply sobre una base vacía: carga todo, respeta el esquema y la verificación pasa', async () => {
  const db = makeDb();
  const { result: problems, out } = await quiet(() => applySeed(db, emptyArgs()));
  assert.deepEqual(problems, []);

  const ids = Object.fromEntries(db.tables.users.map((u) => [u.email, u.id]));
  const ds = data.buildDataset({ today: TODAY, userIds: Object.fromEntries(data.USERS.map((u) => [u.key, ids[u.email]])) });
  for (const t of Object.keys(ds)) assert.equal(db.tables[t].length, ds[t].length, t);

  // Cuentas: solo las seis de la demo, ninguna super_admin, contraseñas aleatorias que no se muestran
  assert.equal(db.tables.users.length, 6);
  assert.ok(db.tables.users.every((u) => isDemoEmail(u.email) && u.role !== 'super_admin' && u.is_active));
  assert.deepEqual(db.tables.users.map((u) => u.role).sort(), ['admin', 'nutritionist', 'trainer', 'trainer', 'trainer', 'trainer']);
  assert.ok(db.log.createUser.every((c) => c.passwordLength >= 32));
  assert.ok(!out.join('\n').match(/password|contraseña:/i));
  // No se envía confirmation_status ni columnas internas
  assert.ok(db.log.inserted.sessions.every((s) => !('confirmation_status' in s) && !Object.keys(s).some((k) => k.startsWith('_'))));
});

test('--apply dos veces: segunda corrida reutiliza cuentas y deja el mismo resultado', async () => {
  const db = makeDb();
  await quiet(() => applySeed(db, emptyArgs()));
  const users = db.tables.users.map((u) => ({ ...u }));
  const idByEmail = Object.fromEntries(users.map((u) => [u.email.toLowerCase(), u.id]));
  const userIds = Object.fromEntries(data.USERS.map((u) => [u.key, idByEmail[u.email.toLowerCase()]]));
  const before = db.log.createUser.length;

  const { result: problems } = await quiet(() => applySeed(db, { today: '2026-11-06', idByEmail, userIds }));
  assert.deepEqual(problems, []);
  assert.equal(db.log.createUser.length, before, 'no debe volver a crear cuentas');
  assert.equal(db.tables.users.length, 6);
  assert.equal(db.tables.athletes.length, 16);
  assert.equal(db.tables.sessions.length, data.buildDataset({ today: '2026-11-06', userIds }).sessions.length);
});

test('el borrado respeta el orden de las claves foráneas aun con datos previos', async () => {
  const db = makeDb();
  await quiet(() => applySeed(db, emptyArgs()));
  // Si el orden de borrado fuera incorrecto, el simulador devolvería error de FK y applySeed lanzaría
  const idByEmail = Object.fromEntries(db.tables.users.map((u) => [u.email.toLowerCase(), u.id]));
  const userIds = Object.fromEntries(data.USERS.map((u) => [u.key, idByEmail[u.email.toLowerCase()]]));
  await assert.doesNotReject(quiet(() => applySeed(db, { today: TODAY, idByEmail, userIds })));
});

test('la verificación detecta una base que no numera las sesiones (negativo)', async () => {
  const db = makeDb({ numberSessions: false });
  const { result: problems } = await quiet(() => applySeed(db, emptyArgs()));
  assert.ok(problems.some((p) => /número/.test(p)), 'debería reportar numeración incorrecta');
});

test('un error de la base aborta con el nombre de la tabla', async () => {
  const db = makeDb();
  const original = db.from;
  db.from = (t) => {
    const b = original(t);
    if (t === 'plans') b.insert = () => ({ then: (res) => res({ error: { message: 'boom' } }) });
    return b;
  };
  await assert.rejects(quiet(() => applySeed(db, emptyArgs())), /Insertando plans: boom/);
});
