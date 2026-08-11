import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AthletesService } from '../../../core/services/athletes.service';
import { TrainersService, Trainer } from '../../../core/services/trainers.service';
import { PlansService } from '../../../core/services/plans.service';
import { SessionsService } from '../../../core/services/sessions.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-athlete-form',
  imports: [FormsModule],
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
  private sessions  = inject(SessionsService);
  private auth      = inject(AuthService);
  private toast     = inject(ToastService);

  isEdit   = signal(false);
  loading  = signal(false);
  saving   = signal(false);
  error    = signal('');

  role    = this.auth.getRole() ?? '';
  isAdmin = this.role === 'super_admin' || this.role === 'admin';

  trainersList = signal<Trainer[]>([]);

  // Plan control
  activePlan      = signal<any>(null);
  hasSessions     = signal(false);
  canEditPlan     = computed(() => !this.isEdit() || (this.isEdit() && this.activePlan() && !this.hasSessions()));
  planDisabledMessage = 'Este deportista ya tiene sesiones registradas. Para cambiar el plan, cancela el plan actual desde el módulo de planes.';

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

  form = signal({
    first_name: '',
    last_name:  '',
    birth_date: '',
    gender:     '',
    status:     'trial',
    notes:      '',
    trainer_id: '',
    // Campos de plan (opcionales)
    plan_type:       '',
    total_sessions:  '',
    start_date:      '',
  });

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

      // Cargar deportista, plan y sesiones en paralelo
      forkJoin({
        athlete: this.service.getOne(id),
        plans: this.plans.getByAthlete(id),
        sessions: this.sessions.getAll(id),
      }).subscribe({
        next: ({ athlete, plans, sessions }) => {
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

          const active = plans.find(p => p.is_active);
          if (active) {
            this.activePlan.set(active);
            this.form.update(f => ({
              ...f,
              plan_type:      active.plan_type,
              total_sessions: active.total_sessions.toString(),
              start_date:     active.start_date,
            }));
          }

          this.hasSessions.set(sessions.length > 0);
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

  onSubmit() {
    const f = this.form();

    if (!f.first_name || !f.last_name || !f.birth_date || !f.gender) {
      this.error.set('Nombre, apellido, fecha de nacimiento y género son obligatorios');
      return;
    }

    if (this.isAdmin && !f.trainer_id) {
      this.error.set('El entrenador es obligatorio');
      return;
    }

    // Validar campos de plan si al menos uno está lleno
    const hasPlanData = f.plan_type || f.total_sessions || f.start_date;
    if (hasPlanData && (!f.plan_type || !f.total_sessions || !f.start_date)) {
      this.error.set('Si ingresa datos de plan, debe completar tipo, sesiones y fecha de inicio');
      return;
    }

    this.saving.set(true);
    this.error.set('');

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
        // Crear plan si es nuevo y hay datos
        if (!this.isEdit() && hasPlanData) {
          this.createPlan(athlete.id);
        }
        // Actualizar plan si está editando, tiene plan y puede editarlo
        else if (this.isEdit() && this.activePlan() && !this.hasSessions() && hasPlanData) {
          this.updatePlan(athlete.id);
        }
        // Solo guardar deportista
        else {
          this.toast.success(
            this.isEdit() ? 'Deportista actualizado correctamente' : 'Deportista creado correctamente'
          );
          setTimeout(() => this.router.navigate(['/deportistas', athlete.id]), 500);
        }
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error al guardar. Intenta de nuevo.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.saving.set(false);
      },
    });
  }

  private createPlan(athleteId: string) {
    const f = this.form();
    const planData = {
      athlete_id:     athleteId,
      plan_type:      f.plan_type,
      total_sessions: parseInt(f.total_sessions, 10),
      start_date:     f.start_date,
      is_active:      true,
    };

    this.plans.create(planData).subscribe({
      next: () => {
        this.toast.success('Deportista y plan creados correctamente');
        setTimeout(() => this.router.navigate(['/deportistas', athleteId]), 500);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al crear el plan. El deportista fue creado correctamente.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.saving.set(false);
      },
    });
  }

  private updatePlan(athleteId: string) {
    const f = this.form();
    const planData = {
      plan_type:      f.plan_type,
      total_sessions: parseInt(f.total_sessions, 10),
      start_date:     f.start_date,
    };

    this.plans.update(this.activePlan()!.id, planData).subscribe({
      next: () => {
        this.toast.success('Deportista y plan actualizados correctamente');
        setTimeout(() => this.router.navigate(['/deportistas', athleteId]), 500);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al actualizar el plan. El deportista fue actualizado correctamente.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.saving.set(false);
      },
    });
  }

  goBack() { this.location.back(); }
}
