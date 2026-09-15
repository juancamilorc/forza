import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Trainer {
  id:      string;
  user_id: string;
  users:   { full_name: string; email: string; is_active: boolean };
}

export interface TrainerAthleteSummary {
  athlete_id:          string;
  name:                string;
  status:              string;
  plan_type:           string | null;
  total_sessions:      number | null;
  completed_sessions:  number;
  remaining_sessions:  number | null;
  plan_end_date:       string | null;
  plan_expiring_soon:  boolean;
  days_until_expiry:   number | null;
  debt_amount:         number;
}

export interface TrainerOverview {
  trainer_id:           string;
  trainer_name:         string;
  athletes_count:       number;
  active_athletes_count: number;
  active_plans_count:   number;
  sessions_this_week:   number;
  athletes:             TrainerAthleteSummary[];
}

@Injectable({ providedIn: 'root' })
export class TrainersService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/trainers`);
  }

  // FOR-68 — admin ve todos (o uno con trainerId), trainer ve solo el suyo
  getOverview(trainerId?: string) {
    const params = trainerId ? `?trainer_id=${trainerId}` : '';
    return this.http.get<TrainerOverview[]>(`${environment.apiUrl}/admin/trainers/overview${params}`);
  }
}
