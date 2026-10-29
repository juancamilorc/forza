import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

// Regresión FOR-93: signInWithPassword guarda la sesión del usuario en el cliente que
// lo llama; si fuera el cliente de datos, el backend dejaría de actuar como service_role.
describe('AuthService.signIn', () => {
  const profile = { id: 'u1', full_name: 'Admin', email: 'a@forza.com', role: 'admin', is_active: true };

  function build(signInResult: { data: any; error: any }) {
    const signInOnAuthClient = jest.fn().mockResolvedValue(signInResult);
    const signInOnDataClient = jest.fn();
    const single = jest.fn().mockResolvedValue({ data: profile });
    const supabase = {
      db: {
        auth: { signInWithPassword: signInOnDataClient },
        from: jest.fn().mockReturnValue({ select: () => ({ eq: () => ({ single }) }) }),
      },
      createAuthClient: jest.fn().mockReturnValue({ auth: { signInWithPassword: signInOnAuthClient } }),
    } as unknown as SupabaseService;
    const jwt = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
    return { service: new AuthService(supabase, jwt), supabase, signInOnAuthClient, signInOnDataClient };
  }

  it('hace el login en un cliente desechable y nunca en el cliente de datos', async () => {
    const { service, supabase, signInOnAuthClient, signInOnDataClient } =
      build({ data: { user: { id: 'u1' } }, error: null });

    const result = await service.signIn('a@forza.com', 'clave');

    expect(supabase.createAuthClient).toHaveBeenCalledTimes(1);
    expect(signInOnAuthClient).toHaveBeenCalledWith({ email: 'a@forza.com', password: 'clave' });
    expect(signInOnDataClient).not.toHaveBeenCalled();
    expect(result).toEqual({ access_token: 'token', user: profile });
  });

  it('credenciales inválidas → 401 y el cliente de datos sigue sin tocarse', async () => {
    const { service, signInOnDataClient } =
      build({ data: { user: null }, error: { message: 'Invalid login credentials' } });

    await expect(service.signIn('a@forza.com', 'mala')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signInOnDataClient).not.toHaveBeenCalled();
  });
});
