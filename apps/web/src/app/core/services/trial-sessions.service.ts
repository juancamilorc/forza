import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type TrialStatus = 'programada' | 'cancelada';
export type TrialPaymentStatus = 'pendiente' | 'pagado';

export interface TrialSession {
  id:                       string;
  child_name:               string;
  guardian_name:            string;
  guardian_whatsapp:        string;
  guardian_email:           string | null;
  trial_date:               string;
  trial_time:               string;
  location:                 string | null;
  trainer_id:               string | null;
  status:                   TrialStatus;
  payment_status:           TrialPaymentStatus;
  amount_paid:              number;
  converted_to_athlete_id:  string | null;
  notes:                    string | null;
  trainer?:                 { id: string; users: { full_name: string } } | null;
}

export interface TrialSessionsResponse {
  price: number;
  items: TrialSession[];
}

export interface TrialSessionInput {
  child_name:        string;
  guardian_name:     string;
  guardian_whatsapp: string;
  guardian_email?:   string;
  trial_date:        string;
  trial_time:        string;
  location?:         string;
  trainer_id:        string;
  notes?:            string;
}

export interface ConvertTrialInput {
  first_name: string;
  last_name:  string;
  birth_date: string;
  gender:     string;
}

@Injectable({ providedIn: 'root' })
export class TrialSessionsService {
  private http = inject(HttpClient);
  private url  = `${environment.apiUrl}/trial-sessions`;

  getAll() {
    return this.http.get<TrialSessionsResponse>(this.url);
  }

  create(data: TrialSessionInput) {
    return this.http.post<TrialSession>(this.url, data);
  }

  update(id: string, data: Partial<TrialSessionInput>) {
    return this.http.patch<TrialSession>(`${this.url}/${id}`, data);
  }

  cancel(id: string) {
    return this.http.patch<TrialSession>(`${this.url}/${id}/cancel`, {});
  }

  markPaid(id: string) {
    return this.http.patch<TrialSession>(`${this.url}/${id}/pay`, {});
  }

  convert(id: string, data: ConvertTrialInput) {
    return this.http.post<{ id: string }>(`${this.url}/${id}/convert`, data);
  }

  whatsappLink(id: string) {
    return this.http.get<{ url: string; message: string }>(`${this.url}/${id}/whatsapp-link`);
  }
}
