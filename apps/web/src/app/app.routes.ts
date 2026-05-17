import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/shell/shell').then(m => m.Shell),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'athletes',
        loadComponent: () =>
          import('./features/athletes/athletes-list/athletes-list')
            .then(m => m.AthletesList),
      },
      {
        path: 'athletes/new',
        loadComponent: () =>
          import('./features/athletes/athlete-form/athlete-form')
            .then(m => m.AthleteForm),
      },
      {
        path: 'athletes/:id/edit',
        loadComponent: () =>
          import('./features/athletes/athlete-form/athlete-form')
            .then(m => m.AthleteForm),
      },
      {
        path: 'athletes/:id',
        loadComponent: () =>
          import('./features/athletes/athlete-detail/athlete-detail')
            .then(m => m.AthleteDetail),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./features/sessions/sessions-list/sessions-list')
            .then(m => m.SessionsList),
      },
      {
        path: 'sessions/new',
        loadComponent: () =>
          import('./features/sessions/session-form/session-form')
            .then(m => m.SessionForm),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
