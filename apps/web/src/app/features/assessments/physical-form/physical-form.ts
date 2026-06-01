import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentsService } from '../../../core/services/assessments.service';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface PhysForm {
  evaluation_date:               string;
  period_label:                  string;
  movilidad_pies:                number;
  movilidad_pies_analisis:       string;
  movilidad_rodillas:            number;
  movilidad_rodillas_analisis:   string;
  movilidad_talones:             number;
  movilidad_talones_analisis:    string;
  movilidad_cadera:              number;
  movilidad_cadera_analisis:     string;
  movilidad_tronco:              number;
  movilidad_tronco_analisis:     string;
  movilidad_brazos:              number;
  movilidad_brazos_analisis:     string;
  movilidad_clasificacion:       string;
  movilidad_notas:               string;
  sentadilla_foto_url:           string;
  salto_vertical_cm:             number | null;
  salto_vertical_notas:          string;
  salto_horizontal_cm:           number | null;
  salto_horizontal_notas:        string;
  sprint_5m:                     number | null;
  sprint_10m:                    number | null;
  sprint_15m:                    number | null;
  sprint_20m:                    number | null;
}

const DEFAULT: PhysForm = {
  evaluation_date:               new Date().toISOString().split('T')[0],
  period_label:                  '',
  movilidad_pies:                0,
  movilidad_pies_analisis:       '',
  movilidad_rodillas:            0,
  movilidad_rodillas_analisis:   '',
  movilidad_talones:             0,
  movilidad_talones_analisis:    '',
  movilidad_cadera:              0,
  movilidad_cadera_analisis:     '',
  movilidad_tronco:              0,
  movilidad_tronco_analisis:     '',
  movilidad_brazos:              0,
  movilidad_brazos_analisis:     '',
  movilidad_clasificacion:       '',
  movilidad_notas:               '',
  sentadilla_foto_url:           '',
  salto_vertical_cm:             null,
  salto_vertical_notas:          '',
  salto_horizontal_cm:           null,
  salto_horizontal_notas:        '',
  sprint_5m:                     null,
  sprint_10m:                    null,
  sprint_15m:                    null,
  sprint_20m:                    null,
};

@Component({
  selector: 'app-physical-form',
  imports: [],
  templateUrl: './physical-form.html',
  styleUrl: './physical-form.scss',
})
export class PhysicalForm implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private service  = inject(AssessmentsService);
  private athletes = inject(AthletesService);
  private auth     = inject(AuthService);
  private toast    = inject(ToastService);

  athleteId = signal('');
  athlete   = signal<Athlete | null>(null);
  loading   = signal(true);
  saving    = signal(false);
  form      = signal<PhysForm>({ ...DEFAULT });

  readonly vals03  = [0, 1, 2, 3];
  readonly movilLabels = ['No logra', 'Compens. importantes', 'Compens. menores', 'Perfecto'];
  readonly clasif  = ['excelente', 'bueno', 'promedio', 'debajo_promedio'] as const;
  readonly clasifLabels: Record<string, string> = {
    excelente:       'Excelente',
    bueno:           'Bueno',
    promedio:        'Promedio',
    debajo_promedio: 'Debajo promedio',
  };

  readonly movilZones: { field: keyof PhysForm; analisis: keyof PhysForm; label: string }[] = [
    { field: 'movilidad_pies',     analisis: 'movilidad_pies_analisis',     label: 'Pies' },
    { field: 'movilidad_rodillas', analisis: 'movilidad_rodillas_analisis', label: 'Rodillas' },
    { field: 'movilidad_talones',  analisis: 'movilidad_talones_analisis',  label: 'Talones' },
    { field: 'movilidad_cadera',   analisis: 'movilidad_cadera_analisis',   label: 'Cadera' },
    { field: 'movilidad_tronco',   analisis: 'movilidad_tronco_analisis',   label: 'Tronco' },
    { field: 'movilidad_brazos',   analisis: 'movilidad_brazos_analisis',   label: 'Brazos' },
  ];

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('athlete_id') ?? '';
    this.athleteId.set(id);
    if (!id) { this.router.navigate(['/deportistas']); return; }

    this.athletes.getOne(id).subscribe({
      next: (a) => { this.athlete.set(a); this.loading.set(false); },
      error: () => this.router.navigate(['/deportistas']),
    });
  }

  set(field: keyof PhysForm, value: number | string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  updateNum(field: keyof PhysForm, event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.form.update(f => ({ ...f, [field]: v !== '' ? +v : null }));
  }

  updateStr(field: keyof PhysForm, event: Event) {
    const v = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.form.update(f => ({ ...f, [field]: v }));
  }

  toggleClasif(field: keyof PhysForm, value: string) {
    this.form.update(f => ({ ...f, [field]: f[field] === value ? '' : value }));
  }

  goBack() { this.router.navigate(['/deportistas', this.athleteId()]); }

  submit() {
    const f = this.form();
    if (!f.evaluation_date) {
      this.toast.show('La fecha de evaluación es obligatoria', 'error');
      return;
    }

    const user    = this.auth.getCurrentUser();
    const payload: Record<string, any> = {
      athlete_id:      this.athleteId(),
      evaluator_id:    user.id,
      evaluation_date: f.evaluation_date,
    };

    // Movilidad — enteros siempre se envían
    const intFields: (keyof PhysForm)[] = [
      'movilidad_pies', 'movilidad_rodillas', 'movilidad_talones',
      'movilidad_cadera', 'movilidad_tronco', 'movilidad_brazos',
    ];
    for (const k of intFields) payload[k] = f[k];

    // Número nullable
    const numFields: (keyof PhysForm)[] = [
      'salto_vertical_cm', 'salto_horizontal_cm',
      'sprint_5m', 'sprint_10m', 'sprint_15m', 'sprint_20m',
    ];
    for (const k of numFields) {
      if (f[k] !== null) payload[k] = f[k];
    }

    // Strings opcionales
    const strFields: (keyof PhysForm)[] = [
      'period_label', 'sentadilla_foto_url',
      'movilidad_pies_analisis', 'movilidad_rodillas_analisis',
      'movilidad_talones_analisis', 'movilidad_cadera_analisis',
      'movilidad_tronco_analisis', 'movilidad_brazos_analisis',
      'movilidad_clasificacion', 'movilidad_notas',
      'salto_vertical_notas', 'salto_horizontal_notas',
    ];
    for (const k of strFields) {
      if (f[k] !== '') payload[k] = f[k];
    }

    this.saving.set(true);
    this.service.createPhysical(payload).subscribe({
      next: () => {
        this.toast.show('Evaluación física guardada', 'success');
        this.router.navigate(['/deportistas', this.athleteId()]);
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('Error al guardar la evaluación', 'error');
      },
    });
  }
}
