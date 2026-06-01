import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentsService } from '../../../core/services/assessments.service';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface NutriForm {
  evaluation_date:          string;
  period_label:             string;
  position:                 string;
  peso_kg:                  number | null;
  talla_cm:                 number | null;
  perimetro_muneca_cm:      number | null;
  pliegue_tricipital_mm:    number | null;
  pliegue_subescapular_mm:  number | null;
  pliegue_supraespinal_mm:  number | null;
  pliegue_abdominal_mm:     number | null;
  pliegue_muslo_mm:         number | null;
  pliegue_pantorrilla_mm:   number | null;
  perimetro_pantorrilla_cm: number | null;
  perimetro_brazo_tenso_cm: number | null;
  perimetro_brazo_cm:       number | null;
  diametro_humero_cm:       number | null;
  diametro_femur_cm:        number | null;
  porcentaje_grasa_deseado: number | null;
  clasificacion_grasa:      string;
  clasificacion_iaks:       string;
  clasificacion_pliegues:   string;
  clasificacion_imc:        string;
  clasificacion_talla_edad: string;
  horario_entrenamiento:    string;
  plan_desayuno:            string;
  plan_media_manana:        string;
  plan_almuerzo:            string;
  plan_media_tarde:         string;
  plan_cena:                string;
  plan_finde:               string;
  clasificacion_antropometrica: string;
  recomendaciones:          string;
  notas_comparacion:        string;
}

const DEFAULT_FORM: NutriForm = {
  evaluation_date:          new Date().toISOString().split('T')[0],
  period_label:             '',
  position:                 '',
  peso_kg:                  null,
  talla_cm:                 null,
  perimetro_muneca_cm:      null,
  pliegue_tricipital_mm:    null,
  pliegue_subescapular_mm:  null,
  pliegue_supraespinal_mm:  null,
  pliegue_abdominal_mm:     null,
  pliegue_muslo_mm:         null,
  pliegue_pantorrilla_mm:   null,
  perimetro_pantorrilla_cm: null,
  perimetro_brazo_tenso_cm: null,
  perimetro_brazo_cm:       null,
  diametro_humero_cm:       null,
  diametro_femur_cm:        null,
  porcentaje_grasa_deseado: null,
  clasificacion_grasa:      '',
  clasificacion_iaks:       '',
  clasificacion_pliegues:   '',
  clasificacion_imc:        '',
  clasificacion_talla_edad: '',
  horario_entrenamiento:    '',
  plan_desayuno:            '',
  plan_media_manana:        '',
  plan_almuerzo:            '',
  plan_media_tarde:         '',
  plan_cena:                '',
  plan_finde:               '',
  clasificacion_antropometrica: '',
  recomendaciones:          '',
  notas_comparacion:        '',
};

