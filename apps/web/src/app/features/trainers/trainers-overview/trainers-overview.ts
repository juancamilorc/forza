import { Component, OnInit, inject, signal } from '@angular/core';
import { TrainersService, TrainerOverview } from '../../../core/services/trainers.service';
import { AuthService } from '../../../core/services/auth.service';
import { PlansService } from '../../../core/services/plans.service';

@Component({
  selector: 'app-trainers-overview',
  imports: [],
  templateUrl: './trainers-overview.html',
  styleUrl: './trainers-overview.scss',
})
export class TrainersOverview implements OnInit {
  private service = inject(TrainersService);
  private plans   = inject(PlansService);
  private auth    = inject(AuthService);

  role      = this.auth.getRole() ?? '';
  overview  = signal<TrainerOverview[]>([]);
  loading   = signal(true);

  ngOnInit() {
    this.service.getOverview().subscribe({
      next: (data) => { this.overview.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isTrainer(): boolean {
    return this.role === 'trainer';
  }

  getPlanLabel(type: string | null): string {
    return type ? this.plans.getPlanLabel(type) : '—';
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
}
