import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminUsersService } from '../../../core/services/admin-users.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-user-form',
  imports: [],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private service = inject(AdminUsersService);
  private toast   = inject(ToastService);

  isEdit  = signal(false);
  loading = signal(false);
  saving  = signal(false);
  error   = signal('');

  form = signal({
    full_name: '',
    email:     '',
    password:  '',
    role:      '',
    phone:     '',
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.loading.set(true);
      this.service.getOne(id).subscribe({
        next: (user) => {
          this.form.set({
            full_name: user.full_name,
            email:     user.email,
            password:  '',
            role:      user.role,
            phone:     user.phone ?? '',
          });
          this.loading.set(false);
        },
        error: () => this.router.navigate(['/admin/users']),
      });
    }
  }

  updateField(field: string, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  onSubmit() {
    const f = this.form();

    if (!f.full_name || !f.email || !f.role) {
      this.error.set('Nombre, email y rol son obligatorios');
      return;
    }
    if (!this.isEdit() && !f.password) {
      this.error.set('La contraseña es obligatoria');
      return;
    }
    if (!this.isEdit() && f.password.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const id = this.route.snapshot.paramMap.get('id');

    if (this.isEdit() && id) {
      const data: any = { full_name: f.full_name, role: f.role };
      if (f.phone) data.phone = f.phone;

      this.service.update(id, data).subscribe({
        next: () => {
          this.toast.success('Usuario actualizado correctamente');
          setTimeout(() => this.router.navigate(['/admin/users']), 500);
        },
        error: () => {
          this.error.set('Error al guardar. Intenta de nuevo.');
          this.saving.set(false);
        },
      });
    } else {
      const data: any = {
        full_name: f.full_name,
        email:     f.email,
        password:  f.password,
        role:      f.role,
      };
      if (f.phone) data.phone = f.phone;

      this.service.create(data).subscribe({
        next: () => {
          this.toast.success('Usuario creado correctamente');
          setTimeout(() => this.router.navigate(['/admin/users']), 500);
        },
        error: (err) => {
          const msg: string = err?.error?.message ?? '';
          if (err?.status === 409 || msg.toLowerCase().includes('registrado')) {
            this.error.set('Ya existe un usuario con ese email');
          } else {
            this.error.set('Error al crear usuario. Intenta de nuevo.');
          }
          this.saving.set(false);
        },
      });
    }
  }

  goBack() {
    this.router.navigate(['/admin/users']);
  }
}
