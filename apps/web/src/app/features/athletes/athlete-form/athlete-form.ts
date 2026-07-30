import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AthletesService } from '../../../core/services/athletes.service';
import { TrainersService, Trainer } from '../../../core/services/trainers.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-athlete-form',
  imports: [FormsModule],
  templateUrl: './athlete-form.html',
  styleUrl: './athlete-form.scss',
})
export class AthleteForm implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private location = inject(Location);
  private service  = inject(AthletesService);
  private trainers = inject(TrainersService);
  private auth     = inject(AuthService);
  private toast    = inject(ToastService);

  isEdit   = signal(false);
  loading  = signal(false);
  saving   = signal(false);
  error    = signal('');

  role    = this.auth.getRole() ?? '';
  isAdmin = this.role === 'super_admin' || this.role === 'admin';

  trainersList = signal<Trainer[]>([]);

  form = signal({
    first_name: '',
    last_name:  '',
    birth_date: '',
    gender:     '',
    status:     'trial',
    notes:      '',
    trainer_id: '',
  });

  ngOnInit() {
    if (this.isAdmin) {
      this.trainers.getAll().subscribe({
        next: (data) => this.trainersList.set(data),
      });
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loading.set(true);
      this.service.getOne(id).subscribe({
        next: (athlete) => {
          this.form.set({
            first_name: athlete.first_name,
            last_name:  athlete.last_name,
            birth_date: athlete.birth_date,
            gender:     athlete.gender ?? '',
            status:     athlete.status,
            notes:      athlete.notes ?? '',
            trainer_id: athlete.trainer_id ?? '',
          });
          this.loading.set(false);
        },
        error: () => this.router.navigate(['/deportistas']),
      });
    }
  }

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  onSubmit() {
    const f = this.form();

    if (!f.first_name || !f.last_name || !f.birth_date || !f.gender) {
      this.error.set('Nombre, apellido, fecha de nacimiento y género son obligatorios');
      return;
    }

    if (this.isAdmin && !f.trainer_id) {
      this.error.set('El entrenador es obligatorio');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const id = this.route.snapshot.paramMap.get('id');
    const data: any = {
      first_name: f.first_name,
      last_name:  f.last_name,
      birth_date: f.birth_date,
      gender:     f.gender,
      status:     f.status,
      notes:      f.notes || null,
    };

    // Solo incluir trainer_id si es admin
    if (this.isAdmin) {
      data.trainer_id = f.trainer_id || null;
    }

    console.log('📤 Enviando al backend:', data);

    const request = id
      ? this.service.update(id, data)
      : this.service.create(data);

    request.subscribe({
      next: (athlete) => {
        this.toast.success(
          this.isEdit() ? 'Deportista actualizado correctamente' : 'Deportista creado correctamente'
        );
        setTimeout(() => this.router.navigate(['/deportistas', athlete.id]), 500);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error al guardar. Intenta de nuevo.';
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
        this.saving.set(false);
      },
    });
  }

  goBack() { this.location.back(); }
}
