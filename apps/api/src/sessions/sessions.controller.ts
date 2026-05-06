import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from '@forza/shared';
import { UpdateSessionDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  // GET /api/sessions
  @Roles('super_admin', 'admin', 'trainer')
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('trainer_id') trainerId?: string,
    @Query('athlete_id') athleteId?: string,
  ) {
    if (user.role === 'trainer') {
      return this.sessions.findAll(user.trainer_id, athleteId);
    }
    return this.sessions.findAll(trainerId, athleteId);
  }

  // GET /api/sessions/:id
  @Roles('super_admin', 'admin', 'trainer')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.findOne(id);
  }

  // POST /api/sessions
  @Roles('super_admin', 'admin', 'trainer')
  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  // PATCH /api/sessions/:id
  @Roles('super_admin', 'admin', 'trainer')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessions.update(id, dto);
  }

  // PATCH /api/sessions/:id/confirm-trainer
  @Roles('super_admin', 'admin', 'trainer')
  @Patch(':id/confirm-trainer')
  confirmByTrainer(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.confirmByTrainer(id);
  }

  // DELETE /api/sessions/:id
  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.remove(id);
  }

  // PATCH /api/sessions/:id/cancel
  @Roles('super_admin', 'admin', 'trainer')
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.sessions.cancel(id, reason);
  }

  // POST /api/sessions/:id/reschedule
  @Roles('super_admin', 'admin', 'trainer')
  @Post(':id/reschedule')
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessions.reschedule(id, dto);
  }
}
