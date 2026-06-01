import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PlansService, PLAN_TYPES } from '../../../core/services/plans.service';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-plan-form',
  imports: [],
  templateUrl: './plan-form.html',
  styleUrl: './plan-form.scss',
})
export class PlanForm implements OnInit {
  private svc      = inject(PlansService);
  private athletes = inject(AthletesService);
  private router   = inject(Router);
  private route    = inject(ActivatedRoute);
  private toast    = inject(ToastService);

  planTypes  = PLAN_TYPES;
  athleteList = signal<Athlete[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  isEdit     = false;
  planId     = '';

  // Form fields
  athleteId      = signal('');
  planType       = signal('');
  totalSessions  = signal('');
  startDate      = signal('');

  // Prefill from query param (coming from athlete detail)
  prefillAthleteId = '';

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.prefillAthleteId = params.get('athlete_id') ?? '';

    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    if (id) this.planId = id;

    this.athletes.getAll().subscribe({
      next: (list) => {
        this.athleteList.set(list.sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        ));
        if (this.prefillAthleteId) this.athleteId.set(this.prefillAthleteId);
        if (this.isEdit) this.loadPlan();
        else this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadPlan() {
    this.svc.getOne(this.planId).subscribe({
      next: (plan) => {
        this.athleteId.set(plan.athlete_id);
        this.planType.set(plan.plan_type);
        this.totalSessions.set(String(plan.total_sessions));
        this.startDate.set(plan.start_date);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('No se pudo cargar el plan');
        this.goBack();
      },
    });
  }

  isValid(): boolean {
    return !!(this.athleteId() && this.planType() && parseInt(this.totalSessions()) > 0 && this.startDate());
  }

  save() {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);

    const req$ = this.isEdit
      ? this.svc.update(this.planId, {
          plan_type:      this.planType(),
          total_sessions: parseInt(this.totalSessions()),
          start_date:     this.startDate(),
        })
      : this.svc.create({
          athlete_id:     this.athleteId(),
          plan_type:      this.planType(),
          total_sessions: parseInt(this.totalSessions()),
          start_date:     this.startDate(),
        });

    req$.subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Plan actualizado' : 'Plan creado correctamente');
        this.goBack();
      },
      error: () => {
        this.toast.error('Error al guardar el plan');
        this.saving.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/planes']);
  }
}
