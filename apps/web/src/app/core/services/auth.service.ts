import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'forza_token';
const USER_KEY  = 'forza_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  // ── Login ────────────────────────────────────────────────────
  login(email: string, password: string) {
    return this.http.post<{ access_token: string; user: any }>(
      `${environment.apiUrl}/auth/login`,
      { email, password }
    ).pipe(
      tap(response => {
        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      })
    );
  }

  // ── Logout ───────────────────────────────────────────────────
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  // ── Token ────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // ── Usuario actual ───────────────────────────────────────────
  getCurrentUser(): any {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  // ── ¿Está autenticado? ───────────────────────────────────────
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ── Rol del usuario ──────────────────────────────────────────
  getRole(): string | null {
    return this.getCurrentUser()?.role ?? null;
  }
} 
