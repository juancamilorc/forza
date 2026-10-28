import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAthleteDto } from '@forza/shared';
import { UpdateAthleteDto } from '@forza/shared';

@Injectable()
export class AthletesService {
  constructor(private supabase: SupabaseService) {}

  private calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  async getTrainerIdByUserId(userId: string): Promise<string | null> {
    const { data } = await this.supabase.db
      .from('trainers')
      .select('id')
      .eq('user_id', userId)
      .single();
    return data?.id ?? null;
  }

  async findAll(trainerId?: string) {
    let query = this.supabase.db
      .from('athletes')
      .select(`
        *,
        trainers (
          id,
          users ( full_name, email )
        ),
        guardians ( id, full_name, whatsapp_phone, is_primary )
      `)
      .order('created_at', { ascending: false });

    if (trainerId) {
      query = query.eq('trainer_id', trainerId);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    return data.map(athlete => ({
      ...athlete,
      age: this.calculateAge(athlete.birth_date),
    }));
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('athletes')
      .select(`
        *,
        trainers (
          id,
          users ( full_name, email, phone )
        ),
        guardians ( * ),     
        plans ( * )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Deportista ${id} no encontrado`);

    return {
      ...data,
      age: this.calculateAge(data.birth_date),
    };
  }

  async create(dto: CreateAthleteDto) {
    const { data, error } = await this.supabase.db
      .from('athletes')
      .insert({
        first_name: dto.first_name,
        last_name:  dto.last_name,
        birth_date: dto.birth_date,
        gender:     dto.gender,
        trainer_id: dto.trainer_id ?? null,
        status:     dto.status ?? 'trial',
        notes:      dto.notes ?? null,
        position:   dto.position ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return {
      ...data,
      age: this.calculateAge(data.birth_date),
    };
  }

  async update(id: string, dto: UpdateAthleteDto) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('athletes')
      .update({ ...dto })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return {
      ...data,
      age: this.calculateAge(data.birth_date),
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.supabase.db
      .from('athletes')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return { message: `Deportista eliminado correctamente` };
  }

  // ════════════════════════════════════════════════════════════
  // ESTADO DEL DEPORTISTA — banner de campos faltantes (FOR-69)
  // ════════════════════════════════════════════════════════════

  private static readonly EVAL_STALE_DAYS = 30;

  private daysSince(dateStr: string): number {
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const date = new Date(`${dateStr}T00:00:00Z`);
    return Math.floor((today.getTime() - date.getTime()) / 86_400_000);
  }

  private async lastEvaluationDate(table: string, athleteId: string): Promise<string | null> {
    const { data } = await this.supabase.db
      .from(table)
      .select('evaluation_date')
      .eq('athlete_id', athleteId)
      .order('evaluation_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.evaluation_date ?? null;
  }

  private evalStatus(lastDate: string | null) {
    if (lastDate === null) {
      return { last_date: null, days_since: null, overdue: true };
    }
    const daysSince = this.daysSince(lastDate);
    return { last_date: lastDate, days_since: daysSince, overdue: daysSince > AthletesService.EVAL_STALE_DAYS };
  }

  async getStatus(id: string) {
    const { data: athlete, error } = await this.supabase.db
      .from('athletes')
      .select('id, position')
      .eq('id', id)
      .single();
    if (error || !athlete) throw new NotFoundException(`Deportista ${id} no encontrado`);

    const { data: guardians } = await this.supabase.db
      .from('guardians')
      .select('id')
      .eq('athlete_id', id)
      .limit(1);

    const missingFields: { key: string; label: string }[] = [];
    if (!athlete.position) missingFields.push({ key: 'position', label: 'Posición' });
    if (!guardians || guardians.length === 0) {
      missingFields.push({ key: 'guardian', label: 'Acudiente' });
    }

    const [nutritional, technical, physical] = await Promise.all([
      this.lastEvaluationDate('nutritional_assessments', id),
      this.lastEvaluationDate('technical_assessments', id),
      this.lastEvaluationDate('physical_assessments', id),
    ]);

    const evaluations = {
      nutritional: this.evalStatus(nutritional),
      technical:   this.evalStatus(technical),
      physical:    this.evalStatus(physical),
    };

    return {
      missing_fields: missingFields,
      profile_incomplete: missingFields.length > 0,
      evaluations,
      evaluations_overdue:
        evaluations.nutritional.overdue || evaluations.technical.overdue || evaluations.physical.overdue,
    };
  }

  async changeStatus(id: string, status: string) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('athletes')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
