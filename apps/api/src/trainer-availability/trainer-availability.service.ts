import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAY_LABELS: Record<string, string> = {
  domingo: 'domingo', lunes: 'lunes', martes: 'martes', miercoles: 'miércoles',
  jueves: 'jueves', viernes: 'viernes', sabado: 'sábado',
};

const hhmm = (t: string) => String(t).slice(0, 5);
const plural = (label: string) => (label.endsWith('s') ? label : `${label}s`);

@Injectable()
export class TrainerAvailabilityService {
  constructor(private supabase: SupabaseService) {}

  // Valida que el entrenador atienda ese día y a esa hora. Un entrenador sin
  // disponibilidad configurada (NULL) no tiene restricción. `date` es YYYY-MM-DD
  // (o ISO) y se interpreta como fecha calendario, sin conversión de zona horaria.
  async assertAvailable(trainerId: string | null | undefined, date: string, time: string) {
    if (!trainerId || !date || !time) return;

    const { data: trainer } = await this.supabase.db
      .from('trainers')
      .select('available_days, available_hours_start, available_hours_end, users(full_name)')
      .eq('id', trainerId)
      .single();
    if (!trainer) return;

    const name = (trainer as any).users?.full_name ?? 'El entrenador';
    const dayKey = DAY_KEYS[new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay()];
    const days = trainer.available_days as string[] | null;

    if (days && days.length > 0 && !days.includes(dayKey)) {
      const disponibles = days.map(d => DAY_LABELS[d] ?? d).join(', ');
      throw new BadRequestException(
        `${name} no está disponible los ${plural(DAY_LABELS[dayKey])}. Días disponibles: ${disponibles}`,
      );
    }

    const start = trainer.available_hours_start ? hhmm(trainer.available_hours_start) : null;
    const end   = trainer.available_hours_end   ? hhmm(trainer.available_hours_end)   : null;
    const t     = hhmm(time);

    if ((start && t < start) || (end && t > end)) {
      const rango = start && end ? `de ${start} a ${end}` : start ? `desde las ${start}` : `hasta las ${end}`;
      throw new BadRequestException(`${name} solo está disponible ${rango}`);
    }
  }
}
