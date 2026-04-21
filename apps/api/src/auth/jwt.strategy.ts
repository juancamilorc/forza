import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private supabase: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const { data, error } = await this.supabase.db.auth.getUser(
      payload.sub,
    );

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido');
    }

    const { data: userProfile } = await this.supabase.db
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!userProfile) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return userProfile;
  }
}
