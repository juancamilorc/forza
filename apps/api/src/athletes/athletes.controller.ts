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
import { AthletesService } from './athletes.service';
import { CreateAthleteDto } from '@forza/shared';
import { UpdateAthleteDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletes: AthletesService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('trainer_id') trainerId?: string) {
    if (user.role === 'trainer') {
      return this.athletes.findAll(user.trainer_id);
    }
    return this.athletes.findAll(trainerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.athletes.findOne(id);
  }

  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreateAthleteDto) {
    return this.athletes.create(dto);
  }

  @Roles('super_admin', 'admin', 'trainer')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAthleteDto,
  ) {
    return this.athletes.update(id, dto);
  }

  @Roles('super_admin', 'admin')
  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.athletes.changeStatus(id, status);
  }

  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.athletes.remove(id);
  }
}
