import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Payment {
  id:           string;
  athlete_id:   string;
  plan_id:      string | null;
  amount:       number;
  amount_paid:  number;
  status:       'pendiente' | 'parcial' | 'pagado';
  method:       'transferencia' | 'efectivo' | 'otro' | null;
  referencia:   string | null;
  payment_date: string | null;
  due_date:     string | null;
  notes:        string | null;
  created_at:   string;
  athletes?:    { id: string; first_name: string; last_name: string };
  plans?:       { id: string; plan_type: string } | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/payments`;

  getAll(athleteId?: string) {
    const params = athleteId ? `?athlete_id=${athleteId}` : '';
    return this.http.get<Payment[]>(`${this.base}${params}`);
  }

  getOne(id: string) {
    return this.http.get<Payment>(`${this.base}/${id}`);
  }

  create(data: Partial<Payment>) {
    return this.http.post<Payment>(this.base, data);
  }

  update(id: string, data: Partial<Payment>) {
    return this.http.patch<Payment>(`${this.base}/${id}`, data);
  }

  abonar(id: string, abono: number) {
    return this.http.patch<Payment>(`${this.base}/${id}/abonar`, { abono });
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
