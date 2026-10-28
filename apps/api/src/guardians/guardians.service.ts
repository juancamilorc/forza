import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGuardianDto, UpdateGuardianDto } from '@forza/shared';

@Injectable()
export class GuardiansService {
  constructor(private supabase: SupabaseService) {}

  async findAll(athleteId?: string) {
    let query = this.supabase.db
      .from('guardians')
      .select('*')
      .order('is_primary', { ascending: false });

    if (athleteId) query = query.eq('athlete_id', athleteId);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('guardians')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Acudiente ${id} no encontrado`);
    return data;
  }

  async create(dto: CreateGuardianDto) {
    const { data, error } = await this.supabase.db
      .from('guardians')
      .insert({
        athlete_id:     dto.athlete_id,
        full_name:      dto.full_name,
        whatsapp_phone: dto.whatsapp_phone,
        email:          dto.email ?? null,
        relationship:   dto.relationship ?? null,
        is_primary:     dto.is_primary ?? false,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdateGuardianDto) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('guardians')
      .update({ ...dto })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.supabase.db
      .from('guardians')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Acudiente eliminado correctamente' };
  }
}
