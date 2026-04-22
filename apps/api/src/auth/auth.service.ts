import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
  ) {}

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.db.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedException(error.message);

    const { data: profile } = await this.supabase.db
      .from('users')
      .select('id, full_name, email, role, is_active')
      .eq('id', data.user.id)
      .single();

    // Firmamos nuestro propio token con JWT_SECRET
    const access_token = this.jwt.sign({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
    });

    return {
      access_token,
      user: profile,
    };
  }

  async signOut(token: string) {
    await this.supabase.db.auth.admin.signOut(token);
    return { message: 'Sesión cerrada correctamente' };
  }

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.db
      .from('users')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('id', userId)
      .single();

    if (error) throw new UnauthorizedException('Usuario no encontrado');
    return data;
  }
}
