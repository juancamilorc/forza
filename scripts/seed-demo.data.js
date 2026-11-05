/**
 * FORZA — Datos de la demo (módulo puro: no lee .env ni toca la red)
 * =====================================================
 * Todo es ficticio: nombres, teléfonos, correos y montos. Las fechas se calculan
 * a partir de `today`, así la agenda siempre se ve viva.
 *
 * Lo usan scripts/seed-demo.js (carga) y scripts/seed-demo.data.test.js (pruebas).
 * =====================================================
 */

const fs = require('fs');
const path = require('path');

// ── Correos de las cuentas demo: única fuente = apps/api/src/demo/demo.config.ts ──
function loadDemoEmails() {
  const file = path.join(__dirname, '..', 'apps', 'api', 'src', 'demo', 'demo.config.ts');
  const src = fs.readFileSync(file, 'utf-8');
  const block = src.match(/DEMO_USER_EMAILS[^{]*\{([^}]*)\}/);
  if (!block) throw new Error('No se encontró DEMO_USER_EMAILS en demo.config.ts');
  const emails = {};
  for (const m of block[1].matchAll(/(\w+):\s*'([^']+)'/g)) emails[m[1]] = m[2];
  for (const role of ['admin', 'trainer', 'nutritionist']) {
    if (!emails[role]) throw new Error(`Falta el correo demo del rol ${role} en demo.config.ts`);
  }
  return emails;
}

const DEMO_EMAILS = loadDemoEmails();
const DEMO_DOMAIN = '@' + DEMO_EMAILS.admin.split('@')[1];

// Valor de la clase de prueba en la demo: igual a TRIAL_PRICE del servicio de la API demo.
const DEMO_TRIAL_PRICE = 20000;
// Precio unitario ficticio por clase.
const UNIT_PRICE = 22500;

// ── Utilidades de fecha y de ids ─────────────────────────────
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const addYears = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return iso(d);
};
// Mismo cálculo que el backend: start + 1 mes (recortado a fin de mes) + 1 semana
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
const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const dayKey = (dateStr) => DAY_KEYS[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
// Mueve la fecha hasta caer en un día que el entrenador atiende (dir = +1 o -1)
const shiftToDay = (dateStr, days, dir) => {
  let d = dateStr;
  for (let i = 0; i < 7 && !days.includes(dayKey(d)); i++) d = addDays(d, dir);
  return d;
};
// Fecha a `off` días de hoy ajustada a un día de atención: las pasadas se mueven hacia
// adelante (sin llegar a hoy) para no caer antes del inicio del plan; las futuras, hacia adelante.
const placeDate = (todayStr, off, days) => {
  const d = shiftToDay(addDays(todayStr, off), days, 1);
  return off < 0 && d >= todayStr ? shiftToDay(addDays(todayStr, off), days, -1) : d;
};
const uid = (prefix, n) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;
const round = (v, dec) => Math.round(v * 10 ** dec) / 10 ** dec;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ── Cuentas (auth + public.users) ────────────────────────────
const USERS = [
  { key: 'admin',     role: 'admin',        email: DEMO_EMAILS.admin,        full_name: 'Ximena Montoya' },
  { key: 'trainer1',  role: 'trainer',      email: DEMO_EMAILS.trainer,      full_name: 'Fabián Lozano' },
  { key: 'trainer2',  role: 'trainer',      email: `demo.entrenador2${DEMO_DOMAIN}`, full_name: 'Natalia Betancur' },
  { key: 'trainer3',  role: 'trainer',      email: `demo.entrenador3${DEMO_DOMAIN}`, full_name: 'Julián Arbeláez' },
  { key: 'trainer4',  role: 'trainer',      email: `demo.entrenador4${DEMO_DOMAIN}`, full_name: 'Esteban Villegas' },
  { key: 'nutri',     role: 'nutritionist', email: DEMO_EMAILS.nutritionist, full_name: 'Marcela Quiroga' },
];

const TRAINERS = [
  { key: 'trainer1', n: 1, specialty: 'Técnica individual', bio: 'Entrenador de iniciación y perfeccionamiento técnico.',
    coverage_area: 'Norte', days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], start: '15:00:00', end: '20:00:00',
    slots: ['15:30:00', '17:00:00', '18:30:00'] },
  { key: 'trainer2', n: 2, specialty: 'Preparación física', bio: 'Trabaja velocidad, coordinación y prevención de lesiones.',
    coverage_area: 'Sur', days: ['martes', 'jueves', 'sabado'], start: '08:00:00', end: '13:00:00',
    slots: ['08:30:00', '10:00:00', '11:30:00'] },
  { key: 'trainer3', n: 3, specialty: 'Porteros y defensas', bio: 'Especialista en el trabajo de porteros y línea defensiva.',
    coverage_area: 'Centro', days: ['lunes', 'miercoles', 'viernes'], start: '16:00:00', end: '20:00:00',
    slots: ['16:30:00', '18:00:00', '19:00:00'] },
  { key: 'trainer4', n: 4, specialty: 'Iniciación deportiva', bio: 'Acompaña a los más pequeños en sus primeros pasos con el balón.',
    coverage_area: 'Occidente', days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'], start: '14:00:00', end: '19:00:00',
    slots: ['14:30:00', '16:00:00', '17:30:00'] },
];

