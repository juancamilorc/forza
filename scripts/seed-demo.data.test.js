// Pruebas del seed de la demo. Ejecutar con:  node --test scripts/
// No usan red ni credenciales: validan los datos generados y los candados del script.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const data = require('./seed-demo.data');
const cli = require('./seed-demo');

const SCRIPT = path.join(__dirname, 'seed-demo.js');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const userIds = Object.fromEntries(data.USERS.map((u, i) => [u.key, data.uid('a0000001', i + 1)]));
// Fechas de referencia en distintos días de la semana: los ajustes por disponibilidad dependen de ello
const TODAYS = ['2026-11-02', '2026-11-04', '2026-11-07', '2026-11-08'];

const idsOf = (rows) => new Set(rows.map((r) => r.id));
const build = (today) => data.buildDataset({ today, userIds });

// ── Cuentas ──────────────────────────────────────────────────
test('los correos demo salen de demo.config.ts y ninguna cuenta es super_admin', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'apps/api/src/demo/demo.config.ts'), 'utf-8');
  for (const role of ['admin', 'trainer', 'nutritionist']) {
    assert.ok(src.includes(`'${data.DEMO_EMAILS[role]}'`), `falta el correo de ${role}`);
  }
  assert.equal(data.USERS.filter((u) => u.role === 'admin' && u.email === data.DEMO_EMAILS.admin).length, 1);
  assert.equal(data.USERS.find((u) => u.role === 'trainer' && u.email === data.DEMO_EMAILS.trainer)?.key, 'trainer1');
  assert.equal(data.USERS.filter((u) => u.role === 'nutritionist' && u.email === data.DEMO_EMAILS.nutritionist).length, 1);
  assert.ok(data.USERS.every((u) => u.role !== 'super_admin'));
  assert.ok(data.USERS.every((u) => cli.isDemoEmail(u.email)));
  assert.equal(new Set(data.USERS.map((u) => u.email)).size, data.USERS.length);
});

