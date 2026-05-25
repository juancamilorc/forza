import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface NutritionalAssessment {
  id:                    string;
  athlete_id:            string;
  evaluation_date:       string;
  period_label:          string | null;
  peso_kg:               number | null;
  talla_cm:              number | null;
  imc:                   number | null;
  porcentaje_grasa:      number | null;
  clasificacion_imc:     string | null;
  clasificacion_grasa:   string | null;
}

export interface TechnicalAssessment {
  id:                              string;
  athlete_id:                      string;
  evaluation_date:                 string;
  period_label:                    string | null;
  control_efectividad_total_pct:   number | null;
  pase_efectividad_pct:            number | null;
  definicion_efectividad_total_pct: number | null;
  control_clasificacion:           string | null;
}

export interface PhysicalAssessment {
  id:                              string;
  athlete_id:                      string;
  evaluation_date:                 string;
  period_label:                    string | null;
  salto_vertical_cm:               number | null;
  salto_vertical_clasificacion:    string | null;
  salto_horizontal_cm:             number | null;
  sprint_20m:                      number | null;
  movilidad_clasificacion:         string | null;
}

@Injectable({ providedIn: 'root' })
export class AssessmentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/assessments`;

  getNutritionalByAthlete(athleteId: string) {
    return this.http.get<NutritionalAssessment[]>(`${this.base}/nutritional?athlete_id=${athleteId}`);
  }

  getTechnicalByAthlete(athleteId: string) {
    return this.http.get<TechnicalAssessment[]>(`${this.base}/technical?athlete_id=${athleteId}`);
  }

  getPhysicalByAthlete(athleteId: string) {
    return this.http.get<PhysicalAssessment[]>(`${this.base}/physical?athlete_id=${athleteId}`);
  }

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
}