const LOCATIONS = ['Parque Central', 'Cancha Sintética Norte', 'Unidad Deportiva Sur', 'Parque Lineal', 'Complejo Deportivo Occidente'];
const SESSION_NAMES = ['Conducción y control', 'Pase y recepción', 'Definición', 'Coordinación y velocidad', 'Juego reducido', 'Cambios de dirección'];
const NOTES = [
  'Buena actitud y buen manejo del balón.',
  'Trabajar el perfil izquierdo en la próxima clase.',
  'Mejoró la recepción orientada.',
  'Muy buena intensidad durante el juego reducido.',
];

// ── Deportistas ──────────────────────────────────────────────
// plan: tipo, clases, inicio (días respecto a hoy), pago y sesiones (offset en días + clase de sesión)
//   sesiones: v = verificada (entrenador y acudiente) · p = parcial (solo entrenador) · g = pendiente con
//   acudiente confirmado · n = pendiente · c:<motivo> = cancelada · r:<offset nuevo> = reprogramada
const ATHLETES = [
  { n: 1, first: 'Bruno', last: 'Londoño', gender: 'M', age: 11, position: 'mediocampista', status: 'active', trainer: 'trainer1',
    guardians: [{ name: 'Carolina Londoño', rel: 'Madre' }],
    body: { peso: 36.5, talla: 145, muneca: 14.2, p: [9, 8, 7, 9, 12, 8] },
    plan: { type: 'master', total: 12, start: -30, pay: 'paid',
      sessions: [[-26, 'v'], [-19, 'v'], [-12, 'v'], [-9, 'c:cambio_climatico'], [-5, 'p'], [2, 'g'], [4, 'n']] } },
  { n: 2, first: 'Abril', last: 'Cárdenas', gender: 'F', age: 9, position: 'delantero', status: 'active', trainer: 'trainer2',
    guardians: [{ name: 'Juliana Cárdenas', rel: 'Madre' }],
    body: { peso: 29.0, talla: 134, muneca: 12.8, p: [8, 7, 6, 8, 11, 8] },
    plan: { type: 'elite', total: 16, start: -18, pay: 'cuotas',
      sessions: [[-14, 'v'], [-7, 'v'], [-2, 'r:5'], [1, 'n'], [3, 'n']] } },
  { n: 3, first: 'Maximiliano', last: 'Ocampo', gender: 'M', age: 13, position: 'defensa', status: 'active', trainer: 'trainer3',
    guardians: [{ name: 'Ricardo Ocampo', rel: 'Padre' }, { name: 'Paola Quintero', rel: 'Madre' }],
    body: { peso: 47.0, talla: 158, muneca: 15.4, p: [10, 9, 8, 11, 14, 10] },
    plan: { type: 'momentum', total: 8, start: -33, pay: 'partial',
      sessions: [[-30, 'v'], [-25, 'v'], [-20, 'v'], [-15, 'v'], [-9, 'p'], [-4, 'p'], [2, 'n']] } },
  { n: 4, first: 'Julieta', last: 'Giraldo', gender: 'F', age: 7, position: 'delantero', status: 'active', trainer: 'trainer4',
    guardians: [{ name: 'Sandra Giraldo', rel: 'Madre' }],
    plan: { type: 'frz', total: 8, start: -10, pay: 'paid',
      sessions: [[-7, 'v'], [1, 'n'], [3, 'n'], [6, 'n']] } },
  { n: 5, first: 'Emiliano', last: 'Henao', gender: 'M', age: 15, position: 'portero', status: 'active', trainer: 'trainer3',
    guardians: [{ name: 'Mauricio Henao', rel: 'Padre' }],
    body: { peso: 62.0, talla: 172, muneca: 16.6, p: [8, 7, 8, 10, 13, 9] },
    plan: { type: 'master_pro', total: 12, start: -22, pay: 'overdue_partial',
      sessions: [[-19, 'v'], [-17, 'v'], [-12, 'v'], [-10, 'c:entrenador'], [-7, 'v'], [-3, 'v'], [3, 'n'], [5, 'n']] } },
  { n: 6, first: 'Catalina', last: 'Vélez', gender: 'F', age: 12, position: 'mediocampista', status: 'active', trainer: 'trainer2',
    guardians: [{ name: 'Adriana Vélez', rel: 'Madre' }],
    body: { peso: 41.0, talla: 150, muneca: 13.6, p: [10, 9, 8, 10, 14, 10] },
    plan: { type: 'frz_pro', total: 8, start: -12, pay: 'paid',
      sessions: [[-9, 'v'], [-2, 'p'], [2, 'n'], [5, 'g']] } },
  { n: 7, first: 'Thiago', last: 'Mejía', gender: 'M', age: 8, position: 'defensa', status: 'active', trainer: 'trainer4',
    guardians: [{ name: 'Daniela Mejía', rel: 'Madre' }],
    plan: { type: 'momentum_pro', total: 8, start: -26, pay: 'paid', frozen: { daysAgo: 9, reason: 'Lesión leve de tobillo' },
      sessions: [[-22, 'v'], [-16, 'v'], [-10, 'v']] } },
  { n: 8, first: 'Antonella', last: 'Salazar', gender: 'F', age: 10, position: 'delantero', status: 'active', trainer: 'trainer1',
    guardians: [{ name: 'Beatriz Salazar', rel: 'Madre' }, { name: 'Hernán Salazar', rel: 'Padre' }],
    plan: { type: 'elite_pro', total: 12, start: -50, pay: 'paid', extended: 14,
      sessions: [[-47, 'v'], [-43, 'v'], [-39, 'v'], [-35, 'v'], [-30, 'v'], [-26, 'v'], [-21, 'v'], [-16, 'v'], [1, 'n'], [3, 'n']] } },
  { n: 9, first: 'Joaquín', last: 'Palacio', gender: 'M', age: 14, position: 'mediocampista', status: 'active', trainer: 'trainer1',
    guardians: [{ name: 'Lina Palacio', rel: 'Madre' }],
    plan: { type: 'master', total: 8, start: -70, pay: 'paid', cancelled: true,
      sessions: [[-66, 'v'], [-61, 'v'], [-56, 'v'], [-50, 'v'], [-44, 'v'], [-38, 'v']] },
    extras: [[-4, 'v'], [3, 'n']] },
  { n: 10, first: 'Renata', last: 'Cifuentes', gender: 'F', age: 6, position: 'delantero', status: 'trial', trainer: 'trainer4',
    guardians: [{ name: 'Gloria Cifuentes', rel: 'Madre' }] },
  { n: 11, first: 'Ian', last: 'Duque', gender: 'M', age: 12, position: 'defensa', status: 'inactive', trainer: 'trainer2',
    guardians: [{ name: 'Óscar Duque', rel: 'Padre' }],
    plan: { type: 'momentum', total: 8, start: -100, pay: 'paid', cancelled: true,
      sessions: [[-96, 'v'], [-91, 'v'], [-86, 'v'], [-80, 'v'], [-75, 'v'], [-70, 'v'], [-66, 'v'], [-62, 'v']] } },
  { n: 12, first: 'Paulina', last: 'Barrientos', gender: 'F', age: 16, position: 'portero', status: 'active', trainer: 'trainer3',
    guardians: [{ name: 'Teresa Barrientos', rel: 'Madre' }],
    plan: { type: 'master', total: 12, start: -3, pay: 'unpaid', sessions: [] } },
  { n: 13, first: 'Gabriel', last: 'Orozco', gender: 'M', age: 9, position: 'delantero', status: 'active', trainer: 'trainer1',
    guardians: [{ name: 'Felipe Orozco', rel: 'Padre' }],
    body: { peso: 30.5, talla: 136, muneca: 13.0, p: [8, 7, 7, 9, 12, 8] },
    plan: { type: 'momentum', total: 8, start: -14, pay: 'paid',
      sessions: [[-11, 'v'], [-4, 'v'], [1, 'n'], [4, 'g'], [7, 'n']] } },
  { n: 14, first: 'Salomé', last: 'Marín', gender: 'F', age: 11, position: 'mediocampista', status: 'active', trainer: 'trainer4',
    guardians: [{ name: 'Claudia Marín', rel: 'Madre' }],
    body: { peso: 38.0, talla: 147, muneca: 13.4, p: [11, 10, 9, 11, 15, 11] },
    plan: { type: 'frz', total: 12, start: -20, pay: 'partial',
      sessions: [[-17, 'v'], [-10, 'v'], [-3, 'p'], [4, 'n']] } },
  { n: 15, first: 'Dante', last: 'Tobón', gender: 'M', age: 7, position: 'defensa', status: 'inactive', trainer: 'trainer2',
    guardians: [{ name: 'Marcela Tobón', rel: 'Madre' }] },
  { n: 16, first: 'Amelia', last: 'Aguirre', gender: 'F', age: 8, position: 'delantero', status: 'active', trainer: 'trainer1',
    guardians: [{ name: 'Viviana Aguirre', rel: 'Madre' }], fromTrial: -22,
    plan: { type: 'momentum', total: 8, start: -20, pay: 'paid',
      sessions: [[-17, 'v'], [-9, 'v'], [-2, 'p'], [5, 'n']] } },
];

