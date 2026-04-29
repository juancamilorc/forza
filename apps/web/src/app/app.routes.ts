import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login), // temporal
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
