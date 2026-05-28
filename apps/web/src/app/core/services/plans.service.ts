import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Plan {
  id:             string;
  athlete_id:     string;
  plan_type:      string;
  total_sessions: number;
  start_date:     string;
  is_active:      boolean;
  is_frozen:      boolean;
  frozen_at:      string | null;
  frozen_reason:  string | null;
  created_at:     string;
  athletes?: { id: string; first_name: string; last_name: string };
}

export interface CreatePlanPayload {
  athlete_id:     string;
  plan_type:      string;
  total_sessions: number;
  start_date:     string;
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

export const PLAN_TYPES = Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label }));

@Injectable({ providedIn: 'root' })
export class PlansService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/plans`;

  getAll() {
    return this.http.get<Plan[]>(this.base);
  }

  getOne(id: string) {
    return this.http.get<Plan>(`${this.base}/${id}`);
  }

  getByAthlete(athleteId: string) {
    return this.http.get<Plan[]>(`${this.base}?athlete_id=${athleteId}`);
  }

  create(payload: CreatePlanPayload) {
    return this.http.post<Plan>(this.base, payload);
  }

  update(id: string, payload: Partial<CreatePlanPayload>) {
    return this.http.patch<Plan>(`${this.base}/${id}`, payload);
  }

  freeze(id: string, reason: string) {
    return this.http.patch<Plan>(`${this.base}/${id}/freeze`, { reason });
  }

  unfreeze(id: string) {
    return this.http.patch<Plan>(`${this.base}/${id}/unfreeze`, {});
  }

  cancelPlan(id: string) {
    return this.http.patch<{ message: string; plan: Plan }>(`${this.base}/${id}/cancel`, {});
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  getPlanLabel(type: string): string {
    return PLAN_LABELS[type] ?? type;
  }

  getPlanStatus(plan: Plan): 'active' | 'frozen' | 'cancelled' {
    if (!plan.is_active) return 'cancelled';
    if (plan.is_frozen)  return 'frozen';
    return 'active';
  }
}