// ── Evaluaciones ─────────────────────────────────────────────
const edadEnAnios = (birth, todayStr) =>
  Math.floor((new Date(`${todayStr}T00:00:00Z`) - new Date(`${birth}T00:00:00Z`)) / (1000 * 60 * 60 * 24 * 365));

// Réplica de clasificarSalto del backend (assessments.service.ts)
function clasificarSalto(tipo, valor, edad, sexo) {
  const tablas = {
    vertical: {
      '8-10': { M: [21, 24, 28, 31], F: [19, 22, 25, 28] },
      '11-12': { M: [26, 30, 34, 38], F: [23, 27, 30, 33] },
      '13-14': { M: [31, 35, 40, 45], F: [24, 27, 30, 33] },
      '15-17': { M: [33, 38, 43, 48], F: [24, 27, 30, 34] },
    },
    horizontal: {
      '8-10': { M: [120, 135, 150, 165], F: [105, 120, 135, 150] },
      '11-12': { M: [140, 155, 170, 185], F: [120, 135, 150, 165] },
      '13-14': { M: [165, 180, 195, 210], F: [135, 150, 165, 180] },
      '15-17': { M: [180, 200, 220, 240], F: [145, 165, 180, 195] },
    },
  };
  let rango = '15-17';
  if (edad >= 8 && edad <= 10) rango = '8-10';
  if (edad >= 11 && edad <= 12) rango = '11-12';
  if (edad >= 13 && edad <= 14) rango = '13-14';
  const limites = tablas[tipo][rango][sexo === 'M' ? 'M' : 'F'];
  const [debajo, promedio, bueno] = limites;
  if (valor < debajo) return 'debajo_promedio';
  if (valor < promedio) return 'promedio';
  if (valor < bueno) return 'bueno';
  return 'excelente';
}

