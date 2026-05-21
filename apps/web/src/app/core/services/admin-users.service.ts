import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id:          string;
  email:       string;
  full_name:   string;
  role:        string;
  phone:       string | null;
  avatar_url:  string | null;
  is_active:   boolean;
  created_at:  string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/users`;

  getAll(role?: string) {
    const params = role ? `?role=${role}` : '';
    return this.http.get<AdminUser[]>(`${this.base}${params}`);
  }

  getOne(id: string) {
    return this.http.get<AdminUser>(`${this.base}/${id}`);
  }

  create(data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    phone?: string;
  }) {
    return this.http.post<AdminUser>(this.base, data);
  }

  update(id: string, data: {
    full_name?: string;
    role?: string;
    phone?: string;
  }) {
    return this.http.patch<AdminUser>(`${this.base}/${id}`, data);
  }

  toggleActive(id: string) {
    return this.http.patch<AdminUser>(`${this.base}/${id}/toggle-active`, {});
  }
}
