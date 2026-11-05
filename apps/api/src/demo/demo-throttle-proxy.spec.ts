import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AddressInfo } from 'net';
import { trustProxyHops } from './demo.config';

@Controller('ping')
class PingController {
  @Get() ping() { return { ok: true }; }
}

// Un servidor real con el mismo ThrottlerGuard de la demo y un límite pequeño.
// Los visitantes se simulan con X-Forwarded-For, como los pone el proxy de Render.
async function start(hops: string | undefined) {
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 3 }])],
    controllers: [PingController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.set('trust proxy', trustProxyHops({ TRUST_PROXY_HOPS: hops } as NodeJS.ProcessEnv));
  await app.listen(0);
  const port = (app.getHttpServer().address() as AddressInfo).port;
  const hit = async (xff: string) =>
    (await fetch(`http://127.0.0.1:${port}/ping`, { headers: { 'X-Forwarded-For': xff } })).status;
  return { app, hit };
}

describe('límite de peticiones detrás de un proxy', () => {
  let app: INestApplication;
  afterEach(async () => { await app?.close(); });

  it('con trust proxy (1 salto) cada visitante tiene su propio contador', async () => {
    const s = await start('1');
    app = s.app;
    for (let i = 0; i < 3; i++) expect(await s.hit('10.0.0.1')).toBe(200);
    expect(await s.hit('10.0.0.1')).toBe(429);   // el visitante A agotó su cupo
    expect(await s.hit('10.0.0.2')).toBe(200);   // el visitante B no se ve afectado
  });

  it('un X-Forwarded-For inventado por el visitante no le da contador nuevo', async () => {
    const s = await start('1');
    app = s.app;
    for (let i = 0; i < 3; i++) expect(await s.hit('10.0.0.1')).toBe(200);
    // El proxy agrega al final la IP real; lo que el visitante antepone se ignora
    expect(await s.hit('99.99.99.99, 10.0.0.1')).toBe(429);
  });

  it('sin trust proxy (0 saltos) todos comparten el contador del proxy: lo que se corrige', async () => {
    const s = await start('0');
    app = s.app;
    for (let i = 0; i < 3; i++) expect(await s.hit('10.0.0.1')).toBe(200);
    expect(await s.hit('10.0.0.2')).toBe(429);   // otro visitante bloqueado por el primero
  });
});
