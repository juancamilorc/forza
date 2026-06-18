import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getStats(role: string) {
    const canSeePayments = ['super_admin', 'admin'].includes(role);

    return forkJoin({
      athletes: this.http.get<any[]>(`${environment.apiUrl}/athletes`),
      sessions: this.http.get<any[]>(`${environment.apiUrl}/sessions`),
      payments: canSeePayments
        ? this.http.get<any[]>(`${environment.apiUrl}/payments`)
        : of([]),
    }).pipe(
      map(({ athletes, sessions, payments }) => {
        const today = new Date().toISOString().split('T')[0];
        const overduePayments = payments
          .filter((p: any) => p.due_date && p.due_date < today && p.status !== 'pagado')
          .sort((a: any, b: any) => a.due_date.localeCompare(b.due_date));

        return {
          athletes:        athletes.filter(a => a.status === 'active').length,
          sessions:        sessions.filter(s => {
                             const date = new Date(s.session_date);
                             const now  = new Date();
                             return date.getMonth() === now.getMonth() &&
                                    date.getFullYear() === now.getFullYear();
                           }).length,
          assessments:     0,
          payments:        payments.filter((p: any) => p.status === 'pendiente' || p.status === 'parcial').length,
          overduePayments,
        };
      })
    );
  }
}