// ── Integridad por cada fecha de referencia ──────────────────
for (const today of TODAYS) {
  test(`integridad referencial y reglas de negocio (hoy = ${today})`, () => {
    const ds = build(today);
    for (const [table, rows] of Object.entries(ds)) {
      assert.equal(idsOf(rows).size, rows.length, `ids repetidos en ${table}`);
      assert.ok(rows.every((r) => UUID.test(r.id)), `id inválido en ${table}`);
    }
    const trainers = idsOf(ds.trainers), athletes = idsOf(ds.athletes), plans = idsOf(ds.plans), sessions = idsOf(ds.sessions);
    const users = new Set(Object.values(userIds));

    assert.ok(ds.trainers.every((t) => users.has(t.user_id)));
    assert.ok(ds.athletes.every((a) => trainers.has(a.trainer_id)));
    assert.ok(ds.guardians.every((g) => athletes.has(g.athlete_id)));
    assert.ok(ds.plans.every((p) => athletes.has(p.athlete_id)));
    assert.ok(ds.payments.every((p) => athletes.has(p.athlete_id) && plans.has(p.plan_id) && users.has(p.registered_by)));
    assert.ok(ds.sessions.every((s) => athletes.has(s.athlete_id) && trainers.has(s.trainer_id) && (s.plan_id === null || plans.has(s.plan_id))));
    for (const k of ['technical_assessments', 'physical_assessments', 'nutritional_assessments']) {
      assert.ok(ds[k].every((r) => athletes.has(r.athlete_id) && users.has(r.evaluator_id)), k);
    }
    assert.ok(ds.trial_sessions.every((t) => trainers.has(t.trainer_id) && (!t.converted_to_athlete_id || athletes.has(t.converted_to_athlete_id))));
    assert.ok(ds.training_videos.every((v) => users.has(v.uploaded_by)));
    // Las evaluaciones nutricionales las firma el nutricionista
    assert.ok(ds.nutritional_assessments.every((r) => r.evaluator_id === userIds.nutri));
  });

  test(`sesiones: orden cronológico, estados y disponibilidad (hoy = ${today})`, () => {
    const ds = build(today);
    const planBy = Object.fromEntries(ds.plans.map((p) => [p.id, p]));
    const trainerBy = Object.fromEntries(ds.trainers.map((t) => [t.id, t]));
    const seen = new Set();
    let prev = '';
    for (const s of ds.sessions) {
      const key = s.session_date + s.session_time;
      assert.ok(key >= prev, 'sesiones fuera de orden cronológico');
      prev = key;
      if (s.rescheduled_from) assert.ok(seen.has(s.rescheduled_from), 'la reprogramada debe insertarse después de la original');
      seen.add(s.id);

      assert.ok(['pending', 'completed', 'cancelled'].includes(s.status));
      if (s.status === 'completed') assert.ok(s.session_date < today && s.confirmed_by_trainer, 'completada: pasada y confirmada por el entrenador');
      if (s.status === 'pending') assert.ok(s.session_date > today && !s.confirmed_by_trainer, 'pendiente: futura y sin confirmar por el entrenador');
      if (s.status === 'cancelled') assert.ok(['cambio_climatico', 'entrenador', 'usuario'].includes(s.cancellation_reason));
      else assert.equal(s.cancellation_reason, null);
      assert.equal(s._expected_confirmation_status, s.confirmed_by_trainer ? (s.confirmed_by_guardian ? 'verified' : 'partial') : 'pending');
      assert.ok(!('confirmation_status' in s), 'confirmation_status lo calcula el trigger, no se envía');

      const t = trainerBy[s.trainer_id];
      assert.ok(t.available_days.includes(data.dayKey(s.session_date)), `día no disponible para el entrenador (${s.session_date})`);
      assert.ok(s.session_time >= t.available_hours_start && s.session_time <= t.available_hours_end, 'hora fuera de disponibilidad');
      if (s.plan_id) assert.ok(s.session_date >= planBy[s.plan_id].start_date, 'sesión anterior al inicio de su plan');
    }
    assert.equal(new Set(ds.sessions.map((s) => s.confirmation_token)).size, ds.sessions.length);
  });

  test(`planes y pagos coherentes con las reglas de la API (hoy = ${today})`, () => {
    const ds = build(today);
    for (const p of ds.plans) {
      assert.notEqual(p.end_date, p.start_date, 'el trigger sobrescribiría end_date');
      if (!p.extended_times) assert.equal(p.end_date, data.planEndDate(p.start_date));
      assert.ok(['momentum', 'momentum_pro', 'master', 'master_pro', 'frz', 'frz_pro', 'elite', 'elite_pro', 'addicted_to_football'].includes(p.plan_type));
      const used = ds.sessions.filter((s) => s.plan_id === p.id && s.status !== 'cancelled').length;
      assert.ok(used <= p.total_sessions, 'más sesiones que el cupo del plan');
      const mine = ds.payments.filter((x) => x.plan_id === p.id);
      assert.ok(mine.length >= 1, 'plan sin pago');
      if (ds.sessions.some((s) => s.plan_id === p.id)) {
        assert.ok(mine.some((x) => x.status === 'pagado' || x.status === 'parcial'), 'plan con sesiones y sin pago registrado');
      }
    }
    for (const pay of ds.payments) {
      assert.ok(['pendiente', 'parcial', 'pagado'].includes(pay.status));
      assert.ok(pay.method === null || ['transferencia', 'efectivo', 'otro'].includes(pay.method));
      const expected = pay.amount_paid === 0 ? 'pendiente' : pay.amount_paid < pay.amount ? 'parcial' : 'pagado';
      assert.equal(pay.status, expected);
      assert.ok(pay.amount < 100000000 && pay.amount > 0);
    }
    // Cuotas: dos filas por plan, mismo total
    const cuotas = ds.payments.filter((x) => x.cuotas_total === 2);
    assert.equal(cuotas.length % 2, 0);
  });

  test(`evaluaciones respetan los límites del esquema (hoy = ${today})`, () => {
    const ds = build(today);
    const ranges = (rows, cols) => rows.forEach((r) => cols.forEach(([c, lo, hi]) => {
      if (r[c] !== null && r[c] !== undefined) assert.ok(r[c] >= lo && r[c] <= hi, `${c}=${r[c]} fuera de [${lo},${hi}]`);
    }));
    for (const t of ds.technical_assessments) {
      assert.ok(t.control_intentos >= 1 && t.control_intentos <= 4);
      for (const c of Object.keys(t).filter((k) => /^(control_(rastrero|media_altura|alto)|definicion_carril)_/.test(k))) {
        assert.ok(t[c] >= 0 && t[c] <= (c.startsWith('control') ? t.control_intentos : t.definicion_intentos), c);
      }
      assert.ok(t.pase_derecha <= t.pase_intentos && t.pase_izquierda <= t.pase_intentos);
      assert.ok(['bueno', 'aceptable', 'inadecuado'].includes(t.pase_clasificacion));
    }
    ranges(ds.technical_assessments, [['conduccion_5m', 0, 99.999], ['conduccion_20m', 0, 99.999], ['control_efectividad_total_pct', 0, 100], ['pase_efectividad_pct', 0, 100], ['definicion_efectividad_total_pct', 0, 100]]);
    ds.physical_assessments.forEach((r) => {
      for (const c of ['pies', 'rodillas', 'talones', 'cadera', 'tronco', 'brazos']) assert.ok(r[`movilidad_${c}`] >= 0 && r[`movilidad_${c}`] <= 3);
      for (const c of ['movilidad_clasificacion', 'salto_vertical_clasificacion', 'salto_horizontal_clasificacion']) {
        assert.ok(['excelente', 'bueno', 'promedio', 'debajo_promedio'].includes(r[c]), c);
      }
      assert.equal(r.salto_vertical_cm, Math.max(...r.salto_vertical_valores));
      assert.equal(r.salto_horizontal_cm, Math.max(...r.salto_horizontal_valores));
    });
    ranges(ds.physical_assessments, [['sprint_5m', 0, 99.999], ['sprint_20m', 0, 99.999], ['salto_vertical_cm', 0, 999.99], ['salto_horizontal_cm', 0, 999.99]]);
    ds.nutritional_assessments.forEach((r) => {
      for (const c of ['clasificacion_grasa', 'clasificacion_iaks', 'clasificacion_pliegues']) assert.ok(['bajo', 'adecuado', 'aceptable', 'alto'].includes(r[c]), c);
      // Mismas fórmulas que calcularNutricional
      const sum = r.pliegue_tricipital_mm + r.pliegue_subescapular_mm + r.pliegue_supraespinal_mm + r.pliegue_abdominal_mm + r.pliegue_muslo_mm + r.pliegue_pantorrilla_mm;
      assert.ok(Math.abs(r.sumatoria_pliegues_mm - sum) < 0.01);
      assert.ok(Math.abs(r.masa_libre_grasa_kg - (r.peso_kg - r.peso_graso_kg)) < 0.02);
      assert.ok(Math.abs(r.imc - r.peso_kg / (r.talla_cm / 100) ** 2) < 0.02);
    });
    ranges(ds.nutritional_assessments, [['porcentaje_grasa', 0, 999.99], ['iaks', 0, 99.999], ['imlg', 0, 99.999], ['complexion_osea', 0, 99.999], ['peso_ideal_kg', 0, 999.99]]);
    // Hay una evaluación inicial y una de seguimiento por deportista
    for (const k of ['technical_assessments', 'physical_assessments', 'nutritional_assessments']) {
      const byAthlete = {};
      ds[k].forEach((r) => { (byAthlete[r.athlete_id] ??= []).push(r.evaluation_date); });
      Object.values(byAthlete).forEach((d) => { assert.equal(d.length, 2); assert.ok(d[0] < d[1]); assert.ok(d[1] < today); });
    }
  });
}

