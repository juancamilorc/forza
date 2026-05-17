import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Trainer {
  id:       string;
  user_id:  string;
  users:    { full_name: string; email: string; };
}

@Injectable({ providedIn: 'root' })
export class TrainersService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/trainers`);
  }
}
