import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
      OPTIONS,
    );
  }

  // Cliente de datos (service_role). NUNCA llamar signInWithPassword sobre él.
  get db(): SupabaseClient {
    return this.client;
  }

  // signInWithPassword guarda la sesión del usuario dentro del cliente que lo llama y,
  // desde ese momento, ese cliente deja de actuar como service_role. Por eso el login
  // usa un cliente desechable y el cliente de datos queda intacto (FOR-93).
  createAuthClient(): SupabaseClient {
    return createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
      OPTIONS,
    );
  }
}
