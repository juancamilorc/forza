import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Session {
  id:                    string;
  plan_id:               string;
  trainer_id:            string;
  athlete_id:            string;
  session_number:        number;
  session_date:          string;
  session_time:          string;
  session_name:          string | null;
  location:              string;
  status:                string;
  confirmation_status:   string;
  confirmed_by_trainer:  boolean;
  confirmed_by_guardian: boolean;
  confirmation_token:    string;
  trainer_notes:         string | null;
  athletes?:             { id: string; first_name: string; last_name: string };
  plans?:                { id: string; plan_type: string; total_sessions: number };
  trainers?:             { id: string; users: { full_name: string } };
}

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private http = inject(HttpClient);
  private url  = `${environment.apiUrl}/sessions`;

  getAll(athleteId?: string) {
    const params = athleteId ? `?athlete_id=${athleteId}` : '';
    return this.http.get<Session[]>(`${this.url}${params}`);
  }

  getOne(id: string) {
    return this.http.get<Session>(`${this.url}/${id}`);
  }

  create(data: any) {
    return this.http.post<Session>(this.url, data);
  }

  update(id: string, data: any) {
    return this.http.patch<Session>(`${this.url}/${id}`, data);
  }

  confirmTrainer(id: string) {
    return this.http.patch<Session>(`${this.url}/${id}/confirm-trainer`, {});
  }

  cancel(id: string, reason: string) {
    return this.http.patch<Session>(`${this.url}/${id}/cancel`, { reason });
  }
}
