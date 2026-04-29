import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'forza_token';
const USER_KEY  = 'forza_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http       = inject(HttpClient);
  private router     = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser  = isPlatformBrowser(this.platformId);

  private getStorage(rememberMe = true) {
    if (!this.isBrowser) return null;
    return rememberMe ? localStorage : sessionStorage;
  }

  login(email: string, password: string, rememberMe = false) {
    return this.http.post<{ access_token: string; user: any }>(
      `${environment.apiUrl}/auth/login`,
      { email, password }
    ).pipe(
      tap(response => {
        const storage = rememberMe ? localStorage : sessionStorage;
        if (this.isBrowser) {
          storage.setItem(TOKEN_KEY, response.access_token);
          storage.setItem(USER_KEY, JSON.stringify(response.user));
        }
      })
    );
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): any {
    if (!this.isBrowser) return null;
    const user = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    return this.getCurrentUser()?.role ?? null;
  }
}
