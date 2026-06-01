import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rolesGuard = (...allowedRoles: string[]): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.getRole() ?? '';

  if (allowedRoles.includes(role)) return true;

  router.navigate(['/inicio']);
  return false;
};
