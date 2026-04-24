import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePlanDto } from '@forza/shared';
import { UpdatePlanDto } from '@forza/shared';

@Injectable()
export class PlansService {
  constructor(private supabase: SupabaseService) {}

  // ── GET ALL ──────────────────────────────────────────────────
  async findAll(athleteId?: string) {
    let query = this.supabase.db
      .from('plans')
      .select(`
        *,
        athletes ( id, first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    if (athleteId) {
      query = query.eq('athlete_id', athleteId);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── GET ONE ──────────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('plans')
      .select(`
        *,
        athletes ( id, first_name, last_name )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Plan ${id} no encontrado`);
    return data;
  }

  // ── DESACTIVAR PLANES ANTERIORES ─────────────────────────────
  private async deactivateAll(athleteId: string) {
    const { error } = await this.supabase.db
      .from('plans')
      .update({ is_active: false })
      .eq('athlete_id', athleteId)
      .eq('is_active', true);

    if (error) throw new BadRequestException(error.message);
  }

  // ── CREATE ───────────────────────────────────────────────────
  async create(dto: CreatePlanDto) {
    // Desactiva planes anteriores del mismo deportista
    await this.deactivateAll(dto.athlete_id);

    const { data, error } = await this.supabase.db
      .from('plans')
      .insert({
        athlete_id:     dto.athlete_id,
        plan_type:      dto.plan_type,
        total_sessions: dto.total_sessions,
        start_date:     dto.start_date,
        is_active:      dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── UPDATE ───────────────────────────────────────────────────
  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('plans')
      .update({ ...dto })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── DELETE ───────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.supabase.db
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Plan eliminado correctamente' };
  }
}