const bandPct = (pct) => (pct >= 75 ? 'bueno' : pct >= 50 ? 'aceptable' : 'inadecuado');

function technicalRow(a, level, dateStr, evaluatorId, id) {
  const f = level ? 0.94 : 1; // el seguimiento mejora los tiempos
  const age = a.age;
  const t5 = (3.3 - 0.04 * age) * f;
  const score = (base, max, k) => clamp(base + level - ((a.n + k) % 2), 0, max);
  const d = {
    control_intentos: 2, pase_intentos: 4, definicion_intentos: 2,
    control_rastrero_dr: score(1, 2, 0), control_rastrero_iz: score(1, 2, 1),
    control_media_altura_dr: score(1, 2, 2), control_media_altura_iz: score(0, 2, 3),
    control_alto_dr: score(1, 2, 4), control_alto_iz: score(0, 2, 5),
    pase_derecha: score(2, 4, 0), pase_izquierda: score(1, 4, 1),
    definicion_carril_der_dr: score(1, 2, 0), definicion_carril_der_iz: score(0, 2, 1),
    definicion_carril_cen_dr: score(1, 2, 2), definicion_carril_cen_iz: score(1, 2, 3),
    definicion_carril_izq_dr: score(1, 2, 4), definicion_carril_izq_iz: score(0, 2, 5),
  };
  // % de efectividad: misma fórmula que calcularTecnico del backend
  const totalDer = d.control_rastrero_dr + d.control_media_altura_dr + d.control_alto_dr;
  const totalIzq = d.control_rastrero_iz + d.control_media_altura_iz + d.control_alto_iz;
  const defDer = d.definicion_carril_der_dr + d.definicion_carril_cen_dr + d.definicion_carril_izq_dr;
  const defIzq = d.definicion_carril_der_iz + d.definicion_carril_cen_iz + d.definicion_carril_izq_iz;
  const calc = {
    control_efectividad_derecha_pct: Math.round((totalDer / (3 * d.control_intentos)) * 100),
    control_efectividad_izquierda_pct: Math.round((totalIzq / (3 * d.control_intentos)) * 100),
    control_efectividad_total_pct: Math.round(((totalDer + totalIzq) / (6 * d.control_intentos)) * 100),
    pase_efectividad_pct: Math.round(((d.pase_derecha + d.pase_izquierda) / (2 * d.pase_intentos)) * 100),
    definicion_efectividad_dr_pct: Math.round((defDer / (3 * d.definicion_intentos)) * 100),
    definicion_efectividad_iz_pct: Math.round((defIzq / (3 * d.definicion_intentos)) * 100),
    definicion_efectividad_total_pct: Math.round(((defDer + defIzq) / (6 * d.definicion_intentos)) * 100),
  };
  return {
    id, athlete_id: a._id, evaluator_id: evaluatorId, evaluation_date: dateStr,
    period_label: level ? 'Seguimiento' : 'Evaluación inicial',
    conduccion_5m: round(t5, 3), conduccion_10m: round(t5 * 1.75, 3), conduccion_20m: round(t5 * 3.1, 3),
    cambios_direccion_derecha: round(t5 * 3.6, 3), cambios_direccion_izquierda: round(t5 * 3.8, 3),
    ...d, ...calc,
    control_clasificacion: bandPct(calc.control_efectividad_total_pct),
    control_notas: level ? 'Mejora clara en balones a media altura.' : 'Recepciones de balón alto por reforzar.',
    pase_clasificacion: bandPct(calc.pase_efectividad_pct),
    pase_notas: level ? 'Más precisión con el perfil menos hábil.' : 'Buena técnica de pase con el perfil dominante.',
    definicion_clasificacion: bandPct(calc.definicion_efectividad_total_pct),
    definicion_notas: level ? 'Define con más seguridad en los tres carriles.' : 'Dudas al definir por el carril izquierdo.',
  };
}

