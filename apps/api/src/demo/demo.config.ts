// Modo demo — solo se activa si DEMO_MODE=true Y SUPABASE_URL coincide con
// DEMO_SUPABASE_URL. Así, aunque DEMO_MODE se active por error en un ambiente
// con otra base (p. ej. la real), nada de lo demo existe.

export const DEMO_ROLES = ['admin', 'trainer', 'nutritionist'] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

// Cuentas ficticias que crea scripts/seed-demo.js. Nunca super_admin.
export const DEMO_USER_EMAILS: Record<DemoRole, string> = {
  admin: 'demo.admin@forza-demo.example',
  trainer: 'demo.entrenador@forza-demo.example',
  nutritionist: 'demo.nutricionista@forza-demo.example',
};

const normalizeUrl = (value?: string) =>
  (value ?? '').trim().replace(/\/+$/, '').toLowerCase();

export function isDemoRequested(env: NodeJS.ProcessEnv = process.env): boolean {
  return env['DEMO_MODE'] === 'true';
}

export function isDemoActive(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!isDemoRequested(env)) return false;
  const current = normalizeUrl(env['SUPABASE_URL']);
  const expected = normalizeUrl(env['DEMO_SUPABASE_URL']);
  return current !== '' && current === expected;
}

// Saltos de proxy confiables entre el servidor y el visitante (Render pone uno).
// Se usa para que el límite de peticiones cuente por visitante y no por proxy.
export function trustProxyHops(env: NodeJS.ProcessEnv = process.env): number {
  const raw = (env['TRUST_PROXY_HOPS'] ?? '').trim();
  if (!/^\d+$/.test(raw)) return 1;
  return Math.min(Number(raw), 5);
}

// Condiciones sin las cuales el modo demo no debe arrancar. JWT_SECRET no tiene valor
// por defecto en ningún lado; aquí además se exige que exista y sea largo, para que la
// demo firme con su propia clave.
export function demoConfigErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  const errors: string[] = [];
  if ((env['JWT_SECRET'] ?? '').length < 32) {
    errors.push('JWT_SECRET debe existir y tener al menos 32 caracteres (distinto al de producción)');
  }
  if (!env['CORS_ORIGINS']?.trim()) {
    errors.push('CORS_ORIGINS es obligatorio en modo demo');
  }
  return errors;
}
