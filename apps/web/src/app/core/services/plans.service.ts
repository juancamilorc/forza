import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Plan {
  id:            string;
  athlete_id:    string;
  plan_type:     string;
  total_sessions: number;
  start_date:    string;
  is_active:     boolean;
  is_frozen:     boolean;
  frozen_at:     string | null;
  frozen_reason: string | null;
  created_at:    string;
}

const PLAN_LABELS: Record<string, string> = {
  momentum:             'Momentum',
  momentum_pro:         'Momentum Pro',
  master:               'Master',
  master_pro:           'Master Pro',
  frz:                  'FRZ',
  frz_pro:              'FRZ Pro',
  elite:                'Elite',
  elite_pro:            'Elite Pro',
  addicted_to_football: 'Addicted to Football',
};

@Injectable({ providedIn: 'root' })
export class PlansService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/plans`;

  getByAthlete(athleteId: string) {
    return this.http.get<Plan[]>(`${this.base}?athlete_id=${athleteId}`);
  }

  getPlanLabel(type: string): string {
    return PLAN_LABELS[type] ?? type;
  }
}
