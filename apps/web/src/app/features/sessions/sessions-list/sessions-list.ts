import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, SlicePipe } from '@angular/common';
import { SessionsService, Session } from '../../../core/services/sessions.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

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
  private toast   = inject(ToastService);

  sessions      = signal<Session[]>([]);
  filtered      = signal<Session[]>([]);
  loading       = signal(true);
  confirmingId  = signal<string | null>(null);
  role          = this.auth.getRole() ?? '';
  search        = signal('');
  filterStatus  = signal('all');

  // Cancelar sesión
  cancelTarget = signal<Session | null>(null);
  cancelReason = signal('');
  cancelSaving = signal(false);
  cancelReasons = [
    { value: 'cambio_climatico', label: 'Cambio climático' },
    { value: 'entrenador',       label: 'Entrenador no disponible' },
    { value: 'usuario',          label: 'Deportista / acudiente' },
  ];

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
    this.router.navigate(['/sesiones/nueva']);
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

  canConfirm(session: Session): boolean {
    if (session.status !== 'pending') return false;
    if (session.confirmed_by_trainer) return false;
    return ['super_admin', 'admin', 'trainer'].includes(this.role);
  }

  canCancel(session: Session): boolean {
    if (session.status !== 'pending') return false;
    return ['super_admin', 'admin', 'trainer'].includes(this.role);
  }

  openCancel(session: Session) {
    this.cancelTarget.set(session);
    this.cancelReason.set('');
  }

  closeCancel() {
    this.cancelTarget.set(null);
    this.cancelReason.set('');
  }

  confirmCancel() {
    const session = this.cancelTarget();
    const reason  = this.cancelReason();
    if (!session || !reason) return;

    this.cancelSaving.set(true);
    this.service.cancel(session.id, reason).subscribe({
      next: (updated) => {
        this.sessions.update(list => list.map(s => s.id === updated.id ? { ...s, ...updated } : s));
        this.applyFilters();
        this.toast.show('Sesión cancelada correctamente', 'success');
        this.cancelSaving.set(false);
        this.closeCancel();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al cancelar la sesión';
        this.toast.show(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
        this.cancelSaving.set(false);
      },
    });
  }

  confirmSession(id: string) {
    this.confirmingId.set(id);
    this.service.confirmTrainer(id).subscribe({
      next: () => {
        this.toast.show('Sesión confirmada correctamente', 'success');
        this.service.getAll().subscribe({
          next: (data) => {
            this.sessions.set(data);
            this.applyFilters();
            this.confirmingId.set(null);
          },
        });
      },
      error: () => {
        this.confirmingId.set(null);
        this.toast.show('Error al confirmar la sesión', 'error');
      },
    });
  }
}
