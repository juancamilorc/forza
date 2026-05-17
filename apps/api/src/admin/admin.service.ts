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
    // Paso 1 — crear en auth.users
    const { data: authData, error: authError } = await this.supabase.db.auth.admin.createUser({
      email:             dto.email,
      password:          dto.password,
      email_confirm:     true, // no requiere verificar email
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
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
      .select('id, user_id, users(full_name, email)')
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
