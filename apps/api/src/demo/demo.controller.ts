import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { DemoLoginDto } from './demo-login.dto';

// Solo se registra cuando el modo demo está activo (ver DemoModule).
@Controller('auth')
export class DemoController {
  constructor(private auth: AuthService) {}

  // POST /api/auth/demo-login  { role: 'admin' | 'trainer' | 'nutritionist' }
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('demo-login')
  demoLogin(@Body() dto: DemoLoginDto) {
    return this.auth.signInDemo(dto.role);
  }
}
