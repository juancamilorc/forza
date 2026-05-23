import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAppointmentDto } from '@forza/shared';
import { UpdateAppointmentDto } from '@forza/shared';

@Injectable()
export class ScheduleService {
  constructor(private supabase: SupabaseService) {}

  // ── GET ALL ──────────────────────────────────────────────────
  async findAll(trainerId?: string, date?: string) {
    let query = this.supabase.db
      .from('appointments')
      .select(`
        *,
        athletes ( id, first_name, last_name ),
        trainers ( id, users ( full_name ) )
      `)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (trainerId) query = query.eq('trainer_id', trainerId);
    if (date)      query = query.eq('scheduled_date', date);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── GET ONE ──────────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('appointments')
      .select(`
        *,
        athletes ( id, first_name, last_name ),
        trainers ( id, users ( full_name ) )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Cita ${id} no encontrada`);
    return data;
  }

  // ── CREATE ───────────────────────────────────────────────────
  async create(dto: CreateAppointmentDto) {
    const { data, error } = await this.supabase.db
      .from('appointments')
      .insert({
        trainer_id:     dto.trainer_id,
        athlete_id:     dto.athlete_id ?? null,
        type:           dto.type,
        status:         dto.status ?? 'scheduled',
        scheduled_date: dto.scheduled_date,
        scheduled_time: dto.scheduled_time,
        location:       dto.location ?? null,
        notes:          dto.notes ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── UPDATE ───────────────────────────────────────────────────
  async update(id: string, dto: UpdateAppointmentDto) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('appointments')
      .update({ ...dto })
      .eq('id', id)
      .select()
      .single();

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

  // ── DELETE ───────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.supabase.db
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Cita eliminada correctamente' };
  }
}
