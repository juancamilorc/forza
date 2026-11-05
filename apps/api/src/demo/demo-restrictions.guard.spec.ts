import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DemoRestrictionsGuard } from './demo-restrictions.guard';

const ctx = (method: string, url: string) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ method, originalUrl: url }) }) }) as unknown as ExecutionContext;

describe('DemoRestrictionsGuard', () => {
  const guard = new DemoRestrictionsGuard();

  it.each([
    ['DELETE', '/api/athletes/1'],
    ['DELETE', '/api/payments/1'],
    ['POST', '/api/auth/login'],
    ['POST', '/api/auth/logout'],
    ['POST', '/api/AUTH/logout/'],
    ['POST', '/api/Auth/Login/'],
    ['POST', '/api/admin/users'],
    ['PATCH', '/api/admin/users/1'],
    ['PATCH', '/api/admin/users/1/toggle-active'],
    ['POST', '/api//ADMIN/users?x=1'],
  ])('bloquea %s %s', (method, url) => {
    expect(() => guard.canActivate(ctx(method, url))).toThrow(ForbiddenException);
  });

  it.each([
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/trainers'],
    ['PATCH', '/api/admin/trainers/1'],
    ['POST', '/api/auth/demo-login'],
    ['POST', '/api/athletes'],
    ['PATCH', '/api/sessions/1/cancel'],
    ['GET', '/api/health'],
  ])('permite %s %s', (method, url) => {
    expect(guard.canActivate(ctx(method, url))).toBe(true);
  });
});
