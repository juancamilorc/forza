import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Público y sin datos sensibles: sirve de ping de mantenimiento (mantiene
// despiertos el servicio y la base) y de chequeo de que la API llega a la base.
@Controller('health')
export class HealthController {
  constructor(private supabase: SupabaseService) {}

  @Get()
  async check() {
    const { error } = await this.supabase.db.from('users').select('id').limit(1);
    if (error) throw new ServiceUnavailableException({ status: 'error' });
    return { status: 'ok' };
  }
}
