import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

  isEdit   = signal(false);
  loading  = signal(false);
  saving   = signal(false);
  error    = signal('');

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

  ngOnInit() {
    this.athletes.getAll().subscribe({
      next: (data) => this.athletesList.set(data.filter(a => a.status === 'active')),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loading.set(true);
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
        error: () => this.router.navigate(['/payments']),
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

    const id = this.route.snapshot.paramMap.get('id');
    const request = id ? this.service.update(id, data) : this.service.create(data);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit() ? 'Pago actualizado correctamente' : 'Pago registrado correctamente');
        setTimeout(() => this.router.navigate(['/payments']), 500);
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

  goBack() {
    this.router.navigate(['/payments']);
  }
}
