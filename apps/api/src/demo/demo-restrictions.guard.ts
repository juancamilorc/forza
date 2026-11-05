import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const MESSAGE = 'Acción no disponible en el entorno de demostración';

// Guard global, solo activo en modo demo. Corre antes de los guards de cada
// controlador, por eso decide solo por método y ruta.
@Injectable()
export class DemoRestrictionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const method = String(req.method ?? '').toUpperCase();
    // Express no distingue mayúsculas ni barras repetidas al enrutar: normalizamos igual.
    const path = String(req.originalUrl ?? req.url ?? '')
      .split('?')[0]
      .toLowerCase()
      .replace(/\/{2,}/g, '/')
      .replace(/\/+$/, '');

    if (method === 'DELETE') throw new ForbiddenException(MESSAGE);

    // login por contraseña y logout (este último llama a supabase.auth.admin.signOut)
    if (path.endsWith('/auth/login') || path.endsWith('/auth/logout')) {
      throw new ForbiddenException(MESSAGE);
    }

    const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (!readOnly && /\/admin\/users(\/|$)/.test(path)) {
      throw new ForbiddenException(MESSAGE);
    }

    return true;
  }
}