function physicalRow(a, level, dateStr, evaluatorId, id, todayStr) {
  const mov = (k) => clamp(2 + level - ((a.n + k) % 3 === 0 ? 1 : 0), 1, 3);
  const movs = { pies: mov(0), rodillas: mov(1), talones: mov(2), cadera: mov(3), tronco: mov(4), brazos: mov(5) };
  const avg = Object.values(movs).reduce((s, v) => s + v, 0) / 6;
  const analisis = (v) => (v >= 3 ? 'Rango completo y controlado.' : v === 2 ? 'Rango adecuado con leve compensación.' : 'Limitación visible, trabajar movilidad.');
  const edad = edadEnAnios(a._birth, dateStr);
  const sexo = a.gender;
  const base = (sexo === 'M' ? 22 : 19) + 1.8 * a.age;
  const vertical = [0, 1, 2].map((i) => round(base + level * 2 + i * 1.1 - ((a.n + i) % 2), 2));
  const horizontal = [0, 1, 2].map((i) => round(92 + 6 * a.age + level * 5 + i * 2.5 - ((a.n + i) % 3), 2));
  const vMax = Math.max(...vertical);
  const hMax = Math.max(...horizontal);
  const s5 = (1.5 - 0.02 * a.age) * (level ? 0.96 : 1);
  return {
    id, athlete_id: a._id, evaluator_id: evaluatorId, evaluation_date: dateStr,
    period_label: level ? 'Seguimiento' : 'Evaluación inicial',
    movilidad_pies: movs.pies, movilidad_pies_analisis: analisis(movs.pies),
    movilidad_rodillas: movs.rodillas, movilidad_rodillas_analisis: analisis(movs.rodillas),
    movilidad_talones: movs.talones, movilidad_talones_analisis: analisis(movs.talones),
    movilidad_cadera: movs.cadera, movilidad_cadera_analisis: analisis(movs.cadera),
    movilidad_tronco: movs.tronco, movilidad_tronco_analisis: analisis(movs.tronco),
    movilidad_brazos: movs.brazos, movilidad_brazos_analisis: analisis(movs.brazos),
    movilidad_clasificacion: avg >= 2.5 ? 'excelente' : avg >= 2 ? 'bueno' : avg >= 1.5 ? 'promedio' : 'debajo_promedio',
    movilidad_notas: level ? 'Progreso sostenido en cadera y tronco.' : 'Reforzar movilidad de cadera.',
    salto_vertical_valores: vertical, salto_vertical_cm: vMax,
    salto_vertical_clasificacion: clasificarSalto('vertical', vMax, edad, sexo),
    salto_vertical_notas: null,
    salto_horizontal_valores: horizontal, salto_horizontal_cm: hMax,
    salto_horizontal_clasificacion: clasificarSalto('horizontal', hMax, edad, sexo),
    salto_horizontal_notas: null,
    sprint_5m: round(s5, 3), sprint_10m: round(s5 * 1.7, 3), sprint_15m: round(s5 * 2.35, 3), sprint_20m: round(s5 * 3.0, 3),
  };
}

