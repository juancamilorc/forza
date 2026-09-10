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

  /**
   * Todos los planes duran lo mismo sin importar el tipo:
   * end_date = start_date + 1 mes + 1 semana.
   *
   * El "+ 1 mes" recorta al último día del mes destino si el día no existe
   * (ej: 31-ene + 1 mes = 28-feb), igual que `date + interval '1 month'` en
   * Postgres, para que el cálculo del backend y cualquier backfill SQL coincidan.
   */
  private calculateEndDate(startDate: string): string {
    const d = new Date(`${startDate}T00:00:00Z`);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const lastDayOfTargetMonth = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(day, lastDayOfTargetMonth));
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  }

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
        end_date:       this.calculateEndDate(dto.start_date),
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

    const payload: Record<string, unknown> = { ...dto };
    // Si cambia la fecha de inicio, recalcular la fecha de fin.
    if (dto.start_date) {
      payload.end_date = this.calculateEndDate(dto.start_date);
    }

    const { data, error } = await this.supabase.db
      .from('plans')
      .update(payload)
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

  // ── FREEZE ───────────────────────────────────────────────────
async freeze(id: string, reason: string) {
  await this.findOne(id);

  const { data, error } = await this.supabase.db
    .from('plans')
    .update({
      is_frozen:    true,
      frozen_at:    new Date().toISOString(),
      frozen_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);
  return data;
}

// ── UNFREEZE ─────────────────────────────────────────────────
async unfreeze(id: string) {
  await this.findOne(id);

  const { data, error } = await this.supabase.db
    .from('plans')
    .update({
      is_frozen:    false,
      frozen_at:    null,
      frozen_reason: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);
  return data;
}

// ── CANCEL PLAN ──────────────────────────────────────────────
async cancelPlan(id: string) {
  await this.findOne(id);

  const { data, error } = await this.supabase.db
    .from('plans')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

    if (error) throw new BadRequestException(error.message);
    return { message: 'Plan cancelado correctamente', plan: data };
  }
}
