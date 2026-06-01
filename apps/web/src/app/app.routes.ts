import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolesGuard } from './core/guards/roles.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'inicio',
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
      // ── Rutas en español ───────────────────────────────────────
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'deportistas',
        loadComponent: () =>
          import('./features/athletes/athletes-list/athletes-list')
            .then(m => m.AthletesList),
      },
      {
        path: 'deportistas/nuevo',
        loadComponent: () =>
          import('./features/athletes/athlete-form/athlete-form')
            .then(m => m.AthleteForm),
      },
      {
        path: 'deportistas/:id/editar',
        loadComponent: () =>
          import('./features/athletes/athlete-form/athlete-form')
            .then(m => m.AthleteForm),
      },
      {
        path: 'deportistas/:id',
        loadComponent: () =>
          import('./features/athletes/athlete-detail/athlete-detail')
            .then(m => m.AthleteDetail),
      },
      {
        path: 'planes',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/plans/plans-list/plans-list')
            .then(m => m.PlansList),
      },
      {
        path: 'planes/nuevo',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/plans/plan-form/plan-form')
            .then(m => m.PlanForm),
      },
      {
        path: 'planes/:id/editar',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/plans/plan-form/plan-form')
            .then(m => m.PlanForm),
      },
      {
        path: 'sesiones',
        loadComponent: () =>
          import('./features/sessions/sessions-list/sessions-list')
            .then(m => m.SessionsList),
      },
      {
        path: 'sesiones/nueva',
        loadComponent: () =>
          import('./features/sessions/session-form/session-form')
            .then(m => m.SessionForm),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./features/schedule/schedule-list/schedule-list')
            .then(m => m.ScheduleList),
      },
      {
        path: 'agenda/nueva',
        loadComponent: () =>
          import('./features/schedule/appointment-form/appointment-form')
            .then(m => m.AppointmentForm),
      },
      {
        path: 'agenda/:id/editar',
        loadComponent: () =>
          import('./features/schedule/appointment-form/appointment-form')
            .then(m => m.AppointmentForm),
      },
      {
        path: 'pagos',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/payments/payments-list/payments-list')
            .then(m => m.PaymentsList),
      },
      {
        path: 'pagos/nuevo',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/payments/payment-form/payment-form')
            .then(m => m.PaymentForm),
      },
      {
        path: 'pagos/:id/editar',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/payments/payment-form/payment-form')
            .then(m => m.PaymentForm),
      },
      {
        path: 'evaluaciones',
        loadComponent: () =>
          import('./features/assessments/assessments-list/assessments-list')
            .then(m => m.AssessmentsList),
      },
      {
        path: 'evaluaciones/nutricional/nueva',
        canActivate: [rolesGuard('super_admin', 'nutritionist')],
        loadComponent: () =>
          import('./features/assessments/nutritional-form/nutritional-form')
            .then(m => m.NutritionalForm),
      },
      {
        path: 'evaluaciones/tecnica/nueva',
        canActivate: [rolesGuard('super_admin', 'trainer')],
        loadComponent: () =>
          import('./features/assessments/technical-form/technical-form')
            .then(m => m.TechnicalForm),
      },
      {
        path: 'evaluaciones/fisica/nueva',
        canActivate: [rolesGuard('super_admin', 'trainer')],
        loadComponent: () =>
          import('./features/assessments/physical-form/physical-form')
            .then(m => m.PhysicalForm),
      },
      {
        path: 'evaluaciones/nutricional/:id',
        loadComponent: () =>
          import('./features/assessments/nutritional-detail/nutritional-detail')
            .then(m => m.NutritionalDetail),
      },
      {
        path: 'evaluaciones/tecnica/:id',
        loadComponent: () =>
          import('./features/assessments/technical-detail/technical-detail')
            .then(m => m.TechnicalDetail),
      },
      {
        path: 'evaluaciones/fisica/:id',
        loadComponent: () =>
          import('./features/assessments/physical-detail/physical-detail')
            .then(m => m.PhysicalDetail),
      },
      {
        path: 'videos',
        canActivate: [rolesGuard('super_admin', 'admin', 'trainer')],
        loadComponent: () =>
          import('./features/videos/videos-list/videos-list')
            .then(m => m.VideosList),
      },
      {
        path: 'administracion',
        redirectTo: 'administracion/usuarios',
        pathMatch: 'full',
      },
      {
        path: 'administracion/usuarios',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/admin/users-list/users-list')
            .then(m => m.UsersList),
      },
      {
        path: 'administracion/usuarios/nuevo',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/admin/user-form/user-form')
            .then(m => m.UserForm),
      },
      {
        path: 'administracion/usuarios/:id/editar',
        canActivate: [rolesGuard('super_admin', 'admin')],
        loadComponent: () =>
          import('./features/admin/user-form/user-form')
            .then(m => m.UserForm),
      },
      // ── Redirects de rutas anteriores (compatibilidad) ─────────
      { path: 'dashboard',   redirectTo: 'inicio',         pathMatch: 'full' },
      { path: 'athletes',    redirectTo: 'deportistas',     pathMatch: 'full' },
      { path: 'plans',       redirectTo: 'planes',          pathMatch: 'full' },
      { path: 'sessions',    redirectTo: 'sesiones',        pathMatch: 'full' },
      { path: 'schedule',    redirectTo: 'agenda',          pathMatch: 'full' },
      { path: 'assessments', redirectTo: 'evaluaciones',    pathMatch: 'full' },
      { path: 'payments',    redirectTo: 'pagos',           pathMatch: 'full' },
      { path: 'admin',       redirectTo: 'administracion',  pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];
