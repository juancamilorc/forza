import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AthletesService } from '../../../core/services/athletes.service';
import { TrainersService, Trainer } from '../../../core/services/trainers.service';
import { PlansService, Plan } from '../../../core/services/plans.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-athlete-form',
  imports: [FormsModule, DatePipe],
  templateUrl: './athlete-form.html',
  styleUrl: './athlete-form.scss',
})
export class AthleteForm implements OnInit {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private location  = inject(Location);
  private service   = inject(AthletesService);
  private trainers  = inject(TrainersService);
  private plans     = inject(PlansService);
  private payments  = inject(PaymentsService);
  private auth      = inject(AuthService);
  private toast     = inject(ToastService);

  isEdit   = signal(false);
  loading  = signal(false);
  saving   = signal(false);
  error    = signal('');

  @ViewChild('errorBanner') errorBanner?: ElementRef;

  role    = this.auth.getRole() ?? '';
  isAdmin = this.role === 'super_admin' || this.role === 'admin';

  trainersList = signal<Trainer[]>([]);

  // Plan activo del deportista (solo lectura en modo edición; se gestiona
  // desde el módulo /planes).
  activePlan = signal<Plan | null>(null);

  planTypes = [
    { value: 'momentum', label: 'Momentum' },
    { value: 'momentum_pro', label: 'Momentum Pro' },
    { value: 'master', label: 'Master' },
    { value: 'master_pro', label: 'Master Pro' },
    { value: 'frz', label: 'FRZ' },
    { value: 'frz_pro', label: 'FRZ Pro' },
    { value: 'elite', label: 'Elite' },
    { value: 'elite_pro', label: 'Elite Pro' },
    { value: 'addicted_to_football', label: 'Addicted to Football' },
  ];

  // Pago inicial (solo al crear, junto con el plan) — FOR-61
  paymentEnabled = signal(false);

