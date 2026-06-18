import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private auth      = inject(AuthService);
  private dashboard = inject(DashboardService);
  private router    = inject(Router);

  user = this.auth.getCurrentUser();
  role = this.auth.getRole() ?? '';

  stats = signal<{
    athletes:        number;
    sessions:        number;
    assessments:     number;
    payments:        number;
    overduePayments: any[];
  }>({
    athletes:        0,
    sessions:        0,
    assessments:     0,
    payments:        0,
    overduePayments: [],
  });

  ngOnInit() {
    this.dashboard.getStats(this.role).subscribe({
      next: (data) => this.stats.set(data),
      error: (err)  => console.error('Error cargando stats:', err),
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  daysOverdue(dueDate: string): number {
    const diff = new Date().getTime() - new Date(dueDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  formatCOP(value: number): string {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  }
}