@Component({
  selector: 'app-nutritional-form',
  imports: [],
  templateUrl: './nutritional-form.html',
  styleUrl: './nutritional-form.scss',
})
export class NutritionalForm implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private service  = inject(AssessmentsService);
  private athletes = inject(AthletesService);
  private auth     = inject(AuthService);
  private toast    = inject(ToastService);

  athleteId = signal<string>('');
  athlete   = signal<Athlete | null>(null);
  loading   = signal(true);
  saving    = signal(false);
  form      = signal<NutriForm>({ ...DEFAULT_FORM });

  readonly semaforo = ['bajo', 'adecuado', 'aceptable', 'alto'] as const;

  results = computed(() => {
    const f = this.form();
    const gender = this.athlete()?.gender;

    const pliegues = [
      f.pliegue_tricipital_mm,
      f.pliegue_subescapular_mm,
      f.pliegue_supraespinal_mm,
      f.pliegue_abdominal_mm,
      f.pliegue_muslo_mm,
      f.pliegue_pantorrilla_mm,
    ];

    const hasPliegues = pliegues.every(p => p != null && p > 0);
    const hasPeso     = f.peso_kg != null && f.peso_kg > 0;
    const hasTalla    = f.talla_cm != null && f.talla_cm > 0;

    if (!hasPliegues || !hasPeso || !hasTalla) return null;

    const sumatoria       = pliegues.reduce((a, b) => a! + b!, 0)!;
    const pct_grasa       = gender === 'M'
      ? 0.1051 * sumatoria + 2.585
      : 0.1548 * sumatoria + 3.58;
    const peso_graso      = f.peso_kg! * (pct_grasa / 100);
    const mlg             = f.peso_kg! - peso_graso;
    const talla_m         = f.talla_cm! / 100;
    const iaks            = (mlg * 100000) / Math.pow(f.talla_cm!, 3);
    const imlg            = mlg / Math.pow(talla_m, 2);
    const imc             = f.peso_kg! / Math.pow(talla_m, 2);
    const complexion      = f.perimetro_muneca_cm
      ? f.talla_cm! / f.perimetro_muneca_cm
      : null;
    const peso_ideal      = f.porcentaje_grasa_deseado
      ? mlg / (1 - f.porcentaje_grasa_deseado / 100)
      : null;

    return {
      sumatoria:      +sumatoria.toFixed(2),
      pct_grasa:      +pct_grasa.toFixed(2),
      peso_graso:     +peso_graso.toFixed(2),
      mlg:            +mlg.toFixed(2),
      iaks:           +iaks.toFixed(3),
      imlg:           +imlg.toFixed(2),
      imc:            +imc.toFixed(2),
      complexion:     complexion ? +complexion.toFixed(2) : null,
      peso_ideal:     peso_ideal ? +peso_ideal.toFixed(2) : null,
    };
  });

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('athlete_id') ?? '';
    this.athleteId.set(id);

    if (!id) {
      this.router.navigate(['/deportistas']);
      return;
    }

    this.athletes.getOne(id).subscribe({
      next: (a) => { this.athlete.set(a); this.loading.set(false); },
      error: () => this.router.navigate(['/deportistas']),
    });
  }

  updateNum(field: keyof NutriForm, event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.form.update(f => ({ ...f, [field]: val !== '' ? +val : null }));
  }

  updateStr(field: keyof NutriForm, event: Event) {
    const val = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.form.update(f => ({ ...f, [field]: val }));
  }

  setClasificacion(field: keyof NutriForm, value: string) {
    this.form.update(f => ({
      ...f,
      [field]: f[field] === value ? '' : value,
    }));
  }

  goBack() {
    this.router.navigate(['/deportistas', this.athleteId()]);
  }

  submit() {
    const f = this.form();
    if (!f.evaluation_date) {
      this.toast.show('La fecha de evaluación es obligatoria', 'error');
      return;
    }

    const user = this.auth.getCurrentUser();
    const payload: Record<string, any> = {
      athlete_id:    this.athleteId(),
      evaluator_id:  user.id,
      evaluation_date: f.evaluation_date,
    };

    const fields: (keyof NutriForm)[] = [
      'period_label', 'position',
      'peso_kg', 'talla_cm', 'perimetro_muneca_cm',
      'pliegue_tricipital_mm', 'pliegue_subescapular_mm', 'pliegue_supraespinal_mm',
      'pliegue_abdominal_mm', 'pliegue_muslo_mm', 'pliegue_pantorrilla_mm',
      'perimetro_pantorrilla_cm', 'perimetro_brazo_tenso_cm', 'perimetro_brazo_cm',
      'diametro_humero_cm', 'diametro_femur_cm', 'porcentaje_grasa_deseado',
      'clasificacion_grasa', 'clasificacion_iaks', 'clasificacion_pliegues',
      'clasificacion_imc', 'clasificacion_talla_edad',
      'horario_entrenamiento', 'plan_desayuno', 'plan_media_manana',
      'plan_almuerzo', 'plan_media_tarde', 'plan_cena', 'plan_finde',
      'clasificacion_antropometrica', 'recomendaciones', 'notas_comparacion',
    ];

    for (const key of fields) {
      const v = f[key];
      if (v !== null && v !== '') payload[key] = v;
    }

    this.saving.set(true);
    this.service.createNutritional(payload).subscribe({
      next: () => {
        this.toast.show('Evaluación nutricional guardada', 'success');
        this.router.navigate(['/deportistas', this.athleteId()]);
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('Error al guardar la evaluación', 'error');
      },
    });
  }
}
