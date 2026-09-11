import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionsService } from '../../../core/services/sessions.service';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TrainersService } from '../../../core/services/trainers.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-session-form',
  imports: [FormsModule],
  templateUrl: './session-form.html',
  styleUrl: './session-form.scss',
})
export class SessionForm implements OnInit {
  private route    = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router   = inject(Router);
  private location = inject(Location);
  private service  = inject(SessionsService);
  private athletes = inject(AthletesService);
  private auth     = inject(AuthService);
  private toast    = inject(ToastService);
  private trainers = inject(TrainersService);

  loading = signal(false);
  saving  = signal(false);
  error   = signal('');

  athletesList = signal<Athlete[]>([]);

  // Plan activo del deportista seleccionado (solo informativo) y flag de
  // sesión "extra": no se vincula al plan, no cuenta contra su cupo (FOR-62).
  activePlanLabel = signal<string | null>(null);
  isExtra         = signal(false);

  form = signal({
    athlete_id:   '',
    plan_id:      '',
    trainer_id:   '',
    session_date: '',
    session_time: '',
    session_name: '',
    location:     '',
    trainer_notes: '',
  });

  trainersList = signal<any[]>([]);
  isAdminOrSuper = signal(false);


  ngOnInit() {
    const role = this.auth.getRole() ?? '';
    this.isAdminOrSuper.set(['super_admin', 'admin'].includes(role));

    // Cargar deportistas
    this.athletes.getAll().subscribe({
      next: (data) => this.athletesList.set(data.filter(a => a.status === 'active')),
    });

    // Si es admin/super_admin cargar entrenadores
    if (this.isAdminOrSuper()) {
      this.trainers.getAll().subscribe({
        next: (data) => this.trainersList.set(data),
      });
    } else {
      // Si es trainer, buscar su trainer_id
      this.http.get<any>(`${environment.apiUrl}/auth/trainer-id`).subscribe({
        next: (res) => {
          if (res.trainer_id) {
            this.form.update(f => ({ ...f, trainer_id: res.trainer_id }));
          }
        }
      });
    }
  }

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  onAthleteChange(athleteId: string) {
    this.form.update(f => ({ ...f, athlete_id: athleteId, plan_id: '', trainer_id: '' }));
    this.activePlanLabel.set(null);
    this.isExtra.set(false);

    if (!athleteId) return;

    this.athletes.getOne(athleteId).subscribe({
      next: (athlete: any) => {
        const activePlan = athlete.plans?.find((p: any) => p.is_active);
        const trainerId = athlete.trainers?.id || '';

        this.form.update(f => ({
          ...f,
          plan_id: activePlan?.id || '',
          trainer_id: trainerId
        }));
        this.activePlanLabel.set(activePlan ? `${activePlan.plan_type} (${activePlan.total_sessions} clases)` : null);
      }
    });
  }

  toggleExtra(value: boolean) {
    this.isExtra.set(value);
  }

  onSubmit() {
    const f = this.form();
    if (!f.athlete_id || !f.session_date || !f.session_time || !f.location) {
      this.error.set('Deportista, fecha, hora y ubicación son obligatorios');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const data = {
      athlete_id:    f.athlete_id,
      // Sesión extra: no se vincula al plan ni cuenta contra su cupo (FOR-62)
      plan_id:       this.isExtra() ? null : (f.plan_id || null),
      trainer_id:    f.trainer_id || null,
      session_date:  f.session_date,
      session_time:  f.session_time,
      session_name:  f.session_name  || null,
      location:      f.location,
      trainer_notes: f.trainer_notes || null,
    };
    
    this.service.create(data).subscribe({
      next: () => {
        this.toast.success('Sesión registrada correctamente');
        setTimeout(() => this.router.navigate(['/sesiones']), 500);
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
