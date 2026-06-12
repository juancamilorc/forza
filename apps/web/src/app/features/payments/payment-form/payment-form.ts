import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PaymentsService } from '../../../core/services/payments.service';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-payment-form',
  imports: [],
  templateUrl: './payment-form.html',
  styleUrl: './payment-form.scss',
})
export class PaymentForm implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private service  = inject(PaymentsService);
  private athletes = inject(AthletesService);
  private toast    = inject(ToastService);

  isEdit     = signal(false);
  loading    = signal(false);
  saving     = signal(false);
  error      = signal('');
  cuotasMode = signal(false);

  readonly showCuotas = computed(() => {
    const v = parseFloat(this.form().amount);
    return !isNaN(v) && v >= 450_000;
  });

  readonly cuotaAmount = computed(() => {
    const v = parseFloat(this.form().amount);
    return isNaN(v) ? 0 : v / 2;
  });

  athletesList = signal<Athlete[]>([]);

  form = signal({
    athlete_id:   '',
    plan_id:      '',
    amount:       '',
    amount_paid:  '0',
    due_date:     '',
    method:       '',
    referencia:   '',
    notes:        '',
  });

  constructor() {
    effect(() => { if (!this.showCuotas()) this.cuotasMode.set(false); });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // Modo edición: cargar todos los activos sin filtrar (el deportista ya existe)
      this.isEdit.set(true);
      this.loading.set(true);
      this.athletes.getAll().subscribe({
        next: (data) => this.athletesList.set(data.filter(a => a.status === 'active')),
      });
      this.service.getOne(id).subscribe({
        next: (p) => {
          this.form.set({
            athlete_id:  p.athlete_id,
            plan_id:     p.plan_id ?? '',
            amount:      String(p.amount),
            amount_paid: String(p.amount_paid),
            due_date:    p.due_date ?? '',
            method:      p.method ?? '',
            referencia:  p.referencia ?? '',
            notes:       p.notes ?? '',
          });
          this.loading.set(false);
        },
        error: () => this.router.navigate(['/pagos']),
      });
    } else {
      // Modo creación: ocultar deportistas que ya tienen todos los pagos en "pagado"
      forkJoin({
        athletes: this.athletes.getAll(),
        payments: this.service.getAll(),
      }).subscribe({
        next: ({ athletes, payments }) => {
          const active = athletes.filter(a => a.status === 'active');

          const byAthlete = new Map<string, { status: string }[]>();
          for (const p of payments) {
            if (!byAthlete.has(p.athlete_id)) byAthlete.set(p.athlete_id, []);
            byAthlete.get(p.athlete_id)!.push(p);
          }

          // Mostrar solo si: no tiene pagos aún, o tiene al menos uno sin pagar
          const available = active.filter(a => {
            const pms = byAthlete.get(a.id);
            if (!pms || pms.length === 0) return true;
            return pms.some(p => p.status !== 'pagado');
          });

          this.athletesList.set(available);
        },
      });
    }
  }

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  onAthleteChange(athleteId: string) {
    this.form.update(f => ({ ...f, athlete_id: athleteId, plan_id: '' }));
    if (!athleteId) return;

    this.athletes.getOne(athleteId).subscribe({
      next: (athlete: any) => {
        const activePlan = athlete.plans?.find((p: any) => p.is_active);
        if (activePlan) this.form.update(f => ({ ...f, plan_id: activePlan.id }));
      },
    });
  }

  onSubmit() {
    const f = this.form();

    if (!f.athlete_id || !f.amount) {
      this.error.set('Deportista y monto total son obligatorios');
      return;
    }

    const amount      = parseFloat(f.amount);
    const amount_paid = parseFloat(f.amount_paid) || 0;

    if (isNaN(amount) || amount <= 0) {
      this.error.set('El monto total debe ser mayor a 0');
      return;
    }
    if (amount_paid > amount) {
      this.error.set('El monto pagado no puede superar el monto total');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const data: any = {
      athlete_id:  f.athlete_id,
      plan_id:     f.plan_id     || null,
      amount,
      amount_paid,
      due_date:    f.due_date    || null,
      method:      f.method      || null,
      referencia:  f.referencia  || null,
      notes:       f.notes       || null,
    };

    if (!this.isEdit() && this.cuotasMode()) data.cuotas = 2;

    const id = this.route.snapshot.paramMap.get('id');
    const request = id ? this.service.update(id, data) : this.service.create(data);

    request.subscribe({
      next: () => {
        const msg = this.isEdit()
          ? 'Pago actualizado correctamente'
          : this.cuotasMode()
            ? '2 cuotas registradas correctamente'
            : 'Pago registrado correctamente';
        this.toast.success(msg);
        setTimeout(() => this.router.navigate(['/pagos']), 500);
      },
      error: () => {
        this.error.set('Error al guardar. Intenta de nuevo.');
        this.saving.set(false);
      },
    });
  }

  showReferencia(): boolean {
    return this.form().method === 'transferencia';
  }

  formatCOP(value: number): string {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  }

  goBack() {
    this.router.navigate(['/pagos']);
  }
}
