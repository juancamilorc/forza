import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TrialSessionsService } from './trial-sessions.service';
import {
  CreateTrialSessionDto,
  UpdateTrialSessionDto,
  ConvertTrialSessionDto,
} from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Todo el módulo es solo para admin: las clases de prueba no las ven los entrenadores.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
@Controller('trial-sessions')
export class TrialSessionsController {
  constructor(private readonly trials: TrialSessionsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.trials.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.trials.findOne(id);
  }

  @Get(':id/whatsapp-link')
  whatsappLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.trials.whatsappLink(id);
  }

  @Post()
  create(@Body() dto: CreateTrialSessionDto) {
    return this.trials.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrialSessionDto,
  ) {
    return this.trials.update(id, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.trials.cancel(id);
  }

  @Patch(':id/pay')
  markPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.trials.markPaid(id);
  }

  @Post(':id/convert')
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertTrialSessionDto,
  ) {
    return this.trials.convert(id, dto);
  }
}
