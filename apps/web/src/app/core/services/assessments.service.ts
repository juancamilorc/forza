import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ── List interfaces (lightweight) ─────────────────────────────────────
export interface NutritionalAssessment {
  id:                        string;
  athlete_id:                string;
  evaluation_date:           string;
  period_label:              string | null;
  peso_kg:                   number | null;
  talla_cm:                  number | null;
  imc:                       number | null;
  porcentaje_grasa:          number | null;
  iaks:                      number | null;
  sumatoria_pliegues_mm:     number | null;
  clasificacion_imc:         string | null;
  clasificacion_grasa:       string | null;
  clasificacion_iaks:        string | null;
  clasificacion_pliegues:    string | null;
  athletes?:                 { id: string; first_name: string; last_name: string } | null;
}

export interface TechnicalAssessment {
  id:                               string;
  athlete_id:                       string;
  evaluation_date:                  string;
  period_label:                     string | null;
  control_efectividad_total_pct:    number | null;
  pase_efectividad_pct:             number | null;
  definicion_efectividad_total_pct: number | null;
  control_clasificacion:            string | null;
  pase_clasificacion:               string | null;
  definicion_clasificacion:         string | null;
  athletes?:                        { id: string; first_name: string; last_name: string } | null;
}

export interface PhysicalAssessment {
  id:                              string;
  athlete_id:                      string;
  evaluation_date:                 string;
  period_label:                    string | null;
  salto_vertical_cm:               number | null;
  salto_vertical_clasificacion:    string | null;
  salto_horizontal_cm:             number | null;
  salto_horizontal_clasificacion:  string | null;
  sprint_20m:                      number | null;
  movilidad_clasificacion:         string | null;
  athletes?:                       { id: string; first_name: string; last_name: string } | null;
}

// ── Full detail interfaces ─────────────────────────────────────────────
export interface NutritionalAssessmentFull extends NutritionalAssessment {
  evaluator_id:                 string;
  evaluator?:                   { id: string; full_name: string } | null;
  position:                     string | null;
  perimetro_muneca_cm:          number | null;
  pliegue_tricipital_mm:        number | null;
  pliegue_subescapular_mm:      number | null;
  pliegue_supraespinal_mm:      number | null;
  pliegue_abdominal_mm:         number | null;
  pliegue_muslo_mm:             number | null;
  pliegue_pantorrilla_mm:       number | null;
  perimetro_pantorrilla_cm:     number | null;
  perimetro_brazo_tenso_cm:     number | null;
  perimetro_brazo_cm:           number | null;
  diametro_humero_cm:           number | null;
  diametro_femur_cm:            number | null;
  sumatoria_pliegues_mm:        number | null;
  peso_graso_kg:                number | null;
  masa_libre_grasa_kg:          number | null;
  iaks:                         number | null;
  imlg:                         number | null;
  complexion_osea:              number | null;
  peso_ideal_kg:                number | null;
  porcentaje_grasa_deseado:     number | null;
  clasificacion_iaks:           string | null;
  clasificacion_pliegues:       string | null;
  clasificacion_talla_edad:     string | null;
  clasificacion_antropometrica: string | null;
  horario_entrenamiento:        string | null;
  plan_desayuno:                string | null;
  plan_media_manana:            string | null;
  plan_almuerzo:                string | null;
  plan_media_tarde:             string | null;
  plan_cena:                    string | null;
  plan_finde:                   string | null;
  recomendaciones:              string | null;
  notas_comparacion:            string | null;
  athletes?: { id: string; first_name: string; last_name: string; birth_date: string; gender: string } | null;
}

export interface TechnicalAssessmentFull extends TechnicalAssessment {
  evaluator_id:                      string;
  evaluator?:                        { id: string; full_name: string } | null;
  conduccion_5m:                     number | null;
  conduccion_10m:                    number | null;
  conduccion_20m:                    number | null;
  cambios_direccion_derecha:         number | null;
  cambios_direccion_izquierda:       number | null;
  control_rastrero_dr:               number | null;
  control_rastrero_iz:               number | null;
  control_media_altura_dr:           number | null;
  control_media_altura_iz:           number | null;
  control_alto_dr:                   number | null;
  control_alto_iz:                   number | null;
  control_notas:                     string | null;
  control_efectividad_derecha_pct:   number | null;
  control_efectividad_izquierda_pct: number | null;
  pase_derecha:                      number | null;
  pase_izquierda:                    number | null;
  pase_clasificacion:                string | null;
  pase_notas:                        string | null;
  definicion_carril_der_dr:          number | null;
  definicion_carril_der_iz:          number | null;
  definicion_carril_cen_dr:          number | null;
  definicion_carril_cen_iz:          number | null;
  definicion_carril_izq_dr:          number | null;
  definicion_carril_izq_iz:          number | null;
  definicion_clasificacion:          string | null;
  definicion_notas:                  string | null;
  definicion_efectividad_dr_pct:     number | null;
  definicion_efectividad_iz_pct:     number | null;
}

