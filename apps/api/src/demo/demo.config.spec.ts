import { isDemoActive, isDemoRequested, DEMO_ROLES, trustProxyHops, demoConfigErrors } from './demo.config';

const env = (o: Record<string, string>) => o as NodeJS.ProcessEnv;

describe('demo.config', () => {
  it('se activa solo si DEMO_MODE=true y la URL de Supabase coincide con la demo', () => {
    expect(isDemoActive(env({
      DEMO_MODE: 'true',
      SUPABASE_URL: 'https://demo.supabase.co/',
      DEMO_SUPABASE_URL: 'https://DEMO.supabase.co',
    }))).toBe(true);
  });

  it('no se activa si la URL no coincide', () => {
    expect(isDemoActive(env({
      DEMO_MODE: 'true',
      SUPABASE_URL: 'https://otra.supabase.co',
      DEMO_SUPABASE_URL: 'https://demo.supabase.co',
    }))).toBe(false);
  });

  it('no se activa si falta DEMO_SUPABASE_URL o SUPABASE_URL', () => {
    expect(isDemoActive(env({ DEMO_MODE: 'true', SUPABASE_URL: 'https://x.supabase.co' }))).toBe(false);
    expect(isDemoActive(env({ DEMO_MODE: 'true', DEMO_SUPABASE_URL: 'https://x.supabase.co' }))).toBe(false);
  });

  it('no se activa sin DEMO_MODE=true aunque las URLs coincidan', () => {
    const urls = { SUPABASE_URL: 'https://x.supabase.co', DEMO_SUPABASE_URL: 'https://x.supabase.co' };
    expect(isDemoActive(env({ ...urls }))).toBe(false);
    expect(isDemoActive(env({ ...urls, DEMO_MODE: 'false' }))).toBe(false);
    expect(isDemoRequested(env({ DEMO_MODE: 'true' }))).toBe(true);
  });

  it('los roles de demo nunca incluyen super_admin', () => {
    expect(DEMO_ROLES).not.toContain('super_admin');
  });
});

describe('trustProxyHops', () => {
  it('por defecto 1 salto (Render)', () => {
    expect(trustProxyHops(env({}))).toBe(1);
    expect(trustProxyHops(env({ TRUST_PROXY_HOPS: '' }))).toBe(1);
    expect(trustProxyHops(env({ TRUST_PROXY_HOPS: 'abc' }))).toBe(1);
    expect(trustProxyHops(env({ TRUST_PROXY_HOPS: '-2' }))).toBe(1);
  });

  it('lee el número de la variable, con tope', () => {
    expect(trustProxyHops(env({ TRUST_PROXY_HOPS: '2' }))).toBe(2);
    expect(trustProxyHops(env({ TRUST_PROXY_HOPS: '0' }))).toBe(0);
    expect(trustProxyHops(env({ TRUST_PROXY_HOPS: '99' }))).toBe(5);
  });
});

describe('demoConfigErrors', () => {
  const ok = { JWT_SECRET: 'x'.repeat(32), CORS_ORIGINS: 'https://demo.example' };

  it('sin errores con secreto largo y CORS definido', () => {
    expect(demoConfigErrors(env(ok))).toEqual([]);
  });

  it('exige JWT_SECRET propio y largo', () => {
    expect(demoConfigErrors(env({ ...ok, JWT_SECRET: '' }))).toHaveLength(1);
    expect(demoConfigErrors(env({ ...ok, JWT_SECRET: 'corto' }))).toHaveLength(1);
  });

  it('exige CORS_ORIGINS', () => {
    expect(demoConfigErrors(env({ JWT_SECRET: ok.JWT_SECRET }))).toHaveLength(1);
  });
});
