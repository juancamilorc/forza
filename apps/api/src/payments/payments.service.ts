import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePaymentDto, UpdatePaymentDto } from '@forza/shared';

@Injectable()
export class PaymentsService {
  constructor(private supabase: SupabaseService) {}

  // ── GET ALL ──────────────────────────────────────────────────
  async findAll(athleteId?: string) {
    let query = this.supabase.db
      .from('payments')
      .select(`
        *,
        athletes ( id, first_name, last_name ),
        plans ( id, plan_type )
      `)
      .order('created_at', { ascending: false });

    if (athleteId) query = query.eq('athlete_id', athleteId);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── GET ONE ──────────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('payments')
      .select(`
        *,
        athletes ( id, first_name, last_name ),
        plans ( id, plan_type )
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Pago ${id} no encontrado`);
    return data;
  }

  // ── CREATE ───────────────────────────────────────────────────
  private static readonly CUOTA_THRESHOLD = 450_000;

  async create(dto: CreatePaymentDto) {
    const { cuotas, ...paymentData } = dto;

    if (cuotas === 2) {
      if (paymentData.amount < PaymentsService.CUOTA_THRESHOLD) {
        throw new BadRequestException(
          `Solo se pueden crear cuotas para montos de $450.000 o más`,
        );
      }
      const cuotaAmount = paymentData.amount / 2;
      const [c1, c2] = await Promise.all([
        this.insertPayment({ ...paymentData, amount: cuotaAmount, cuota_numero: 1, cuotas_total: 2 }),
        this.insertPayment({ ...paymentData, amount: cuotaAmount, cuota_numero: 2, cuotas_total: 2 }),
      ]);
      return [c1, c2];
    }

    return this.insertPayment({ ...paymentData, cuotas_total: 1 });
  }

  private async insertPayment(
    data: Omit<CreatePaymentDto, 'cuotas'> & { cuotas_total: number },
  ) {
    const { cuotas: _ignored, ...insertData } = data as any;
    const amount_paid = insertData.amount_paid ?? 0;
    let status = insertData.status;

    if (!status) {
      if (amount_paid === 0)                  status = 'pendiente';
      else if (amount_paid < insertData.amount) status = 'parcial';
      else                                      status = 'pagado';
    }

    const { data: result, error } = await this.supabase.db
      .from('payments')
      .insert({ ...insertData, amount_paid, status })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return result;
  }

  // ── UPDATE ───────────────────────────────────────────────────
  async update(id: string, dto: UpdatePaymentDto) {
    const existing = await this.findOne(id);

    // Recalcular status si cambia amount_paid
    const amount_paid = dto.amount_paid ?? existing.amount_paid;
    const amount      = dto.amount      ?? existing.amount;
    let status        = dto.status;

    if (!status) {
      if (amount_paid === 0)        status = 'pendiente' as any;
      else if (amount_paid < amount) status = 'parcial' as any;
      else                           status = 'pagado' as any;
    }

    const { data, error } = await this.supabase.db
      .from('payments')
      .update({ ...dto, amount_paid, status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── ABONAR ───────────────────────────────────────────────────
  async addPayment(id: string, abono: number) {
    const existing = await this.findOne(id);

    const amount_paid = existing.amount_paid + abono;
    const status = amount_paid >= existing.amount ? 'pagado' : 'parcial';

    const { data, error } = await this.supabase.db
      .from('payments')
      .update({ amount_paid, status, payment_date: new Date().toISOString().split('T')[0] })
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
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Pago eliminado correctamente' };
  }
}
