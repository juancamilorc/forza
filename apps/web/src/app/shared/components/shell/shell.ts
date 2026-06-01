import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { filter } from 'rxjs/operators';
import { Toast } from '../toast/toast';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio',         icon: 'home',           route: '/inicio',          roles: ['super_admin', 'admin', 'trainer', 'nutritionist'] },
  { label: 'Deportistas',    icon: 'groups',          route: '/deportistas',     roles: ['super_admin', 'admin', 'trainer', 'nutritionist'] },
  { label: 'Planes',         icon: 'assignment',      route: '/planes',          roles: ['super_admin', 'admin'] },
  { label: 'Sesiones',       icon: 'fitness_center',  route: '/sesiones',        roles: ['super_admin', 'admin', 'trainer'] },
  { label: 'Agenda',         icon: 'calendar_today',  route: '/agenda',          roles: ['super_admin', 'admin', 'trainer'] },
  { label: 'Evaluaciones',   icon: 'analytics',       route: '/evaluaciones',    roles: ['super_admin', 'admin', 'trainer', 'nutritionist'] },
  { label: 'Pagos',          icon: 'payments',        route: '/pagos',           roles: ['super_admin', 'admin'] },
  { label: 'Videos',         icon: 'video_library',   route: '/videos',          roles: ['super_admin', 'admin', 'trainer'] },
  { label: 'Administración', icon: 'manage_accounts', route: '/administracion',  roles: ['super_admin', 'admin'] },
];

@Component({
  selector: 'app-shell',
  imports: [RouterModule, Toast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private auth   = inject(AuthService);
  private router = inject(Router);

  user        = this.auth.getCurrentUser();
  role        = this.auth.getRole() ?? '';
  navItems    = NAV_ITEMS.filter(item => item.roles.includes(this.role));
  currentRoute  = signal(this.router.url);
  sidebarOpen   = signal(false);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute.set(e.urlAfterRedirects);
        this.sidebarOpen.set(false);
      });
  }

  isActive(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  logout() {
    this.auth.logout();
  }

  getRoleBadge(): string {
    const badges: Record<string, string> = {
      super_admin:  'Super Admin',
      admin:        'Admin',
      trainer:      'Entrenador',
      nutritionist: 'Nutricionista',
    };
    return badges[this.role] ?? this.role;
  }

  navigate(route: string) {
  this.router.navigate([route]);
  }
}
