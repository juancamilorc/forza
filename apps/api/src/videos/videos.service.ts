import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateVideoDto, UpdateVideoDto } from '@forza/shared';

@Injectable()
export class VideosService {
  constructor(private supabase: SupabaseService) {}

  // ── GET ALL ──────────────────────────────────────────────────
  async findAll() {
    const { data, error } = await this.supabase.db
      .from('training_videos')
      .select(`
        *,
        users ( id, full_name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── GET ONE ──────────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('training_videos')
      .select(`
        *,
        users ( id, full_name )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Video ${id} no encontrado`);
    return data;
  }

  // ── CREATE ───────────────────────────────────────────────────
  async create(dto: CreateVideoDto) {
    const { data, error } = await this.supabase.db
      .from('training_videos')
      .insert({ ...dto })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── UPDATE ───────────────────────────────────────────────────
  async update(id: string, dto: UpdateVideoDto) {
    await this.findOne(id);

    const { data, error } = await this.supabase.db
      .from('training_videos')
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
      .from('training_videos')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Video eliminado correctamente' };
  }
}