function nutritionalRow(a, level, dateStr, evaluatorId, id) {
  const b = a.body;
  const peso_kg = round(b.peso + level * 1.2, 2);
  const talla_cm = round(b.talla + level * 1.5, 2);
  const perimetro_muneca_cm = b.muneca;
  const [tri, sub, sup, abd, mus, pan] = b.p.map((v) => round(v - level * 0.8, 2));
  const porcentaje_grasa_deseado = 14;
  // Fórmulas del backend (calcularNutricional)
  const sumatoria = tri + sub + sup + abd + mus + pan;
  const pg = a.gender === 'M' ? 0.1051 * sumatoria + 2.585 : 0.1548 * sumatoria + 3.58;
  const pesoGraso = peso_kg * (pg / 100);
  const mlg = peso_kg - pesoGraso;
  const talla_m = talla_cm / 100;
  const iaks = (mlg * 100000) / Math.pow(talla_cm, 3);
  const imlg = mlg / Math.pow(talla_m, 2);
  const imc = peso_kg / Math.pow(talla_m, 2);
  const complexion = talla_cm / perimetro_muneca_cm;
  const pesoIdeal = mlg / (1 - porcentaje_grasa_deseado / 100);
  const bandGrasa = (v) => (v < 10 ? 'bajo' : v < 18 ? 'adecuado' : v < 24 ? 'aceptable' : 'alto');
  const bandIaks = (v) => (v < 0.9 ? 'bajo' : v < 1.2 ? 'adecuado' : v < 1.4 ? 'aceptable' : 'alto');
  const bandPliegues = (v) => (v < 35 ? 'bajo' : v < 60 ? 'adecuado' : v < 80 ? 'aceptable' : 'alto');
  return {
    id, athlete_id: a._id, evaluator_id: evaluatorId, evaluation_date: dateStr,
    period_label: level ? 'Seguimiento' : 'Evaluación inicial',
    position: a.position,
    peso_kg, talla_cm, perimetro_muneca_cm,
    pliegue_tricipital_mm: tri, pliegue_subescapular_mm: sub, pliegue_supraespinal_mm: sup,
    pliegue_abdominal_mm: abd, pliegue_muslo_mm: mus, pliegue_pantorrilla_mm: pan,
    perimetro_pantorrilla_cm: round(talla_cm * 0.22, 2), perimetro_brazo_tenso_cm: round(talla_cm * 0.17, 2),
    perimetro_brazo_cm: round(talla_cm * 0.155, 2), diametro_humero_cm: 6.1, diametro_femur_cm: 8.9,
    sumatoria_pliegues_mm: round(sumatoria, 2), porcentaje_grasa: round(pg, 2), peso_graso_kg: round(pesoGraso, 2),
    masa_libre_grasa_kg: round(mlg, 2), iaks: round(iaks, 3), imlg: round(imlg, 2), complexion_osea: round(complexion, 2),
    peso_ideal_kg: round(pesoIdeal, 2), imc: round(imc, 2), porcentaje_grasa_deseado,
    clasificacion_grasa: bandGrasa(pg), clasificacion_iaks: bandIaks(iaks), clasificacion_pliegues: bandPliegues(sumatoria),
    clasificacion_imc: 'Normal', clasificacion_talla_edad: 'Adecuada para la edad',
    clasificacion_antropometrica: 'Composición corporal acorde a la edad y al deporte',
    horario_entrenamiento: '4:00 p. m. a 5:00 p. m.',
    plan_desayuno: 'Huevo, arepa o pan integral, fruta y chocolate o jugo natural.',
    plan_media_manana: 'Fruta y un puñado de frutos secos.',
    plan_almuerzo: 'Proteína magra, arroz o papa, ensalada y verduras cocidas.',
    plan_media_tarde: 'Yogur con cereal o un sándwich pequeño antes de entrenar.',
    plan_cena: 'Proteína, verduras y una porción moderada de carbohidrato.',
    plan_finde: 'Mantener horarios de comida y buena hidratación.',
    recomendaciones: level
      ? 'Buena evolución. Mantener la hidratación y aumentar las porciones de proteína los días de entrenamiento.'
      : 'Organizar los horarios de comida alrededor del entrenamiento y reforzar la hidratación.',
    notas_comparacion: level ? 'Disminuyó la sumatoria de pliegues respecto a la evaluación inicial.' : null,
  };
}

// ── Construcción del conjunto de datos ───────────────────────
/**
 * @param {{ today: string, userIds: Record<string,string> }} opts  today = 'YYYY-MM-DD'
 */
