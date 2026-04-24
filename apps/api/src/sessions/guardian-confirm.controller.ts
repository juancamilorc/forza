import { Controller, Post, Body } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { ConfirmSessionDto } from '@forza/shared';

@Controller('confirm')
export class GuardianConfirmController {
  constructor(private readonly sessions: SessionsService) {}

  // POST /api/confirm
  // Endpoint público — sin JWT, lo usa el acudiente desde el link de WhatsApp
  @Post()
  confirm(@Body() dto: ConfirmSessionDto) {
    return this.sessions.confirmByGuardian(dto);
  }
}
