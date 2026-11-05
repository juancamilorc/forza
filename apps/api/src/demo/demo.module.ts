import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { DemoController } from './demo.controller';
import { DemoRestrictionsGuard } from './demo-restrictions.guard';
import { isDemoActive } from './demo.config';

@Module({})
export class DemoModule {
  // Con el modo demo inactivo el módulo queda vacío: no hay ruta demo-login,
  // ni bloqueos, ni límite de peticiones.
  static register(): DynamicModule {
    if (!isDemoActive()) return { module: DemoModule };

    return {
      module: DemoModule,
      imports: [
        AuthModule,
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
      ],
      controllers: [DemoController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: DemoRestrictionsGuard },
      ],
    };
  }
}
