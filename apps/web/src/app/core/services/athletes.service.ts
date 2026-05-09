import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Athlete {
  id:         string;
  first_name: string;
  last_name:  string;
  birth_date: string;
  status:     string;
  trainer_id: string | null;
  photo_url:  string | null;
  notes:      string | null;
  age:        number;
  gender:     string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AthletesService {
  private http = inject(HttpClient);
  private url  = `${environment.apiUrl}/athletes`;

  getAll(trainerId?: string) {
    const params = trainerId ? `?trainer_id=${trainerId}` : '';
    return this.http.get<Athlete[]>(`${this.url}${params}`);
  }

  getOne(id: string) {
    return this.http.get<Athlete>(`${this.url}/${id}`);
  }

  create(data: Partial<Athlete>) {
    return this.http.post<Athlete>(this.url, data);
  }

  update(id: string, data: Partial<Athlete>) {
    return this.http.patch<Athlete>(`${this.url}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
