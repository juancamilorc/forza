import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { demoConfigErrors, isDemoActive, isDemoRequested, trustProxyHops } from './demo/demo.config';

const DEFAULT_ORIGINS = [
  'http://localhost:4200',
  'https://forza-momentum.vercel.app',
  'https://forza-git-develop-jcrc.vercel.app',
];

// CORS_ORIGINS (lista separada por comas) manda; sin ella, el modo demo solo
// admite localhost y los demás ambientes conservan la lista de siempre.
function allowedOrigins(demo: boolean): string[] {
  const fromEnv = (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  return demo ? ['http://localhost:4200'] : DEFAULT_ORIGINS;
}

async function bootstrap() {
  const demo = isDemoActive();
  if (isDemoRequested() && !demo) {
    Logger.warn('DEMO_MODE=true pero SUPABASE_URL no coincide con DEMO_SUPABASE_URL: el modo demo queda desactivado.');
  }

  if (demo) {
    const errors = demoConfigErrors();
    if (errors.length) throw new Error(`Configuración de demo inválida: ${errors.join('; ')}`);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Detrás del proxy de Render, sin esto el límite de peticiones vería una sola IP
  // (la del proxy) y todos los visitantes compartirían el mismo contador.
  if (demo) app.set('trust proxy', trustProxyHops());

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: allowedOrigins(demo),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? process.env.API_PORT ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
