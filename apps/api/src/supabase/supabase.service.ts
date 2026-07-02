import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    console.log('SUPABASE_URL:', process.env['SUPABASE_URL']);
    console.log('All env keys:', Object.keys(process.env).join(', '));
    this.client = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );
  }

  get db(): SupabaseClient {
    return this.client;
  }
}
