import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSessionDto } from '@forza/shared';
import { UpdateSessionDto } from '@forza/shared';
import { ConfirmSessionDto } from '@forza/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionsService {
  constructor(private supabase: SupabaseService) {}

  // ── GET ALL ──────────────────────────────────────────────────
  async findAll(trainerId?: string, athleteId?: string) {
    let query = this.supabase.db
      .from('sessions')
      .select(`
        *,
        athletes ( id, first_name, last_name ),
        plans ( id, plan_type, total_sessions ),
        trainers ( id, users ( full_name ) )
      `)
      .order('session_date', { ascending: false });

    if (trainerId) query = query.eq('trainer_id', trainerId);
    if (athleteId) query = query.eq('athlete_id', athleteId);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── TRAINER ID LOOKUP ────────────────────────────────────────
  async getTrainerIdByUserId(userId: string): Promise<string | null> {
    const { data } = await this.supabase.db
      .from('trainers')
      .select('id')
      .eq('user_id', userId)
      .single();
    return data?.id ?? null;
  }

  // ── GET ONE ──────────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('sessions')
      .select(`
        *,
        athletes ( id, first_name, last_name ),
        plans ( id, plan_type, total_sessions )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Sesión ${id} no encontrada`);
    return data;
  }

  // ── VALIDAR CUPO DEL PLAN (FOR-62) ────────────────────────────
  // Cuenta como "usado" toda sesión no cancelada del plan (pending o
  // completed); una cancelada libera el cupo (reposición). Sesiones
  // "extra" (sin plan_id) no tienen límite.
  private async validatePlanCapacity(planId: string) {
    const { data: plan, error } = await this.supabase.db
      .from('plans')
      .select('total_sessions, is_active, is_frozen')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      throw new BadRequestException('El plan indicado no existe');
    }
    if (!plan.is_active) {
      throw new BadRequestException('No se pueden agendar sesiones en un plan inactivo');
    }
    if (plan.is_frozen) {
      throw new BadRequestException('No se pueden agendar sesiones en un plan congelado');
    }

    const { count } = await this.supabase.db
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', planId)
      .neq('status', 'cancelled');

    if ((count ?? 0) >= plan.total_sessions) {
      throw new BadRequestException(
        `El plan ya tiene sus ${plan.total_sessions} clases agendadas. Cancela una sesión o amplía el plan desde Planes.`,
      );
    }
  }

  // ── VALIDAR PAGO ANTES DE AGENDAR/CONFIRMAR (FOR-76) ──────────
  // "No se puede dar clases si no ha pagado": el plan debe tener al menos
  // un pago en estado 'pagado' o 'parcial'. Sesiones sin plan_id (extra)
  // no pasan por esta validación — se facturan aparte.
  private async validatePlanHasPayment(planId: string) {
    const { data: payments, error } = await this.supabase.db
      .from('payments')
      .select('status')
      .eq('plan_id', planId);

    if (error) throw new BadRequestException(error.message);

    const hasPayment = (payments ?? []).some(
      (p: { status: string }) => p.status === 'pagado' || p.status === 'parcial',
    );
    if (!hasPayment) {
      throw new BadRequestException(
        'No se puede agendar ni confirmar sesiones sin un pago registrado para este plan',
      );
    }
  }

  // ── CREATE ───────────────────────────────────────────────────
  async create(dto: CreateSessionDto) {
    if (dto.plan_id) {
      await this.validatePlanCapacity(dto.plan_id);
      await this.validatePlanHasPayment(dto.plan_id);
    }

    const confirmation_token = uuidv4();
    const token_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { count } = await this.supabase.db
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', dto.athlete_id);
    const session_number = (count ?? 0) + 1;

    const { data, error } = await this.supabase.db
      .from('sessions')
      .insert({
        plan_id:               dto.plan_id,
        trainer_id:            dto.trainer_id,
        athlete_id:            dto.athlete_id,
        session_date:          dto.session_date,
        session_time:          dto.session_time,
        location:              dto.location,
        session_name:          dto.session_name ?? null,
        status:                dto.status ?? 'pending',
        trainer_notes:         dto.trainer_notes ?? null,
        confirmed_by_trainer:  false,
        confirmed_by_guardian: false,
        confirmation_token,
        token_expires_at,
        session_number,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── UPDATE ───────────────────────────────────────────────────
  async update(id: string, dto: UpdateSessionDto) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('sessions')
      .update({ ...dto })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── TRAINER CONFIRM ──────────────────────────────────────────
  async confirmByTrainer(id: string) {
    const session = await this.findOne(id);

    if (session.plan_id) {
      await this.validatePlanHasPayment(session.plan_id);
    }

    const { data, error } = await this.supabase.db
      .from('sessions')
      .update({ confirmed_by_trainer: true, status: 'completed' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── GUARDIAN CONFIRM (público, sin JWT) ──────────────────────
  async confirmByGuardian(dto: ConfirmSessionDto) {
    // Busca la sesión por token
    const { data: session, error } = await this.supabase.db
      .from('sessions')
      .select('*')
      .eq('confirmation_token', dto.confirmation_token)
      .single();

    if (error || !session) {
      throw new NotFoundException('Token inválido o sesión no encontrada');
    }

    // Verifica que el token no haya expirado
    if (new Date() > new Date(session.token_expires_at)) {
      throw new BadRequestException('El link de confirmación ha expirado');
    }

    const { data, error: updateError } = await this.supabase.db
      .from('sessions')
      .update({ confirmed_by_guardian: dto.confirmed })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw new BadRequestException(updateError.message);
    return data;
  }

  // ── DELETE ───────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.supabase.db
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Sesión eliminada correctamente' };
  }

  // ── CANCEL ───────────────────────────────────────────────────
async cancel(id: string, reason: string) {
  await this.findOne(id);

  const { data, error } = await this.supabase.db
    .from('sessions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);
  return data;
}

// ── RESCHEDULE ───────────────────────────────────────────────
async reschedule(id: string, dto: CreateSessionDto) {
  const original = await this.findOne(id);

  // Verificar límite de reprogramaciones
  if (original.reschedule_count >= 2) {
    throw new BadRequestException(
      'Esta sesión ya fue reprogramada el máximo de 2 veces permitidas'
    );
  }

  // Cancelar la sesión original (libera su cupo antes de validar el nuevo)
  await this.supabase.db
    .from('sessions')
    .update({ status: 'cancelled', cancellation_reason: dto.cancellation_reason ?? 'usuario' })
    .eq('id', id);

  if (dto.plan_id) {
    await this.validatePlanCapacity(dto.plan_id);
    await this.validatePlanHasPayment(dto.plan_id);
  }

  // Crear nueva sesión con referencia a la original
  const confirmation_token = uuidv4();
  const token_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data, error } = await this.supabase.db
    .from('sessions')
    .insert({
      plan_id:               dto.plan_id,
      trainer_id:            dto.trainer_id,
      athlete_id:            dto.athlete_id,
      session_date:          dto.session_date,
      session_time:          dto.session_time,
      location:              dto.location,
      session_name:          dto.session_name ?? null,
      status:                'pending',
      trainer_notes:         dto.trainer_notes ?? null,
      confirmed_by_trainer:  false,
      confirmed_by_guardian: false,
      confirmation_token,
      token_expires_at,
      rescheduled_from:      id,
      reschedule_count:      original.reschedule_count + 1,
    })
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);
  return data;
}
}