  paymentMethods = [
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'efectivo',      label: 'Efectivo' },
    { value: 'otro',          label: 'Otro' },
  ];

  form = signal({
    first_name: '',
    last_name:  '',
    birth_date: '',
    gender:     '',
    status:     'trial',
    notes:      '',
    trainer_id: '',
    // Campos de plan (solo al crear)
    plan_type:       '',
    total_sessions:  '',
    start_date:      '',
    // Pago inicial (solo al crear) — FOR-61
    payment_amount:      '',
    payment_amount_paid: '',
    payment_due_date:    '',
    payment_method:      '',
    payment_reference:   '',
  });

  togglePayment(enabled: boolean) {
    this.paymentEnabled.set(enabled);
    // Al activar, sugerir la fecha de inicio del plan como vencimiento
    if (enabled && !this.form().payment_due_date && this.form().start_date) {
      this.form.update(f => ({ ...f, payment_due_date: f.start_date }));
    }
  }

  ngOnInit() {
    if (this.isAdmin) {
      this.trainers.getAll().subscribe({
        next: (data) => this.trainersList.set(data),
      });
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loading.set(true);

      // En edición se cargan los datos del deportista y su plan activo. El plan
      // se muestra en solo lectura: se gestiona desde el módulo /planes
      // (activar, congelar, cancelar, extender).
      forkJoin({
        athlete: this.service.getOne(id),
        plans:   this.plans.getByAthlete(id),
      }).subscribe({
        next: ({ athlete, plans }) => {
          this.form.update(f => ({
            ...f,
            first_name: athlete.first_name,
            last_name:  athlete.last_name,
            birth_date: athlete.birth_date,
            gender:     athlete.gender ?? '',
            status:     athlete.status,
            notes:      athlete.notes ?? '',
            trainer_id: athlete.trainer_id ?? '',
          }));
          this.activePlan.set(plans.find(p => p.is_active) ?? null);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/deportistas']);
        },
      });
    }
  }

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  private setError(message: string) {
    this.error.set(message);
    setTimeout(() => {
      this.errorBanner?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  onSubmit() {
    const f = this.form();

    if (!f.first_name || !f.last_name || !f.birth_date || !f.gender) {
      this.setError('Nombre, apellido, fecha de nacimiento y género son obligatorios');
      return;
    }

    // El entrenador es opcional: el admin puede crear un deportista sin
    // entrenador asignado (ej: casos de prueba). Se envía como null si va vacío.

    // Validar campos de plan si al menos uno está lleno (solo al crear)
    const hasPlanData = !this.isEdit() && (f.plan_type || f.total_sessions || f.start_date);
    if (hasPlanData && (!f.plan_type || !f.total_sessions || !f.start_date)) {
      this.setError('Si ingresa datos de plan, debe completar tipo, sesiones y fecha de inicio');
      return;
    }

    // Validar pago inicial (FOR-61) — requiere un plan al que asociarlo
    const wantsPayment = !this.isEdit() && this.paymentEnabled();
    if (wantsPayment) {
      if (!hasPlanData) {
        this.setError('El pago inicial requiere un plan. Completa los datos del plan.');
        return;
      }
      const amt  = parseFloat(f.payment_amount);
      const paid = parseFloat(f.payment_amount_paid) || 0;
      if (isNaN(amt) || amt <= 0) {
        this.setError('El monto del plan (pago inicial) debe ser mayor a 0');
        return;
      }
      if (paid > amt) {
        this.setError('El monto abonado no puede superar el monto del plan');
        return;
      }
    }

    this.saving.set(true);
    this.setError('');

    const id = this.route.snapshot.paramMap.get('id');
    const athleteData: any = {
      first_name: f.first_name,
      last_name:  f.last_name,
      birth_date: f.birth_date,
      gender:     f.gender,
      status:     f.status,
      notes:      f.notes || null,
    };

    // Solo incluir trainer_id si es admin
    if (this.isAdmin) {
      athleteData.trainer_id = f.trainer_id || null;
    }

    const request = id
      ? this.service.update(id, athleteData)
      : this.service.create(athleteData);

    request.subscribe({
      next: (athlete) => {
        if (!this.isEdit() && hasPlanData) {
          this.createPlan(athlete.id, wantsPayment);
        } else {
          this.finish(athlete.id, this.isEdit() ? 'Deportista actualizado correctamente' : 'Deportista creado correctamente');
        }
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error al guardar. Intenta de nuevo.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.saving.set(false);
      },
    });
  }

  private createPlan(athleteId: string, withPayment: boolean) {
    const f = this.form();
    const planData = {
      athlete_id:     athleteId,
      plan_type:      f.plan_type,
      total_sessions: parseInt(f.total_sessions, 10),
      start_date:     f.start_date,
      is_active:      true,
    };

    this.plans.create(planData).subscribe({
      next: (plan) => {
        if (withPayment) {
          this.createPayment(athleteId, plan.id);
        } else {
          this.finish(athleteId, 'Deportista y plan creados correctamente');
        }
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al crear el plan. El deportista fue creado correctamente.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.saving.set(false);
      },
    });
  }

  private createPayment(athleteId: string, planId: string) {
    const f = this.form();
    const paymentData: any = {
      athlete_id:  athleteId,
      plan_id:     planId,
      amount:      parseFloat(f.payment_amount),
      amount_paid: parseFloat(f.payment_amount_paid) || 0,
      // Sin fecha explícita, vence el día de inicio del plan (regla "no hay
      // clases sin pago"): así el saldo pendiente entra al widget de vencidos.
      due_date:    f.payment_due_date || f.start_date || null,
      method:      f.payment_method    || null,
      referencia:  f.payment_reference || null,
    };

    this.payments.create(paymentData).subscribe({
      next: () => this.finish(athleteId, 'Deportista, plan y pago inicial creados correctamente'),
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al registrar el pago. El deportista y el plan fueron creados.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.saving.set(false);
      },
    });
  }

  private finish(athleteId: string, message: string) {
    this.toast.success(message);
    setTimeout(() => this.router.navigate(['/deportistas', athleteId]), 500);
  }

  planLabel(type: string): string { return this.plans.getPlanLabel(type); }

  goToPlans() { this.router.navigate(['/planes']); }

  goBack() { this.location.back(); }
}
