import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService, TrainerOption } from '../../../core/services/schedule.service';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-appointment-form',
  imports: [],
  templateUrl: './appointment-form.html',
  styleUrl:    './appointment-form.scss',
})
export class AppointmentForm implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private service  = inject(ScheduleService);
  private athletes = inject(AthletesService);
  private auth     = inject(AuthService);
  private toast    = inject(ToastService);

  isEdit       = signal(false);
  loading      = signal(false);
  saving       = signal(false);
  error        = signal('');
  calendarLink = signal('');

  role         = this.auth.getRole() ?? '';
  isAdmin      = this.role === 'super_admin' || this.role === 'admin';

  athletesList = signal<Athlete[]>([]);
  trainersList = signal<TrainerOption[]>([]);

  form = signal({
    trainer_id:     '',
    athlete_id:     '',
    type:           'regular',
    status:         'scheduled',
    scheduled_date: '',
    scheduled_time: '',
    location:       '',
    notes:          '',
  });

  ngOnInit() {
    this.athletes.getAll().subscribe({
      next: (data) => this.athletesList.set(data.filter(a => a.status === 'active')),
    });

    if (this.isAdmin) {
      this.service.getTrainers().subscribe({
        next: (t) => this.trainersList.set(t),
      });
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loading.set(true);
      this.service.getOne(id).subscribe({
        next: (a) => {
          this.form.set({
            trainer_id:     a.trainer_id,
            athlete_id:     a.athlete_id ?? '',
            type:           a.type,
            status:         a.status,
            scheduled_date: a.scheduled_date,
            scheduled_time: a.scheduled_time.slice(0, 5),
            location:       a.location ?? '',
            notes:          a.notes ?? '',
          });
          this.loading.set(false);
        },
        error: () => this.router.navigate(['/schedule']),
      });
    }
  }

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  onSubmit() {
    const f = this.form();

    if (!f.scheduled_date || !f.scheduled_time) {
      this.error.set('La fecha y hora son obligatorias');
      return;
    }
    if (this.isAdmin && !f.trainer_id) {
      this.error.set('Selecciona un entrenador');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const data: any = {
      athlete_id:     f.athlete_id     || null,
      type:           f.type,
      scheduled_date: f.scheduled_date,
      scheduled_time: f.scheduled_time,
      location:       f.location       || null,
      notes:          f.notes          || null,
    };

    if (this.isAdmin) data.trainer_id = f.trainer_id;
    if (this.isEdit()) data.status = f.status;

    const id = this.route.snapshot.paramMap.get('id');
    const request = id ? this.service.update(id, data) : this.service.create(data);

    request.subscribe({
      next: (saved) => {
        this.toast.success(this.isEdit() ? 'Cita actualizada correctamente' : 'Cita registrada correctamente');
        this.saving.set(false);
        setTimeout(() => this.router.navigate(['/schedule']), 500);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al guardar. Intenta de nuevo.');
        this.saving.set(false);
      },
    });
  }

  showReferencia(): boolean {
    return this.form().type === 'regular';
  }

  goBack() { this.router.navigate(['/schedule']); }
}
