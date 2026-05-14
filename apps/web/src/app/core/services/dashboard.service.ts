import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getStats() {
    return forkJoin({
      athletes: this.http.get<any[]>(`${environment.apiUrl}/athletes`),
      sessions: this.http.get<any[]>(`${environment.apiUrl}/sessions`),
      payments: this.http.get<any[]>(`${environment.apiUrl}/payments`),
    }).pipe(
      map(({ athletes, sessions, payments }) => ({
        athletes:    athletes.filter(a => a.status === 'active').length,
        sessions:    sessions.filter(s => {
                       const date = new Date(s.session_date);
                       const now  = new Date();
                       return date.getMonth() === now.getMonth() &&
                              date.getFullYear() === now.getFullYear();
                     }).length,
        assessments: 0, // lo conectamos después
        payments:    payments.filter(p => p.status === 'pendiente' || p.status === 'parcial').length,
      }))
    );
  }
}
