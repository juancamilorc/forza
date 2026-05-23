import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ScheduleService, Appointment, TrainerOption } from '../../../core/services/schedule.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-schedule-list',
  imports: [],
  templateUrl: './schedule-list.html',
  styleUrl:    './schedule-list.scss',
})
export class ScheduleList implements OnInit {
  private service = inject(ScheduleService);
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private toast   = inject(ToastService);

  appointments  = signal<Appointment[]>([]);
  filtered      = signal<Appointment[]>([]);
  trainers      = signal<TrainerOption[]>([]);
  loading       = signal(true);
  statusFilter  = signal('');
  trainerFilter = signal('');

  role         = this.auth.getRole() ?? '';
  isAdmin      = this.role === 'super_admin' || this.role === 'admin';
  isSuperAdmin = this.role === 'super_admin';

  // Modal eliminar
  deleteTarget = signal<Appointment | null>(null);
  deleting     = signal(false);

  ngOnInit() {
    if (this.isAdmin) {
      this.service.getTrainers().subscribe({
        next: (t) => this.trainers.set(t),
      });
    }
    this.load();
  }

  load() {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.applyFilters();
  }

  onTrainerFilter(trainerId: string) {
    this.trainerFilter.set(trainerId);
    this.applyFilters();
  }

  applyFilters() {
    let result = this.appointments();
    const status  = this.statusFilter();
    const trainer = this.trainerFilter();
    if (status)  result = result.filter(a => a.status === status);
    if (trainer) result = result.filter(a => a.trainer_id === trainer);
    this.filtered.set(result);
  }

  getTrainerName(trainerId: string): string {
    const t = this.trainers().find(t => t.id === trainerId);
    return t?.users?.full_name ?? '—';
  }

  copyCalendarLink(a: Appointment) {
    const link = this.service.buildCalendarLink(a);
    navigator.clipboard.writeText(link).then(() => {
      this.toast.success('Link de Google Calendar copiado');
    });
  }

  openCalendarLink(a: Appointment) {
    window.open(this.service.buildCalendarLink(a), '_blank');
  }

  goToNew()       { this.router.navigate(['/schedule/new']); }
  goToEdit(id: string) { this.router.navigate(['/schedule', id, 'edit']); }

  openDelete(a: Appointment) { this.deleteTarget.set(a); }
  closeDelete()              { this.deleteTarget.set(null); }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    this.service.delete(target.id).subscribe({
      next: () => {
        this.appointments.update(list => list.filter(a => a.id !== target.id));
        this.applyFilters();
        this.toast.success('Cita eliminada correctamente');
        this.deleting.set(false);
        this.closeDelete();
      },
      error: () => {
        this.toast.error('Error al eliminar la cita');
        this.deleting.set(false);
      },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Programada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show:   'No asistió',
    };
    return labels[status] ?? status;
  }

  getTypeLabel(type: string): string {
    return type === 'trial' ? 'Prueba' : 'Regular';
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
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
}
