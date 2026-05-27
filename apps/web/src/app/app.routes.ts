import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolesGuard } from './core/guards/roles.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
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
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/schedule/schedule-list/schedule-list')
            .then(m => m.ScheduleList),
      },
      {
        path: 'schedule/new',
        loadComponent: () =>
          import('./features/schedule/appointment-form/appointment-form')
            .then(m => m.AppointmentForm),
      },
      {
        path: 'schedule/:id/edit',
        loadComponent: () =>
          import('./features/schedule/appointment-form/appointment-form')
            .then(m => m.AppointmentForm),
      },
      {
        path: 'payments',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/payments/payments-list/payments-list')
            .then(m => m.PaymentsList),
      },
      {
        path: 'payments/new',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/payments/payment-form/payment-form')
            .then(m => m.PaymentForm),
      },
      {
        path: 'payments/:id/edit',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/payments/payment-form/payment-form')
            .then(m => m.PaymentForm),
      },
      {
        path: 'assessments/nutritional/new',
        canActivate: [rolesGuard('super_admin', 'nutritionist')],
        loadComponent: () =>
          import('./features/assessments/nutritional-form/nutritional-form')
            .then(m => m.NutritionalForm),
      },
      {
        path: 'assessments/technical/new',
        canActivate: [rolesGuard('super_admin', 'trainer')],
        loadComponent: () =>
          import('./features/assessments/technical-form/technical-form')
            .then(m => m.TechnicalForm),
      },
      {
        path: 'admin',
        redirectTo: 'admin/users',
        pathMatch: 'full',
      },
      {
        path: 'admin/users',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/admin/users-list/users-list')
            .then(m => m.UsersList),
      },
      {
        path: 'admin/users/new',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/admin/user-form/user-form')
            .then(m => m.UserForm),
      },
      {
        path: 'admin/users/:id/edit',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/admin/user-form/user-form')
            .then(m => m.UserForm),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
