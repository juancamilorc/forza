import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DEMO_USER_EMAILS } from '../demo/demo.config';

describe('AuthService.signInDemo', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  const activate = () => {
    process.env['DEMO_MODE'] = 'true';
    process.env['SUPABASE_URL'] = 'https://demo.supabase.co';
    process.env['DEMO_SUPABASE_URL'] = 'https://demo.supabase.co';
  };

  function build(profile: any) {
    const eq = jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: profile }) });
    const supabase = {
      db: { from: jest.fn().mockReturnValue({ select: () => ({ eq }) }) },
    } as unknown as SupabaseService;
    const sign = jest.fn().mockReturnValue('token');
    const jwt = { sign } as unknown as JwtService;
    return { service: new AuthService(supabase, jwt), eq, sign };
  }

  const trainer = { id: 'u2', full_name: 'Demo', email: DEMO_USER_EMAILS.trainer, role: 'trainer', is_active: true };

  it('emite token para el usuario demo del rol pedido', async () => {
    activate();
    const { service, eq, sign } = build(trainer);

    const result = await service.signInDemo('trainer');

    expect(eq).toHaveBeenCalledWith('email', DEMO_USER_EMAILS.trainer);
    expect(sign).toHaveBeenCalledWith({ sub: 'u2', email: trainer.email, role: 'trainer' });
    expect(result).toEqual({ access_token: 'token', user: trainer });
  });

  it('con el modo demo inactivo no emite nada', async () => {
    process.env['DEMO_MODE'] = 'true';
    process.env['SUPABASE_URL'] = 'https://real.supabase.co';
    process.env['DEMO_SUPABASE_URL'] = 'https://demo.supabase.co';
    const { service, sign } = build(trainer);

    await expect(service.signInDemo('trainer')).rejects.toBeInstanceOf(ForbiddenException);
    expect(sign).not.toHaveBeenCalled();
  });

  it('rechaza roles fuera de la lista, incluido super_admin', async () => {
    activate();
    const { service, sign } = build({ ...trainer, role: 'super_admin' });

    await expect(service.signInDemo('super_admin' as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(sign).not.toHaveBeenCalled();
  });

  it('si el usuario en la base tiene otro rol (p. ej. super_admin), no emite token', async () => {
    activate();
    const { service, sign } = build({ ...trainer, role: 'super_admin' });

    await expect(service.signInDemo('trainer')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sign).not.toHaveBeenCalled();
  });

  it('usuario inexistente o inactivo → 401', async () => {
    activate();
    await expect(build(null).service.signInDemo('admin')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(build({ ...trainer, is_active: false }).service.signInDemo('trainer')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
