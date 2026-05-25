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

  sessions     = signal<Session[]>([]);
  filtered     = signal<Session[]>([]);
  loading      = signal(true);
  role         = this.auth.getRole() ?? '';
  search       = signal('');
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

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private applyFilters() {
    const term   = this.search();
    const status = this.filterStatus();

    this.filtered.set(
      this.sessions().filter(s => {
        const name   = this.normalize(`${s.athletes?.first_name ?? ''} ${s.athletes?.last_name ?? ''}`);
        const matchSearch = !term || name.includes(term);
        const matchStatus = status === 'all' || s.status === status;
        return matchSearch && matchStatus;
      })
    );
  }

  onSearch(event: Event) {
    this.search.set(this.normalize((event.target as HTMLInputElement).value));
    this.applyFilters();
  }

  applyFilter(status: string) {
    this.filterStatus.set(status);
    this.applyFilters();
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
      pending:            'Sin confirmar',
      partial:            'Parcial',
      trainer_confirmed:  'Entrenador ✓',
      guardian_confirmed: 'Acudiente ✓',
      fully_confirmed:    'Confirmada',
      verified:           'Confirmada',
    };
    return labels[status] ?? status;
  }

  getTrainerName(session: Session): string {
    return session.trainers?.users?.full_name ?? '—';
  }

  isAdminOrSuper(): boolean {
    return ['super_admin', 'admin'].includes(this.role);
  }

  canCreate(): boolean {
    return ['super_admin', 'admin', 'trainer'].includes(this.role);
  }
}
