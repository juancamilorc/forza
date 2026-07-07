import { Component, inject, OnInit, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SessionsService, Session } from '../../../core/services/sessions.service';
import { ScheduleService, Appointment, TrainerOption } from '../../../core/services/schedule.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface CalEvent {
  id:                   string;
  eventType:            'session' | 'meeting';
  date:                 string;
  time:                 string;
  trainer_id:           string | null;
  athleteName:          string | null;
  trainerName:          string | null;
  status:               string;
  location:             string | null;
  confirmed_by_trainer?: boolean;
  confirmation_status?:  string;
  reschedule_count?:     number;
}

@Component({
  selector: 'app-schedule-list',
  imports: [],
  templateUrl: './schedule-list.html',
  styleUrl:    './schedule-list.scss',
})
export class ScheduleList implements OnInit {
  private sessionsService = inject(SessionsService);
  private scheduleService = inject(ScheduleService);
  private auth            = inject(AuthService);
  private router          = inject(Router);
  private toast           = inject(ToastService);

  events        = signal<CalEvent[]>([]);
  filtered      = signal<CalEvent[]>([]);
  trainers      = signal<TrainerOption[]>([]);
  loading       = signal(true);
  confirmingId  = signal<string | null>(null);
  statusFilter  = signal('');
  trainerFilter = signal('');
  typeFilter    = signal('');

  private platformId = inject(PLATFORM_ID);

  role           = this.auth.getRole() ?? '';
  isAdmin        = ['super_admin', 'admin'].includes(this.role);
  isSuperAdmin   = this.role === 'super_admin';
  isNutritionist = this.role === 'nutritionist';
  canCreate      = !this.isNutritionist;

  viewMode    = signal<'list' | 'calendar'>('calendar');
  selectedDay = signal<string | null>(null);

  constructor() {
    effect(() => {
      const day = this.selectedDay();
      if (day && isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          document.querySelector('.day-panel')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }
    });
  }

  // ── Calendario ────────────────────────────────────────────
  private _today = new Date();
  calYear  = signal(this._today.getFullYear());
  calMonth = signal(this._today.getMonth());

