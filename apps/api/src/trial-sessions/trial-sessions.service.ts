import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateTrialSessionDto,
  UpdateTrialSessionDto,
  ConvertTrialSessionDto,
} from '@forza/shared';

export const TRIAL_PRICE = 35000;

const SELECT_WITH_TRAINER = '*, trainer:trainers(id, users(full_name))';

@Injectable()
export class TrialSessionsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(status?: string) {
    let query = this.supabase.db
      .from('trial_sessions')
      .select(SELECT_WITH_TRAINER)
      .order('trial_date', { ascending: true })
      .order('trial_time', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return { price: TRIAL_PRICE, items: data };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('trial_sessions')
      .select(SELECT_WITH_TRAINER)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Clase de prueba ${id} no encontrada`);
    return data;
  }

  async create(dto: CreateTrialSessionDto) {
    const { data, error } = await this.supabase.db
      .from('trial_sessions')
      .insert({
        ...dto,
        status: 'programada',
        payment_status: 'pendiente',
        amount_paid: 0,
      })
      .select(SELECT_WITH_TRAINER)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdateTrialSessionDto) {
    const existing = await this.findOne(id);
    if (existing.status === 'cancelada') {
      throw new BadRequestException('No se puede editar una clase de prueba cancelada');
    }
    if (existing.converted_to_athlete_id) {
      throw new BadRequestException('Esta clase de prueba ya fue convertida en deportista');
    }

    const { data, error } = await this.supabase.db
      .from('trial_sessions')
      .update(dto)
      .eq('id', id)
      .select(SELECT_WITH_TRAINER)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async cancel(id: string) {
    const existing = await this.findOne(id);
    if (existing.status === 'cancelada') {
      throw new BadRequestException('La clase de prueba ya está cancelada');
    }

    const { data, error } = await this.supabase.db
      .from('trial_sessions')
      .update({ status: 'cancelada' })
      .eq('id', id)
      .select(SELECT_WITH_TRAINER)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async markPaid(id: string) {
    const existing = await this.findOne(id);
    if (existing.payment_status === 'pagado') {
      throw new BadRequestException('La clase de prueba ya está pagada');
    }

    const { data, error } = await this.supabase.db
      .from('trial_sessions')
      .update({ payment_status: 'pagado', amount_paid: TRIAL_PRICE })
      .eq('id', id)
      .select(SELECT_WITH_TRAINER)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Migra la clase de prueba al módulo principal: crea deportista + acudiente.
  async convert(id: string, dto: ConvertTrialSessionDto) {
    const trial = await this.findOne(id);
    if (trial.converted_to_athlete_id) {
      throw new BadRequestException('Esta clase de prueba ya fue convertida en deportista');
    }

    const { data: athlete, error: athleteError } = await this.supabase.db
      .from('athletes')
      .insert({
        first_name: dto.first_name,
        last_name: dto.last_name,
        birth_date: dto.birth_date,
        gender: dto.gender,
        trainer_id: dto.trainer_id ?? trial.trainer_id ?? null,
        status: 'active',
      })
      .select()
      .single();
    if (athleteError) throw new BadRequestException(athleteError.message);

    const { error: guardianError } = await this.supabase.db
      .from('guardians')
      .insert({
        athlete_id: athlete.id,
        full_name: trial.guardian_name,
        whatsapp_phone: trial.guardian_whatsapp,
        email: trial.guardian_email ?? null,
        is_primary: true,
      });
    if (guardianError) throw new BadRequestException(guardianError.message);

    const { error: linkError } = await this.supabase.db
      .from('trial_sessions')
      .update({ converted_to_athlete_id: athlete.id })
      .eq('id', id);
    if (linkError) throw new BadRequestException(linkError.message);

    return athlete;
  }

  // No envía nada: arma el link wa.me con el mensaje listo para que el admin lo mande.
  async whatsappLink(id: string) {
    const t = await this.findOne(id);

    let phone = String(t.guardian_whatsapp).replace(/\D/g, '');
    if (phone.length === 10 && phone.startsWith('3')) phone = `57${phone}`;

    const fechaRaw = new Date(`${t.trial_date}T00:00:00`).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    const fecha = fechaRaw.charAt(0).toUpperCase() + fechaRaw.slice(1);

    const [hh, mm] = String(t.trial_time).split(':').map(Number);
    const hora = `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;

    const trainerName = t.trainer?.users?.full_name;
    const valor = TRIAL_PRICE.toLocaleString('es-CO');

    const lines = [
      `Hola ${t.guardian_name} 👋`,
      '',
      `Te confirmamos la clase de prueba de *${t.child_name}* en *FORZA* ⚽`,
      '',
      `📅 *Fecha:* ${fecha}`,
      `🕘 *Hora:* ${hora}`,
      ...(t.location ? [`📍 *Lugar:* ${t.location}`] : []),
      ...(trainerName ? [`👤 *Entrenador:* ${trainerName}`] : []),
      t.payment_status === 'pagado' ? '✅ *Pago:* recibido' : `💰 *Valor:* $${valor}`,
      '',
      '¡Los esperamos! 💪',
    ];
    const message = lines.join('\n');

    return { url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`, message };
  }
}
