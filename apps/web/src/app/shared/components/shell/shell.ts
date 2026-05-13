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
  { label: 'Inicio',         icon: 'home',          route: '/dashboard',      roles: ['super_admin', 'admin', 'trainer', 'nutritionist'] },
  { label: 'Deportistas',    icon: 'groups',         route: '/athletes',       roles: ['super_admin', 'admin', 'trainer', 'nutritionist'] },
  { label: 'Planes',         icon: 'assignment',     route: '/plans',          roles: ['super_admin', 'admin'] },
  { label: 'Sesiones',       icon: 'fitness_center', route: '/sessions',       roles: ['super_admin', 'admin', 'trainer'] },
  { label: 'Agenda',         icon: 'calendar_today', route: '/schedule',       roles: ['super_admin', 'admin', 'trainer'] },
  { label: 'Evaluaciones',   icon: 'analytics',      route: '/assessments',    roles: ['super_admin', 'admin', 'trainer', 'nutritionist'] },
  { label: 'Pagos',          icon: 'payments',       route: '/payments',       roles: ['super_admin', 'admin'] },
  { label: 'Videos',         icon: 'video_library',  route: '/videos',         roles: ['super_admin', 'admin', 'trainer'] },
  { label: 'Administración', icon: 'manage_accounts', route: '/admin',         roles: ['super_admin', 'admin'] },
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

  user     = this.auth.getCurrentUser();
  role     = this.auth.getRole() ?? '';
  navItems = NAV_ITEMS.filter(item => item.roles.includes(this.role));
  currentRoute = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.currentRoute.set(e.urlAfterRedirects));
  }

  isActive(route: string): boolean {
    return this.currentRoute().startsWith(route);
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
