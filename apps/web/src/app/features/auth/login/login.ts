import { Component, inject, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  encapsulation: ViewEncapsulation.None
})
export class Login {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/inicio']);
    }
  }

  demo         = environment.demo;
  demoRoles = [
    { role: 'admin' as const,        label: 'Administrador', icon: 'admin_panel_settings' },
    { role: 'trainer' as const,      label: 'Entrenador',    icon: 'sports' },
    { role: 'nutritionist' as const, label: 'Nutricionista', icon: 'nutrition' },
  ];

  email        = '';
  password     = '';
  loading      = false;
  error        = '';
  hidePassword = true;
  rememberMe   = false;

  // Enlace a WhatsApp de soporte; vacío si el ambiente no define número (demo).
  supportLink(text: string): string | null {
    const phone = environment.supportWhatsapp;
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : null;
  }

  enterAs(role: 'admin' | 'trainer' | 'nutritionist') {
    this.loading = true;
    this.error   = '';

    this.auth.demoLogin(role).subscribe({
      next: () => this.router.navigate(['/inicio']),
      error: () => {
        this.error   = 'No se pudo entrar. El servidor puede estar despertando, intenta de nuevo en unos segundos.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSubmit() {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.error   = '';

    this.auth.login(this.email, this.password, this.rememberMe).subscribe({
      next: () => {
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        this.error   = err.status === 401
          ? 'Correo o contraseña incorrectos'
          : 'Error de conexión. Intenta de nuevo.';
        this.loading = false;
        this.cdr.detectChanges(); // ← fuerza actualización de la vista
      },
    });
  }
}
