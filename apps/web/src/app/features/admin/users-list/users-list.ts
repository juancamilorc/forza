import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminUsersService, AdminUser } from '../../../core/services/admin-users.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-users-list',
  imports: [],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersList implements OnInit {
  private service = inject(AdminUsersService);
  private router  = inject(Router);
  private toast   = inject(ToastService);

  users    = signal<AdminUser[]>([]);
  filtered = signal<AdminUser[]>([]);
  loading  = signal(true);
  search   = signal('');
  roleFilter = signal('');

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        this.users.set(data);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value.toLowerCase());
    this.applyFilters();
  }

  onRoleFilter(role: string) {
    this.roleFilter.set(role);
    this.applyFilters();
  }

  applyFilters() {
    let result = this.users();
    const term = this.search();
    const role = this.roleFilter();

    if (term) {
      result = result.filter(u =>
        u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }
    if (role) {
      result = result.filter(u => u.role === role);
    }
    this.filtered.set(result);
  }

  toggleActive(user: AdminUser, event: Event) {
    event.stopPropagation();
    this.service.toggleActive(user.id).subscribe({
      next: (updated) => {
        this.users.update(list =>
          list.map(u => u.id === updated.id ? updated : u)
        );
        this.applyFilters();
        const msg = updated.is_active ? 'Usuario activado' : 'Usuario desactivado';
        this.toast.success(msg);
      },
      error: () => this.toast.error('Error al cambiar estado del usuario'),
    });
  }

  goToEdit(id: string, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/administracion/usuarios', id, 'editar']);
  }

  goToNew() {
    this.router.navigate(['/administracion/usuarios/nuevo']);
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      super_admin:  'Super Admin',
      admin:        'Admin',
      trainer:      'Entrenador',
      nutritionist: 'Nutricionista',
    };
    return labels[role] ?? role;
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
