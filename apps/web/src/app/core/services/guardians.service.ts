import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Guardian {
  id:             string;
  athlete_id:     string;
  full_name:      string;
  whatsapp_phone: string;
  email:          string | null;
  relationship:   string | null;
  is_primary:     boolean;
  created_at:     string;
}

@Injectable({ providedIn: 'root' })
export class GuardiansService {
  private http = inject(HttpClient);
  private url  = `${environment.apiUrl}/guardians`;

  getByAthlete(athleteId: string) {
    return this.http.get<Guardian[]>(`${this.url}?athlete_id=${athleteId}`);
  }

  create(data: Partial<Guardian>) {
    return this.http.post<Guardian>(this.url, data);
  }

  update(id: string, data: Partial<Guardian>) {
    return this.http.patch<Guardian>(`${this.url}/${id}`, data);
  }
}
