import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentsService } from '../../../core/services/assessments.service';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface TechForm {
  evaluation_date:              string;
  period_label:                 string;
  conduccion_5m:                number | null;
  conduccion_10m:               number | null;
  conduccion_20m:               number | null;
  cambios_direccion_derecha:    number | null;
  cambios_direccion_izquierda:  number | null;
  control_rastrero_dr:          number;
  control_rastrero_iz:          number;
  control_media_altura_dr:      number;
  control_media_altura_iz:      number;
  control_alto_dr:              number;
  control_alto_iz:              number;
  control_clasificacion:        string;
  control_notas:                string;
  pase_derecha:                 number;
  pase_izquierda:               number;
  pase_clasificacion:           string;
  pase_notas:                   string;
  definicion_carril_der_dr:     number;
  definicion_carril_der_iz:     number;
  definicion_carril_cen_dr:     number;
  definicion_carril_cen_iz:     number;
  definicion_carril_izq_dr:     number;
  definicion_carril_izq_iz:     number;
  definicion_clasificacion:     string;
  definicion_notas:             string;
}

const DEFAULT: TechForm = {
  evaluation_date:              new Date().toISOString().split('T')[0],
  period_label:                 '',
  conduccion_5m:                null,
  conduccion_10m:               null,
  conduccion_20m:               null,
  cambios_direccion_derecha:    null,
  cambios_direccion_izquierda:  null,
  control_rastrero_dr:          0,
  control_rastrero_iz:          0,
  control_media_altura_dr:      0,
  control_media_altura_iz:      0,
  control_alto_dr:              0,
  control_alto_iz:              0,
  control_clasificacion:        '',
  control_notas:                '',
  pase_derecha:                 0,
  pase_izquierda:               0,
  pase_clasificacion:           '',
  pase_notas:                   '',
  definicion_carril_der_dr:     0,
  definicion_carril_der_iz:     0,
  definicion_carril_cen_dr:     0,
  definicion_carril_cen_iz:     0,
  definicion_carril_izq_dr:     0,
  definicion_carril_izq_iz:     0,
  definicion_clasificacion:     '',
  definicion_notas:             '',
};

@Component({
  selector: 'app-technical-form',
  imports: [],
  templateUrl: './technical-form.html',
  styleUrl: './technical-form.scss',
})
export class TechnicalForm implements OnInit {
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
  form      = signal<TechForm>({ ...DEFAULT });

  readonly clasif   = ['bueno', 'aceptable', 'inadecuado'] as const;
  readonly vals02   = [0, 1, 2];
  readonly vals04   = [0, 1, 2, 3, 4];

  results = computed(() => {
    const f = this.form();

    const controlTotal = f.control_rastrero_dr + f.control_rastrero_iz
      + f.control_media_altura_dr + f.control_media_altura_iz
      + f.control_alto_dr + f.control_alto_iz;
    const controlPct = +(controlTotal / 12 * 100).toFixed(1);

    const paseTotal = f.pase_derecha + f.pase_izquierda;
    const pasePct   = +(paseTotal / 8 * 100).toFixed(1);

    const defTotal = f.definicion_carril_der_dr + f.definicion_carril_der_iz
      + f.definicion_carril_cen_dr + f.definicion_carril_cen_iz
      + f.definicion_carril_izq_dr + f.definicion_carril_izq_iz;
    const defPct = +(defTotal / 12 * 100).toFixed(1);

    return { controlTotal, controlPct, paseTotal, pasePct, defTotal, defPct };
  });

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('athlete_id') ?? '';
    this.athleteId.set(id);
    if (!id) { this.router.navigate(['/athletes']); return; }

    this.athletes.getOne(id).subscribe({
      next: (a) => { this.athlete.set(a); this.loading.set(false); },
      error: () => this.router.navigate(['/athletes']),
    });
  }

  set(field: keyof TechForm, value: number | string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  updateNum(field: keyof TechForm, event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.form.update(f => ({ ...f, [field]: v !== '' ? +v : null }));
  }

  updateStr(field: keyof TechForm, event: Event) {
    const v = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.form.update(f => ({ ...f, [field]: v }));
  }

  toggleClasif(field: keyof TechForm, value: string) {
    this.form.update(f => ({ ...f, [field]: f[field] === value ? '' : value }));
  }

  goBack() { this.router.navigate(['/athletes', this.athleteId()]); }

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

    const numFields: (keyof TechForm)[] = [
      'conduccion_5m', 'conduccion_10m', 'conduccion_20m',
      'cambios_direccion_derecha', 'cambios_direccion_izquierda',
    ];
    for (const k of numFields) {
      if (f[k] !== null) payload[k] = f[k];
    }

    const intFields: (keyof TechForm)[] = [
      'control_rastrero_dr', 'control_rastrero_iz',
      'control_media_altura_dr', 'control_media_altura_iz',
      'control_alto_dr', 'control_alto_iz',
      'pase_derecha', 'pase_izquierda',
      'definicion_carril_der_dr', 'definicion_carril_der_iz',
      'definicion_carril_cen_dr', 'definicion_carril_cen_iz',
      'definicion_carril_izq_dr', 'definicion_carril_izq_iz',
    ];
    for (const k of intFields) payload[k] = f[k];

    const strFields: (keyof TechForm)[] = [
      'period_label',
      'control_clasificacion', 'control_notas',
      'pase_clasificacion', 'pase_notas',
      'definicion_clasificacion', 'definicion_notas',
    ];
    for (const k of strFields) {
      if (f[k] !== '') payload[k] = f[k];
    }

    this.saving.set(true);
    this.service.createTechnical(payload).subscribe({
      next: () => {
        this.toast.show('Evaluación técnica guardada', 'success');
        this.router.navigate(['/athletes', this.athleteId()]);
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('Error al guardar la evaluación', 'error');
      },
    });
  }
}