function buildDataset({ today, userIds }) {
  const trainers = TRAINERS.map((t) => ({
    id: uid('d3a00001', t.n), user_id: userIds[t.key], specialty: t.specialty, bio: t.bio,
    coverage_area: t.coverage_area, available_days: t.days, available_hours_start: t.start,
    available_hours_end: t.end, timezone: 'America/Bogota',
  }));
  const trainerBy = Object.fromEntries(TRAINERS.map((t, i) => [t.key, { ...t, id: trainers[i].id, user_id: userIds[t.key] }]));
  const admin = userIds.admin;
  const nutri = userIds.nutri;

  const athletes = [];
  const guardians = [];
  const plans = [];
  const payments = [];
  const sessions = [];
  const technical = [];
  const physical = [];
  const nutritional = [];
  let sCounter = 0;
  let payCounter = 0;

  for (const a of ATHLETES) {
    a._id = uid('f0a70001', a.n);
    const tr = trainerBy[a.trainer];
    const birth = addDays(addYears(today, -a.age), -(30 + a.n * 17)); // cumpleaños repartidos
    a._birth = birth;
    athletes.push({
      id: a._id, trainer_id: tr.id, first_name: a.first, last_name: a.last, birth_date: birth,
      status: a.status, gender: a.gender, position: a.position,
      came_from_trial: a.fromTrial !== undefined, trial_date: a.fromTrial !== undefined ? addDays(today, a.fromTrial) : null,
      notes: null,
    });
    a.guardians.forEach((g, i) => guardians.push({
      id: uid('f09d0001', a.n * 10 + i), athlete_id: a._id, full_name: g.name,
      whatsapp_phone: `+57000000${String(a.n * 10 + i).padStart(4, '0')}`,
      email: `acudiente${a.n}${i ? 'b' : ''}${DEMO_DOMAIN}`, relationship: g.rel, is_primary: i === 0,
    }));

    if (a.plan) {
      const p = a.plan;
      const planId = uid('f0910001', a.n);
      const start = addDays(today, p.start);
      const originalEnd = planEndDate(start);
      const row = {
        id: planId, athlete_id: a._id, plan_type: p.type, total_sessions: p.total, start_date: start,
        end_date: originalEnd, is_active: !p.cancelled && a.status === 'active',
        is_frozen: false, frozen_at: null, frozen_reason: null, extended_times: 0, extension_notes: null, original_end_date: null,
      };
      if (p.frozen) {
        row.is_frozen = true;
        row.frozen_at = `${addDays(today, -p.frozen.daysAgo)}T15:00:00Z`;
        row.frozen_reason = p.frozen.reason;
      }
      if (p.extended) {
        row.extended_times = 1;
        row.original_end_date = originalEnd;
        row.end_date = addDays(originalEnd, p.extended);
        row.extension_notes = JSON.stringify([{ date: addDays(today, -14), days_added: p.extended, reason: 'Clases pendientes por lluvia' }]);
      }
      plans.push(row);

      // Pagos del plan
      const amount = p.total * UNIT_PRICE;
      const due = addDays(start, -1);
      const methods = ['transferencia', 'efectivo', 'transferencia'];
      const pay = (o) => payments.push({
        id: uid('f09a0001', ++payCounter), athlete_id: a._id, plan_id: planId, registered_by: admin,
        method: methods[payCounter % 3], referencia: null, cuota_numero: null, cuotas_total: 1, notes: null, ...o,
      });
      if (p.pay === 'paid') {
        pay({ amount, amount_paid: amount, status: 'pagado', payment_date: start, due_date: due });
      } else if (p.pay === 'partial') {
        pay({ amount, amount_paid: amount / 2, status: 'parcial', payment_date: addDays(start, 1), due_date: addDays(today, 3) });
      } else if (p.pay === 'overdue_partial') {
        pay({ amount, amount_paid: round(amount * 0.4, 2), status: 'parcial', payment_date: addDays(start, 1), due_date: addDays(today, -6) });
      } else if (p.pay === 'unpaid') {
        pay({ amount, amount_paid: 0, status: 'pendiente', method: null, payment_date: null, due_date: due });
      } else if (p.pay === 'cuotas') {
        pay({ amount: amount / 2, amount_paid: amount / 2, status: 'pagado', payment_date: start, due_date: due, cuota_numero: 1, cuotas_total: 2 });
        pay({ amount: amount / 2, amount_paid: 0, status: 'pendiente', method: null, payment_date: null, due_date: addDays(today, 9), cuota_numero: 2, cuotas_total: 2 });
      }

      // Sesiones del plan
      p.sessions.forEach(([off, kind], i) => {
        const date = placeDate(today, off, tr.days);
        const time = tr.slots[(a.n + i) % tr.slots.length];
        const base = {
          plan_id: planId, trainer_id: tr.id, athlete_id: a._id, session_date: date, session_time: time,
          location: LOCATIONS[(a.n + i) % LOCATIONS.length], session_name: SESSION_NAMES[(a.n + i) % SESSION_NAMES.length],
          trainer_notes: null, cancellation_reason: null, reschedule_count: 0, rescheduled_from: null,
          confirmed_by_trainer: false, confirmed_by_guardian: false, status: 'pending',
        };
        const mk = (o) => {
          const id = uid('f0530001', ++sCounter);
          const row = { ...base, ...o };
          sessions.push({
            id, session_number: 1, confirmation_token: uid('c0f10001', sCounter),
            token_expires_at: `${addDays(row.session_date, 3)}T23:59:00Z`, ...row,
          });
          return id;
        };
        const done = (g) => ({ status: 'completed', confirmed_by_trainer: true, confirmed_by_guardian: g, trainer_notes: NOTES[(a.n + i) % NOTES.length] });
        if (kind === 'v') mk({ ...done(true) });
        else if (kind === 'p') mk({ ...done(false) });
        else if (kind === 'g') mk({ confirmed_by_guardian: true });
        else if (kind === 'n') mk({});
        else if (kind.startsWith('c:')) mk({ status: 'cancelled', cancellation_reason: kind.slice(2) });
        else if (kind.startsWith('r:')) {
          const origId = mk({ status: 'cancelled', cancellation_reason: 'cambio_climatico' });
          const newDate = shiftToDay(addDays(today, Number(kind.slice(2))), tr.days, 1);
          mk({ session_date: newDate, rescheduled_from: origId, reschedule_count: 1 });
        }
      });
    }

    // Sesiones extra (sin plan; se facturan aparte)
    (a.extras ?? []).forEach(([off, kind], i) => {
      const date = placeDate(today, off, tr.days);
      const id = uid('f0530001', ++sCounter);
      sessions.push({
        id, plan_id: null, trainer_id: tr.id, athlete_id: a._id, session_number: 1,
        session_date: date, session_time: tr.slots[i % tr.slots.length], location: LOCATIONS[0], session_name: 'Clase extra',
        trainer_notes: null, cancellation_reason: null, reschedule_count: 0, rescheduled_from: null,
        status: kind === 'v' ? 'completed' : 'pending', confirmed_by_trainer: kind === 'v', confirmed_by_guardian: kind === 'v',
        confirmation_token: uid('c0f10001', sCounter), token_expires_at: `${addDays(date, 3)}T23:59:00Z`,
      });
    });
  }

  // Orden cronológico (el trigger set_session_number numera por orden de inserción)
  sessions.sort((x, y) => (x.session_date + x.session_time).localeCompare(y.session_date + y.session_time) || x.id.localeCompare(y.id));
  // Estado de confirmación esperado según los dos indicadores (lo calcula el trigger; aquí solo para verificar)
  for (const s of sessions) {
    s._expected_confirmation_status = s.confirmed_by_trainer
      ? (s.confirmed_by_guardian ? 'verified' : 'partial')
      : 'pending';
  }

  // Evaluaciones: inicial (hace ~11 semanas) y seguimiento (hace ~1 semana)
  const evalDates = [addDays(today, -80), addDays(today, -8)];
  const trainerUser = (a) => trainerBy[a.trainer].user_id;
  let tN = 0, pN = 0, nN = 0;
  for (const a of ATHLETES.filter((x) => [1, 2, 3, 6, 13, 14, 8].includes(x.n))) {
    [0, 1].forEach((lv) => technical.push(technicalRow(a, lv, evalDates[lv], trainerUser(a), uid('e7a00001', ++tN))));
  }
  for (const a of ATHLETES.filter((x) => [1, 2, 3, 5, 6, 13].includes(x.n))) {
    [0, 1].forEach((lv) => physical.push(physicalRow(a, lv, evalDates[lv], trainerUser(a), uid('e7b00001', ++pN), today)));
  }
  for (const a of ATHLETES.filter((x) => x.body)) {
    [0, 1].forEach((lv) => nutritional.push(nutritionalRow(a, lv, evalDates[lv], nutri, uid('e7c00001', ++nN))));
  }

  // Clases de prueba
  const t1 = trainerBy.trainer1, t2 = trainerBy.trainer2, t4 = trainerBy.trainer4;
  const amelia = ATHLETES.find((x) => x.n === 16);
  const trials = [
    { child_name: 'Lucas Betancourt', guardian_name: 'Mónica Betancourt', n: 1, off: 2, trainer: t1, status: 'programada', paid: false },
    { child_name: 'Elena Arboleda', guardian_name: 'Andrea Arboleda', n: 2, off: 4, trainer: t2, status: 'programada', paid: true },
    { child_name: 'Martín Escobar', guardian_name: 'Jorge Escobar', n: 3, off: -9, trainer: t4, status: 'cancelada', paid: false },
    { child_name: amelia.first + ' ' + amelia.last, guardian_name: 'Viviana Aguirre', n: 4, off: -22, trainer: t1, status: 'programada', paid: true, converted: amelia._id },
  ].map((t) => {
    const date = placeDate(today, t.off, t.trainer.days);
    return {
      id: uid('f7a10001', t.n), child_name: t.child_name, guardian_name: t.guardian_name,
      guardian_whatsapp: `+57000001${String(t.n).padStart(4, '0')}`, guardian_email: `prueba${t.n}${DEMO_DOMAIN}`,
      trial_date: date, trial_time: t.trainer.slots[0], location: LOCATIONS[t.n % LOCATIONS.length],
      payment_status: t.paid ? 'pagado' : 'pendiente', amount_paid: t.paid ? DEMO_TRIAL_PRICE : 0,
      google_calendar_event_id: null, converted_to_athlete_id: t.converted ?? null, notes: null,
      trainer_id: t.trainer.id, status: t.status,
    };
  });

  // La fecha de prueba del deportista convertido es la de su clase de prueba
  const converted = trials.find((t) => t.converted_to_athlete_id);
  athletes.find((x) => x.id === converted.converted_to_athlete_id).trial_date = converted.trial_date;

  // Videos: enlaces de búsqueda a contenido público genérico
  const q = (s) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}`;
  const videos = [
    ['Conducción de balón: ejercicios básicos', 'ejercicios de conducción de balón fútbol niños', 'Circuitos simples de conducción con conos.'],
    ['Pase y recepción en parejas', 'ejercicios de pase y recepción fútbol', 'Progresión de pases cortos con ambos perfiles.'],
    ['Definición frente al arco', 'ejercicios de definición fútbol', 'Remates desde tres carriles.'],
    ['Coordinación y velocidad con escalera', 'ejercicios escalera de coordinación fútbol', 'Rutinas de pies rápidos.'],
    ['Trabajo de porteros: salidas y desvíos', 'entrenamiento de porteros fútbol base', 'Fundamentos de desvíos y colocación.'],
    ['Movilidad y calentamiento previo', 'calentamiento movilidad fútbol niños', 'Rutina de 10 minutos antes de entrenar.'],
  ].map(([title, search, description], i) => ({
    id: uid('f7d00001', i + 1), title, url: q(search), description, uploaded_by: admin,
  }));

  return {
    trainers, athletes, guardians, plans, payments, sessions,
    technical_assessments: technical, physical_assessments: physical, nutritional_assessments: nutritional,
    trial_sessions: trials, training_videos: videos,
  };
}

module.exports = {
  USERS, TRAINERS, ATHLETES, DEMO_EMAILS, DEMO_DOMAIN, DEMO_TRIAL_PRICE, UNIT_PRICE,
  buildDataset, addDays, dayKey, uid, planEndDate, clasificarSalto,
};
