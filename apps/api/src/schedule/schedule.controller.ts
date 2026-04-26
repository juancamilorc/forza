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
import { ScheduleService } from './schedule.service';
import { CreateAppointmentDto } from '@forza/shared';
import { UpdateAppointmentDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  // GET /api/schedule?trainer_id=uuid&date=2026-04-25
  @Roles('super_admin', 'admin', 'trainer')
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('trainer_id') trainerId?: string,
    @Query('date') date?: string,
  ) {
    if (user.role === 'trainer') {
      return this.schedule.findAll(user.trainer_id, date);
    }
    return this.schedule.findAll(trainerId, date);
  }

  // GET /api/schedule/:id
  @Roles('super_admin','admin', 'trainer')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedule.findOne(id);
  }

  // POST /api/schedule
  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.schedule.create(dto);
  }

  // PATCH /api/schedule/:id
  @Roles('super_admin', 'admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.schedule.update(id, dto);
  }

  // DELETE /api/schedule/:id
  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedule.remove(id);
  }
}
