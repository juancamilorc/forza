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
import { PlansService } from './plans.service';
import { CreatePlanDto } from '@forza/shared';
import { UpdatePlanDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  // GET /api/plans?athlete_id=uuid
  @Roles('super_admin', 'admin')
  @Get()
  findAll(@Query('athlete_id') athleteId?: string) {
    return this.plans.findAll(athleteId);
  }

  // GET /api/plans/:id
  @Roles('super_admin', 'admin')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.findOne(id);
  }

  // POST /api/plans
  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  // PATCH /api/plans/:id
  @Roles('super_admin', 'admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }

  // DELETE /api/plans/:id
  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.remove(id);
  }
  // PATCH /api/plans/:id/freeze
  @Roles('super_admin', 'admin')
  @Patch(':id/freeze')
  freeze(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.plans.freeze(id, reason);
  }

  // PATCH /api/plans/:id/unfreeze
  @Roles('super_admin', 'admin')
  @Patch(':id/unfreeze')
  unfreeze(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.unfreeze(id);
  }

  // PATCH /api/plans/:id/cancel
  @Roles('super_admin', 'admin')
  @Patch(':id/cancel')
  cancelPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.cancelPlan(id);
  }
}
