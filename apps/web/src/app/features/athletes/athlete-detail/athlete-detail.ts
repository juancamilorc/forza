import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { PlansService, Plan } from '../../../core/services/plans.service';
import { AuthService } from '../../../core/services/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-athlete-detail',
  imports: [DatePipe],
  templateUrl: './athlete-detail.html',
  styleUrl: './athlete-detail.scss',
})
export class AthleteDetail implements OnInit {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private service      = inject(AthletesService);
  private plansService = inject(PlansService);
  private auth         = inject(AuthService);

  athlete     = signal<Athlete | null>(null);
  activePlan  = signal<Plan | null>(null);
  loading     = signal(true);
  loadingPlan = signal(true);
  role        = this.auth.getRole() ?? '';

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

  canEdit(): boolean {
    return ['super_admin', 'admin'].includes(this.role);
  }

  goToEdit() {
   this.router.navigate(['/athletes', this.athlete()!.id, 'edit']);
  }
}