test('esquema: deportistas, clases de prueba y acudientes cumplen los CHECK', () => {
  const ds = build('2026-11-04');
  assert.ok(ds.athletes.every((a) => ['M', 'F'].includes(a.gender) && ['active', 'inactive', 'trial'].includes(a.status)));
  assert.ok(ds.athletes.every((a) => /^\d{4}-\d{2}-\d{2}$/.test(a.birth_date)));
  assert.ok(ds.trial_sessions.every((t) => ['programada', 'cancelada'].includes(t.status) && ['pendiente', 'pagado'].includes(t.payment_status)));
  assert.equal(ds.trial_sessions.filter((t) => t.converted_to_athlete_id).length, 1);
  const conv = ds.athletes.find((a) => a.id === ds.trial_sessions.find((t) => t.converted_to_athlete_id).converted_to_athlete_id);
  assert.equal(conv.came_from_trial, true);
  assert.equal(conv.trial_date, ds.trial_sessions.find((t) => t.converted_to_athlete_id).trial_date);
  assert.ok(ds.guardians.every((g) => g.full_name && g.whatsapp_phone && g.is_primary !== undefined));
  assert.equal(ds.guardians.filter((g) => g.is_primary).length, ds.athletes.length);
  // Cobertura para que la demo se vea completa
  assert.ok(ds.plans.some((p) => p.is_frozen) && ds.plans.some((p) => p.extended_times) && ds.plans.some((p) => !p.is_active));
  assert.ok(ds.sessions.some((s) => s.rescheduled_from) && ds.sessions.some((s) => !s.plan_id) && ds.sessions.some((s) => s.status === 'cancelled'));
  assert.ok(ds.sessions.some((s) => s._expected_confirmation_status === 'partial') && ds.sessions.some((s) => s._expected_confirmation_status === 'verified'));
  assert.ok(ds.sessions.some((s) => s.status === 'pending' && s.confirmed_by_guardian));
  assert.ok(ds.payments.some((p) => p.status === 'pendiente' && p.due_date < '2026-11-04'));
});

