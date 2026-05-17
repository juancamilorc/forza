import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, SlicePipe } from '@angular/common';
import { SessionsService, Session } from '../../../core/services/sessions.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sessions-list',
  imports: [DatePipe, SlicePipe],
  templateUrl: './sessions-list.html',
  styleUrl: './sessions-list.scss',
})
export class SessionsList implements OnInit {
  private service = inject(SessionsService);
  private auth    = inject(AuthService);
  private router  = inject(Router);

  sessions  = signal<Session[]>([]);
  filtered  = signal<Session[]>([]);
  loading   = signal(true);
  role      = this.auth.getRole() ?? '';

  filterStatus = signal('all');

  ngOnInit() {
    this.service.getAll().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.filtered.set([...data]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(status: string) {
    this.filterStatus.set(status);
    if (status === 'all') {
      this.filtered.set(this.sessions());
    } else {
      this.filtered.set(this.sessions().filter(s => s.status === status));
    }
  }

  goToNew() {
    this.router.navigate(['/sessions/new']);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending:   'Pendiente',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return labels[status] ?? status;
  }

  getConfirmationLabel(status: string): string {
    const labels: Record<string, string> = {
      pending:  'Sin confirmar',
      partial:  'Parcial',
      verified: 'Verificada',
      conflict: 'Conflicto',
    };
    return labels[status] ?? status;
  }

  canCreate(): boolean {
    return ['super_admin', 'admin', 'trainer'].includes(this.role);
  }
}
