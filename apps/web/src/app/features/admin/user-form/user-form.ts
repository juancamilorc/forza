import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { ToastService } from '../../../core/services/toast.service';
import { TrainersService } from '../../../core/services/trainers.service';
import { WEEK_DAYS } from '../../../core/utils/trainer-availability';

@Component({
  selector: 'app-user-form',
  imports: [],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private location = inject(Location);
  private service = inject(AdminUsersService);
  private toast   = inject(ToastService);
  private trainersApi = inject(TrainersService);

  isEdit  = signal(false);
  loading = signal(false);
  saving  = signal(false);
  error   = signal('');

  form = signal({
    full_name: '',
    email:     '',
    password:  '',
    role:      '',
    phone:     '',
  });

  // ── Disponibilidad del entrenador (FOR-77) ───────────────────
  readonly weekDays  = WEEK_DAYS;
  readonly timezones = ['America/Bogota', 'America/Mexico_City', 'America/Lima'];

  trainerId    = signal<string | null>(null);
  availability = signal({
    coverage_area:         '',
    available_days:        [] as string[],
    available_hours_start: '',
    available_hours_end:   '',
    timezone:              'America/Bogota',
  });

  showAvailability = computed(
    () => this.isEdit() && this.form().role === 'trainer' && this.trainerId() !== null,
  );

  private loadTrainer(userId: string) {
    this.trainersApi.getAll().subscribe({
      next: (list) => {
        const t = list.find(x => x.user_id === userId);
        if (!t) return;
        this.trainerId.set(t.id);
        this.availability.set({
          coverage_area:         t.coverage_area ?? '',
          available_days:        t.available_days ?? [],
          available_hours_start: (t.available_hours_start ?? '').slice(0, 5),
          available_hours_end:   (t.available_hours_end ?? '').slice(0, 5),
          timezone:              t.timezone ?? 'America/Bogota',
        });
      },
    });
  }

  toggleDay(key: string) {
    this.availability.update(a => ({
      ...a,
      available_days: a.available_days.includes(key)
        ? a.available_days.filter(d => d !== key)
        : [...a.available_days, key],
    }));
  }

  updateAvailability(field: 'coverage_area' | 'available_hours_start' | 'available_hours_end' | 'timezone', value: string) {
    this.availability.update(a => ({ ...a, [field]: value }));
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loading.set(true);
      this.service.getOne(id).subscribe({
        next: (user) => {
          this.form.set({
            full_name: user.full_name,
            email:     user.email,
            password:  '',
            role:      user.role,
            phone:     user.phone ?? '',
          });
          this.loading.set(false);
          if (user.role === 'trainer') this.loadTrainer(id);
        },
        error: () => this.router.navigate(['/administracion/usuarios']),
      });
    }
  }

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  onSubmit() {
    const f = this.form();

    if (!f.full_name || !f.email || !f.role) {
      this.error.set('Nombre, email y rol son obligatorios');
      return;
    }
    if (!this.isEdit() && !f.password) {
      this.error.set('La contraseña es obligatoria');
      return;
    }
    if (!this.isEdit() && f.password.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const a = this.availability();
    if (this.showAvailability() && a.available_hours_start && a.available_hours_end
        && a.available_hours_start >= a.available_hours_end) {
      this.error.set('El horario de inicio debe ser anterior al horario de fin');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const id = this.route.snapshot.paramMap.get('id');

    if (this.isEdit() && id) {
      const data: any = { full_name: f.full_name, role: f.role };
      if (f.phone) data.phone = f.phone;

      this.service.update(id, data).subscribe({
        next: () => {
          const trainerId = this.trainerId();
          if (!this.showAvailability() || !trainerId) {
            this.toast.success('Usuario actualizado correctamente');
            setTimeout(() => this.router.navigate(['/administracion/usuarios']), 500);
            return;
          }

          this.trainersApi.update(trainerId, {
            coverage_area:         a.coverage_area || null,
            available_days:        a.available_days,
            available_hours_start: a.available_hours_start || null,
            available_hours_end:   a.available_hours_end || null,
            timezone:              a.timezone,
          }).subscribe({
            next: () => {
              this.toast.success('Usuario y disponibilidad actualizados');
              setTimeout(() => this.router.navigate(['/administracion/usuarios']), 500);
            },
            error: (err) => {
              const msg = err?.error?.message ?? 'No se pudo guardar la disponibilidad';
              this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
              this.saving.set(false);
            },
          });
        },
        error: () => {
          this.error.set('Error al guardar. Intenta de nuevo.');
          this.saving.set(false);
        },
      });
    } else {
      const data: any = {
        full_name: f.full_name,
        email:     f.email,
        password:  f.password,
        role:      f.role,
      };
      if (f.phone) data.phone = f.phone;

      this.service.create(data).subscribe({
        next: () => {
          this.toast.success('Usuario creado correctamente');
          setTimeout(() => this.router.navigate(['/administracion/usuarios']), 500);
        },
        error: (err) => {
          const msg: string = err?.error?.message ?? '';
          if (err?.status === 409 || msg.toLowerCase().includes('registrado')) {
            this.error.set('Ya existe un usuario con ese email');
          } else {
            this.error.set('Error al crear usuario. Intenta de nuevo.');
          }
          this.saving.set(false);
        },
      });
    }
  }

  goBack() { this.location.back(); }
}
