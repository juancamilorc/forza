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
        trainer_id: dto.trainer_id ?? null,
        status:     dto.status ?? 'trial',
        notes:      dto.notes ?? null,
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
