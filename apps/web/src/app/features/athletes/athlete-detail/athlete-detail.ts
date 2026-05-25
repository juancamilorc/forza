import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { PlansService, Plan } from '../../../core/services/plans.service';
import { SessionsService, Session } from '../../../core/services/sessions.service';
import { AuthService } from '../../../core/services/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-athlete-detail',
  imports: [DatePipe],
  templateUrl: './athlete-detail.html',
  styleUrl: './athlete-detail.scss',
})
export class AthleteDetail implements OnInit {
  private route           = inject(ActivatedRoute);
  private router          = inject(Router);
  private service         = inject(AthletesService);
  private plansService    = inject(PlansService);
  private sessionsService = inject(SessionsService);
  private auth            = inject(AuthService);

  athlete          = signal<Athlete | null>(null);
  activePlan       = signal<Plan | null>(null);
  sessions         = signal<Session[]>([]);
  loading          = signal(true);
  loadingPlan      = signal(true);
  loadingSessions  = signal(true);
  role             = this.auth.getRole() ?? '';

  completedSessions = computed(() =>
    this.sessions().filter(s =>
      s.status === 'completed' && s.plan_id === this.activePlan()?.id
    ).length
  );

  remainingSessions = computed(() => {
    const plan = this.activePlan();
    if (!plan) return null;
    return Math.max(0, plan.total_sessions - this.completedSessions());
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.service.getOne(id).subscribe({
      next: (data) => {
        this.athlete.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/athletes']);
      },
    });

    this.plansService.getByAthlete(id).subscribe({
      next: (plans) => {
        const active = plans.find(p => p.is_active) ?? null;
        this.activePlan.set(active);
        this.loadingPlan.set(false);
      },
      error: () => this.loadingPlan.set(false),
    });

    this.sessionsService.getAll(id).subscribe({
      next: (data) => {
        this.sessions.set(data.slice(0, 10));
        this.loadingSessions.set(false);
      },
      error: () => this.loadingSessions.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/athletes']);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active:   'Activo',
      inactive: 'Inactivo',
      trial:    'Prueba',
    };
    return labels[status] ?? status;
  }

  getPlanLabel(type: string): string {
    return this.plansService.getPlanLabel(type);
  }

  getSessionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending:   'Pendiente',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return labels[status] ?? status;
  }

  getConfirmationLabel(status: string): string {
    const labels: Record<string, string> = {
      pending:           'Sin confirmar',
      partial:           'Parcial',
      trainer_confirmed: 'Entrenador ✓',
      guardian_confirmed:'Acudiente ✓',
      fully_confirmed:   'Confirmada',
      verified:          'Confirmada',
    };
    return labels[status] ?? status;
  }

  formatDate(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  }

  canEdit(): boolean {
    return ['super_admin', 'admin'].includes(this.role);
  }

  goToEdit() {
   this.router.navigate(['/athletes', this.athlete()!.id, 'edit']);
  }
}
