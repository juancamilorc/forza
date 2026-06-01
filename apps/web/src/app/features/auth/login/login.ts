import { Component, inject, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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

  email        = '';
  password     = '';
  loading      = false;
  error        = '';
  hidePassword = true;
  rememberMe   = false;

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
