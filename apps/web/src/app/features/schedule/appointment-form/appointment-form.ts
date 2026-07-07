import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ScheduleService, TrainerOption } from '../../../core/services/schedule.service';
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
  private location = inject(Location);
  private service  = inject(ScheduleService);
  private auth     = inject(AuthService);
  private toast    = inject(ToastService);

  isEdit   = signal(false);
  loading  = signal(false);
  saving   = signal(false);
  error    = signal('');

  role      = this.auth.getRole() ?? '';
  isAdmin   = this.role === 'super_admin' || this.role === 'admin';

  trainersList = signal<TrainerOption[]>([]);

  form = signal({
    trainer_id:     '',
    status:         'scheduled',
    scheduled_date: '',
    scheduled_time: '',
    location:       '',
    notes:          '',
  });

  ngOnInit() {
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
            status:         a.status,
            scheduled_date: a.scheduled_date,
            scheduled_time: a.scheduled_time.slice(0, 5),
            location:       a.location ?? '',
            notes:          a.notes ?? '',
          });
          this.loading.set(false);
        },
        error: () => this.router.navigate(['/agenda']),
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

    this.saving.set(true);
    this.error.set('');

    const data: any = {
      type:           'regular',
      scheduled_date: f.scheduled_date,
      scheduled_time: f.scheduled_time,
      location:       f.location || null,
      notes:          f.notes    || null,
    };

    if (this.isAdmin) data.trainer_id = f.trainer_id;
    if (this.isEdit()) data.status = f.status;

    const id = this.route.snapshot.paramMap.get('id');
    const request = id ? this.service.update(id, data) : this.service.create(data);

    request.subscribe({
      next: (saved) => {
        this.toast.success(this.isEdit() ? 'Reunión actualizada correctamente' : 'Reunión registrada correctamente');
        this.saving.set(false);
        setTimeout(() => this.router.navigate(['/agenda']), 500);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al guardar. Intenta de nuevo.');
        this.saving.set(false);
      },
    });
  }

  goBack() { this.location.back(); }
}