test('nada de lo ficticio coincide con datos del cliente ni con la base de pruebas actual', () => {
  const ds = build('2026-11-04');
  const people = [
    ...data.USERS.map((u) => u.full_name),
    ...ds.athletes.map((a) => `${a.first_name} ${a.last_name}`),
    ...ds.guardians.map((g) => g.full_name),
    ...ds.trial_sessions.flatMap((t) => [t.child_name, t.guardian_name]),
  ];
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Nombres usados en el seed de pruebas y en la documentación versionada
  const reused = ['prueba', 'dexter', 'camilo', 'rico', 'gonzalez', 'perez', 'gomez', 'ruiz', 'diaz', 'torres'];
  for (const name of people) {
    for (const w of norm(name).split(/\s+/)) assert.ok(!reused.includes(w), `nombre reutilizado: ${name}`);
  }
  // Contra el respaldo local (no versionado), si existe: ninguna palabra de nombre puede aparecer
  const dir = path.join(__dirname, '..', 'backups');
  const dump = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')) : [];
  if (!dump.length) return;
  const text = norm(fs.readFileSync(path.join(dir, dump[0]), 'utf-8'));
  const collisions = new Set();
  for (const name of people) {
    for (const w of norm(name).split(/\s+/)) if (w.length > 2 && new RegExp(`\\b${w}\\b`).test(text)) collisions.add(w);
  }
  assert.deepEqual([...collisions], [], `palabras de nombre que aparecen en la base actual: ${collisions.size}`);
});

test('no hay teléfonos ni correos reales: todo es de dominio demo y números inválidos', () => {
  const ds = build('2026-11-04');
  for (const g of ds.guardians) {
    assert.match(g.whatsapp_phone, /^\+570000\d{6}$/);
    assert.ok(cli.isDemoEmail(g.email));
  }
  for (const t of ds.trial_sessions) {
    assert.match(t.guardian_whatsapp, /^\+570000\d{6}$/);
    assert.ok(cli.isDemoEmail(t.guardian_email));
  }
  assert.ok(ds.training_videos.every((v) => v.url.startsWith('https://www.youtube.com/results?search_query=')));
});