  calMonthLabel = computed(() =>
    new Date(this.calYear(), this.calMonth(), 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  );

  calDays = computed(() => {
    const year  = this.calYear();
    const month = this.calMonth();
    const evts  = this.filtered();

    const firstDay = new Date(year, month, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells  = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const todayStr    = this.toDateStr(this._today);

    return Array.from({ length: totalCells }, (_, i) => {
      const d    = new Date(year, month, 1 - startOffset + i);
      const date = this.toDateStr(d);
      return {
        date,
        day:     d.getDate(),
        inMonth: d.getMonth() === month,
        isToday: date === todayStr,
        events:  evts.filter(e => e.date === date)
          .sort((a, b) => a.time.localeCompare(b.time)),
      };
    });
  });

  dayEvents = computed(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this.filtered()
      .filter(e => e.date === day)
      .sort((a, b) => a.time.localeCompare(b.time));
  });

  private toDateStr(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  prevMonth() {
    if (this.calMonth() === 0) { this.calYear.update(y => y - 1); this.calMonth.set(11); }
    else { this.calMonth.update(m => m - 1); }
    this.selectedDay.set(null);
  }

  nextMonth() {
    if (this.calMonth() === 11) { this.calYear.update(y => y + 1); this.calMonth.set(0); }
    else { this.calMonth.update(m => m + 1); }
    this.selectedDay.set(null);
  }

  goToToday() {
    this.calYear.set(this._today.getFullYear());
    this.calMonth.set(this._today.getMonth());
    this.selectedDay.set(this.toDateStr(this._today));
  }

  selectDay(date: string) {
    this.selectedDay.set(this.selectedDay() === date ? null : date);
  }

  // ── Modales ───────────────────────────────────────────────
  rescheduleTarget = signal<CalEvent | null>(null);
  rescheduleDate   = signal('');
  rescheduleTime   = signal('');
  rescheduling     = signal(false);

  // ── Carga ─────────────────────────────────────────────────
  ngOnInit() {
    if (this.isAdmin) {
      this.scheduleService.getTrainers().subscribe({
        next: (t) => this.trainers.set(t),
      });
    }
    this.load();
  }

  load() {
    this.loading.set(true);
    forkJoin([
      this.sessionsService.getAll().pipe(catchError(() => of([] as Session[]))),
      this.scheduleService.getAll().pipe(catchError(() => of([] as Appointment[]))),
    ]).subscribe({
      next: ([sessions, meetings]) => {
        const evts = [
          ...this.normalizeSessions(sessions),
          ...this.normalizeMeetings(meetings),
        ].sort((a, b) =>
          a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
        );
        this.events.set(evts);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private normalizeSessions(sessions: Session[]): CalEvent[] {
    return sessions.map(s => ({
      id:                   s.id,
      eventType:            'session' as const,
      date:                 s.session_date,
      time:                 s.session_time,
      trainer_id:           s.trainer_id ?? null,
      athleteName:          s.athletes ? `${s.athletes.first_name} ${s.athletes.last_name}` : null,
      trainerName:          s.trainers?.users?.full_name ?? null,
      status:               s.status,
      location:             s.location,
      confirmed_by_trainer: s.confirmed_by_trainer,
      confirmation_status:  s.confirmation_status,
    }));
  }

  private normalizeMeetings(appts: Appointment[]): CalEvent[] {
    return appts.map(a => ({
      id:              a.id,
      eventType:       'meeting' as const,
      date:            a.scheduled_date,
      time:            a.scheduled_time,
      trainer_id:      a.trainer_id ?? null,
      athleteName:     null,
      trainerName:     a.trainers?.users?.full_name ?? null,
      status:          a.status,
      location:        a.location,
      reschedule_count: a.reschedule_count,
    }));
  }

  // ── Filtros ───────────────────────────────────────────────
  onStatusFilter(s: string)  { this.statusFilter.set(s);  this.applyFilters(); }
  onTrainerFilter(t: string) { this.trainerFilter.set(t); this.applyFilters(); }
  onTypeFilter(t: string)    { this.typeFilter.set(t);    this.applyFilters(); }

  applyFilters() {
    let result = this.events();
    const status  = this.statusFilter();
    const trainer = this.trainerFilter();
    const type    = this.typeFilter();

    if (type)    result = result.filter(e => e.eventType === type);
    if (trainer) result = result.filter(e => e.trainer_id === trainer);

    if (status === 'upcoming')   result = result.filter(e => e.status === 'pending' || e.status === 'scheduled');
    else if (status === 'completed') result = result.filter(e => e.status === 'completed');
    else if (status === 'cancelled') result = result.filter(e => e.status === 'cancelled');

    this.filtered.set(result);
  }

  // ── Confirmar sesión ──────────────────────────────────────
  canConfirm(e: CalEvent): boolean {
    return e.eventType === 'session' &&
           e.status === 'pending' &&
           !e.confirmed_by_trainer &&
           ['super_admin', 'admin', 'trainer'].includes(this.role);
  }

  confirmSession(id: string) {
    this.confirmingId.set(id);
    this.sessionsService.confirmTrainer(id).subscribe({
      next: () => {
        this.toast.success('Sesión confirmada');
        this.confirmingId.set(null);
        this.load();
      },
      error: () => {
        this.toast.error('Error al confirmar la sesión');
        this.confirmingId.set(null);
      },
    });
  }

  // ── Reprogramar reunión ───────────────────────────────────
  canReschedule(e: CalEvent): boolean {
    return e.eventType === 'meeting' &&
           e.status === 'scheduled' &&
           (e.reschedule_count ?? 0) < 2 &&
           !this.isNutritionist;
  }

  openReschedule(e: CalEvent) {
    this.rescheduleTarget.set(e);
    this.rescheduleDate.set(e.date);
    this.rescheduleTime.set(e.time.slice(0, 5));
  }

  closeReschedule() { this.rescheduleTarget.set(null); }

  confirmReschedule() {
    const target = this.rescheduleTarget();
    if (!target) return;
    this.rescheduling.set(true);
    this.scheduleService.reschedule(target.id, this.rescheduleDate(), this.rescheduleTime()).subscribe({
      next: () => {
        this.toast.success('Reunión reprogramada');
        this.rescheduling.set(false);
        this.closeReschedule();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Error al reprogramar');
        this.rescheduling.set(false);
      },
    });
  }

  // ── Navegación ────────────────────────────────────────────
  goToNew()            { this.router.navigate(['/agenda/nueva']); }
  goToEdit(id: string) { this.router.navigate(['/agenda', id, 'editar']); }

  // ── Helpers ───────────────────────────────────────────────
  getStatusLabel(e: CalEvent): string {
    if (e.eventType === 'session') {
      const labels: Record<string, string> = {
        pending:   'Pendiente',
        completed: 'Completada',
        cancelled: 'Cancelada',
      };
      return labels[e.status] ?? e.status;
    }
    const labels: Record<string, string> = {
      scheduled: 'Programada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show:   'No asistió',
    };
    return labels[e.status] ?? e.status;
  }

  getStatusClass(e: CalEvent): string {
    return e.status === 'pending' ? 'status-pending' : `status-${e.status}`;
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

  get sessionCount()  { return this.filtered().filter(e => e.eventType === 'session').length; }
  get meetingCount()  { return this.filtered().filter(e => e.eventType === 'meeting').length; }
}
