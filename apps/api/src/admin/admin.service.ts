import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from '@forza/shared';
import { UpdateUserDto } from '@forza/shared';

@Injectable()
export class AdminService {
  constructor(private supabase: SupabaseService) {}

  // ── GET ALL USERS ────────────────────────────────────────────
  async findAll(role?: string) {
    let query = this.supabase.db
      .from('users')
      .select('id, email, full_name, role, phone, avatar_url, is_active, created_at')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── GET ONE USER ─────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('users')
      .select('id, email, full_name, role, phone, avatar_url, is_active, created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return data;
  }

  // ── CREATE USER ──────────────────────────────────────────────
  async create(dto: CreateUserDto) {
    // Pre-check: email duplicado antes de llamar a auth
    const { data: existing } = await this.supabase.db
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existing) throw new ConflictException('El email ya está registrado');

    // Paso 1 — crear en auth.users
    const { data: authData, error: authError } = await this.supabase.db.auth.admin.createUser({
      email:          dto.email,
      password:       dto.password,
      email_confirm:  true,
      user_metadata:  { full_name: dto.full_name, role: dto.role, phone: dto.phone ?? null },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('database error')) {
        throw new ConflictException('El email ya está registrado');
      }
      throw new BadRequestException(authError.message);
    }

    // Paso 2 — crear en public.users con el mismo id
    const { data, error } = await this.supabase.db
      .from('users')
      .insert({
        id:        authData.user.id,
        email:     dto.email,
        full_name: dto.full_name,
        role:      dto.role,
        phone:     dto.phone ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── UPDATE USER ──────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('users')
      .update({ ...dto })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── TOGGLE ACTIVE ────────────────────────────────────────────
  async toggleActive(id: string) {
    const user = await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getTrainers() {
    const { data, error } = await this.supabase.db
      .from('trainers')
      .select('id, user_id, users!inner(full_name, email, is_active)')
      .eq('users.is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getTrainerIdByUserId(userId: string): Promise<string | null> {
    const { data } = await this.supabase.db
      .from('trainers')
      .select('id')
      .eq('user_id', userId)
      .single();
    return data?.id ?? null;
  }

  // ════════════════════════════════════════════════════════════
  // VISTA ENTRENADORES — resumen de deportistas/clases (FOR-68)
  // ════════════════════════════════════════════════════════════

  private getWeekRange(): { start: string; end: string } {
    const now = new Date();
    const day = now.getUTCDay(); // 0=domingo..6=sábado
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    };
  }

  private daysUntil(dateStr: string): number {
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const target = new Date(`${dateStr}T00:00:00Z`);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  }

  async getTrainersOverview(trainerId?: string) {
    let trainerQuery = this.supabase.db
      .from('trainers')
      .select('id, user_id, users!inner(full_name, email, is_active)')
      .eq('users.is_active', true)
      .order('created_at', { ascending: true });

    if (trainerId) trainerQuery = trainerQuery.eq('id', trainerId);

    const { data: trainers, error: trainersError } = await trainerQuery;
    if (trainersError) throw new BadRequestException(trainersError.message);
    if (!trainers || trainers.length === 0) return [];

    const trainerIds = trainers.map((t: { id: string }) => t.id);

    const { data: athletes, error: athletesError } = await this.supabase.db
      .from('athletes')
      .select('id, first_name, last_name, status, trainer_id')
      .in('trainer_id', trainerIds);
    if (athletesError) throw new BadRequestException(athletesError.message);

    const athleteIds = (athletes ?? []).map((a: { id: string }) => a.id);

    const plans = athleteIds.length
      ? (
          await this.supabase.db
            .from('plans')
            .select('id, athlete_id, plan_type, total_sessions, end_date')
            .in('athlete_id', athleteIds)
            .eq('is_active', true)
        ).data ?? []
      : [];

    const planIds = plans.map((p: { id: string }) => p.id);

    const sessions = planIds.length
      ? (
          await this.supabase.db
            .from('sessions')
            .select('id, plan_id, status, session_date')
            .in('plan_id', planIds)
            .neq('status', 'cancelled')
        ).data ?? []
      : [];

    const unpaidPayments = athleteIds.length
      ? (
          await this.supabase.db
            .from('payments')
            .select('athlete_id')
            .in('athlete_id', athleteIds)
            .neq('status', 'pagado')
        ).data ?? []
      : [];

    const athletesWithDebt = new Set(
      unpaidPayments.map((p: { athlete_id: string }) => p.athlete_id),
    );
    const { start: weekStart, end: weekEnd } = this.getWeekRange();

    return trainers.map((trainer: any) => {
      const trainerAthletes = (athletes ?? []).filter(
        (a: { trainer_id: string }) => a.trainer_id === trainer.id,
      );

      const athleteSummaries = trainerAthletes.map((a: any) => {
        const plan = plans.find((p: any) => p.athlete_id === a.id);
        const athleteSessions = plan
          ? sessions.filter((s: any) => s.plan_id === plan.id)
          : [];
        const completedSessions = athleteSessions.filter(
          (s: any) => s.status === 'completed',
        ).length;
        const scheduledSessions = athleteSessions.length;
        const remainingSessions = plan
          ? Math.max(0, plan.total_sessions - scheduledSessions)
          : null;
        const daysUntilExpiry = plan ? this.daysUntil(plan.end_date) : null;

        return {
          athlete_id: a.id,
          name: `${a.first_name} ${a.last_name}`,
          status: a.status,
          plan_type: plan?.plan_type ?? null,
          total_sessions: plan?.total_sessions ?? null,
          completed_sessions: completedSessions,
          remaining_sessions: remainingSessions,
          plan_end_date: plan?.end_date ?? null,
          plan_expiring_soon:
            daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
          has_debt: athletesWithDebt.has(a.id),
        };
      });

      const trainerPlanIds = new Set(
        plans
          .filter((p: any) =>
            trainerAthletes.some((a: any) => a.id === p.athlete_id),
          )
          .map((p: any) => p.id),
      );
      const sessionsThisWeek = sessions.filter(
        (s: any) =>
          trainerPlanIds.has(s.plan_id) &&
          s.session_date >= weekStart &&
          s.session_date <= weekEnd,
      ).length;

      return {
        trainer_id: trainer.id,
        trainer_name: trainer.users.full_name,
        athletes_count: trainerAthletes.length,
        active_athletes_count: trainerAthletes.filter(
          (a: any) => a.status === 'active',
        ).length,
        active_plans_count: athleteSummaries.filter((a: any) => a.plan_type).length,
        sessions_this_week: sessionsThisWeek,
        athletes: athleteSummaries,
      };
    });
  }
}