// ── Candados del script ──────────────────────────────────────
test('checkEnv: exige URL propia y que coincida con DEMO_SUPABASE_URL', () => {
  const ok = { SUPABASE_URL: 'https://demo.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'x', DEMO_SUPABASE_URL: 'https://DEMO.supabase.co' };
  assert.equal(cli.checkEnv(ok), null);
  assert.match(cli.checkEnv({ ...ok, SUPABASE_URL: 'https://real.supabase.co' }), /no coincide/);
  assert.match(cli.checkEnv({ ...ok, DEMO_SUPABASE_URL: '' }), /DEMO_SUPABASE_URL/);
  assert.match(cli.checkEnv({ ...ok, SUPABASE_URL: '' }), /Falta/);
  assert.match(cli.checkEnv({ ...ok, SUPABASE_SERVICE_ROLE_KEY: '' }), /Falta/);
});

test('parseEnvFile, clean y parseArgs', () => {
  const f = path.join(os.tmpdir(), `seed-demo-test-${process.pid}.env`);
  fs.writeFileSync(f, '# comentario\nA=1\nB="dos"\n\nC = tres\n');
  assert.deepEqual(cli.parseEnvFile(f), { A: '1', B: 'dos', C: 'tres' });
  fs.unlinkSync(f);
  assert.deepEqual(cli.clean({ a: 1, _b: 2 }), { a: 1 });
  assert.throws(() => cli.parseArgs(['--apply', '--offline']), /offline/);
  assert.throws(() => cli.parseArgs(['--borrar']), /desconocida/);
  assert.throws(() => cli.parseArgs(['--today', 'ayer']), /AAAA-MM-DD/);
  assert.equal(cli.parseArgs([]).apply, false); // dry-run por defecto
});

// ── Ejecución real del script (sin red: los candados cortan antes de conectar) ──
function run(args, envFileContent) {
  let envFile = path.join(os.tmpdir(), 'seed-demo-no-existe.env');
  if (envFileContent !== undefined) {
    envFile = path.join(os.tmpdir(), `seed-demo-cli-${process.pid}-${Math.random().toString(36).slice(2)}.env`);
    fs.writeFileSync(envFile, envFileContent);
  }
  const r = spawnSync(process.execPath, [SCRIPT, '--demo-env', envFile, ...args], { encoding: 'utf-8', env: { PATH: process.env.PATH } });
  if (envFileContent !== undefined) fs.unlinkSync(envFile);
  return r;
}

test('CLI: sin archivo de entorno se niega', () => {
  const r = run([]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /No existe/);
});

test('CLI: URL distinta de DEMO_SUPABASE_URL → se niega, también con --apply, antes de conectar', () => {
  const env = 'SUPABASE_URL=https://real.invalid\nSUPABASE_SERVICE_ROLE_KEY=fake\nDEMO_SUPABASE_URL=https://demo.invalid\n';
  for (const args of [[], ['--apply']]) {
    const r = run(args, env);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no coincide/);
    assert.doesNotMatch(r.stdout + r.stderr, /fake/); // nunca imprime claves
  }
});

test('CLI: sin DEMO_SUPABASE_URL → se niega', () => {
  const r = run([], 'SUPABASE_URL=https://x.invalid\nSUPABASE_SERVICE_ROLE_KEY=fake\n');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /DEMO_SUPABASE_URL/);
});

test('CLI: --offline muestra los datos sin leer ningún entorno y --apply --offline falla', () => {
  const r = run(['--offline', '--today', '2026-11-04']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /deportistas \.+ 16/);
  assert.match(r.stdout, /no se leyó ni se escribió nada/);
  const bad = run(['--offline', '--apply']);
  assert.equal(bad.status, 1);
});