export interface PhysicalAssessmentFull extends PhysicalAssessment {
  evaluator_id:                   string;
  evaluator?:                     { id: string; full_name: string } | null;
  movilidad_pies:                 number | null;
  movilidad_pies_analisis:        string | null;
  movilidad_rodillas:             number | null;
  movilidad_rodillas_analisis:    string | null;
  movilidad_talones:              number | null;
  movilidad_talones_analisis:     string | null;
  movilidad_cadera:               number | null;
  movilidad_cadera_analisis:      string | null;
  movilidad_tronco:               number | null;
  movilidad_tronco_analisis:      string | null;
  movilidad_brazos:               number | null;
  movilidad_brazos_analisis:      string | null;
  movilidad_notas:                string | null;
  salto_vertical_notas:           string | null;
  salto_horizontal_clasificacion: string | null;
  salto_horizontal_notas:         string | null;
  sprint_5m:                      number | null;
  sprint_10m:                     number | null;
  sprint_15m:                     number | null;
  athletes?: { id: string; first_name: string; last_name: string; birth_date: string; gender: string } | null;
}

@Injectable({ providedIn: 'root' })
export class AssessmentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/assessments`;

  // ── By athlete (for athlete-detail) ───────────────────────────────────
  getNutritionalByAthlete(athleteId: string) {
    return this.http.get<NutritionalAssessment[]>(`${this.base}/nutritional?athlete_id=${athleteId}`);
  }

  getTechnicalByAthlete(athleteId: string) {
    return this.http.get<TechnicalAssessment[]>(`${this.base}/technical?athlete_id=${athleteId}`);
  }

  getPhysicalByAthlete(athleteId: string) {
    return this.http.get<PhysicalAssessment[]>(`${this.base}/physical?athlete_id=${athleteId}`);
  }

  // ── All (for assessments list page) ───────────────────────────────────
  getAllNutritional() {
    return this.http.get<NutritionalAssessment[]>(`${this.base}/nutritional`);
  }

  getAllTechnical() {
    return this.http.get<TechnicalAssessment[]>(`${this.base}/technical`);
  }

  getAllPhysical() {
    return this.http.get<PhysicalAssessment[]>(`${this.base}/physical`);
  }

  // ── Detail by ID ─────────────────────────────────────────────────────
  getNutritionalById(id: string) {
    return this.http.get<NutritionalAssessmentFull>(`${this.base}/nutritional/${id}`);
  }

  getTechnicalById(id: string) {
    return this.http.get<TechnicalAssessmentFull>(`${this.base}/technical/${id}`);
  }

  getPhysicalById(id: string) {
    return this.http.get<PhysicalAssessmentFull>(`${this.base}/physical/${id}`);
  }

  // ── Create ────────────────────────────────────────────────────────────
  createNutritional(data: any) {
    return this.http.post<NutritionalAssessment>(`${this.base}/nutritional`, data);
  }

  createTechnical(data: any) {
    return this.http.post<TechnicalAssessment>(`${this.base}/technical`, data);
  }

  createPhysical(data: any) {
    return this.http.post<PhysicalAssessment>(`${this.base}/physical`, data);
  }

  // ── Label helpers ─────────────────────────────────────────────────────
  getPhysicalClassLabel(c: string): string {
    const labels: Record<string, string> = {
      excelente:       'Excelente',
      bueno:           'Bueno',
      promedio:        'Promedio',
      debajo_promedio: 'Debajo del promedio',
    };
    return labels[c] ?? c;
  }

  getTechnicalClassLabel(c: string): string {
    const labels: Record<string, string> = {
      bueno:      'Bueno',
      aceptable:  'Aceptable',
      inadecuado: 'Inadecuado',
    };
    return labels[c] ?? c;
  }

  getNutritionalClassLabel(c: string): string {
    const labels: Record<string, string> = {
      bajo:      'Bajo',
      adecuado:  'Adecuado',
      aceptable: 'Aceptable',
      alto:      'Alto',
    };
    return labels[c] ?? c;
  }
}
