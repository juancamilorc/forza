import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-athlete-form',
  imports: [FormsModule],
  templateUrl: './athlete-form.html',
  styleUrl: './athlete-form.scss',
})
export class AthleteForm implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private service = inject(AthletesService);
  private toast = inject(ToastService);

  isEdit   = signal(false);
  loading  = signal(false);
  saving   = signal(false);
  error    = signal('');

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
    if (!this.form().first_name || !this.form().last_name || !this.form().birth_date) {
      this.error.set('Nombre, apellido y fecha de nacimiento son obligatorios');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const id = this.route.snapshot.paramMap.get('id');
    const data = {
      ...this.form(),
      gender:     this.form().gender     || null,
      notes:      this.form().notes      || null,
      trainer_id: this.form().trainer_id || null,
    };

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

      error: () => {
        this.toast.error('Error al guardar. Intenta de nuevo.');
        this.saving.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/deportistas']);
  }
}
