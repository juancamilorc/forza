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
  async findAll(
    @CurrentUser() user: any,
    @Query('trainer_id') trainerId?: string,
    @Query('date') date?: string,
  ) {
    if (user.role === 'trainer') {
      const myTrainerId = await this.schedule.getTrainerIdByUserId(user.id);
      if (!myTrainerId) return [];
      return this.schedule.findAll(myTrainerId, date);
    }
    return this.schedule.findAll(trainerId, date);
  }

  // GET /api/schedule/:id
  @Roles('super_admin', 'admin', 'trainer')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedule.findOne(id);
  }

  // POST /api/schedule
  @Roles('super_admin', 'admin', 'trainer')
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateAppointmentDto,
  ) {
    if (user.role === 'trainer') {
      const myTrainerId = await this.schedule.getTrainerIdByUserId(user.id);
      if (!myTrainerId) throw new Error('El usuario no tiene perfil de entrenador');
      return this.schedule.create({ ...dto, trainer_id: myTrainerId });
    }
    return this.schedule.create(dto);
  }

  // PATCH /api/schedule/:id
  @Roles('super_admin', 'admin', 'trainer')
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
