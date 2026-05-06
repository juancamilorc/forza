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
import { AssessmentsService } from './assessments.service';
import {
  CreateNutritionalAssessmentDto,
  UpdateNutritionalAssessmentDto,
  CreateTechnicalAssessmentDto,
  UpdateTechnicalAssessmentDto,
  CreatePhysicalAssessmentDto,
  UpdatePhysicalAssessmentDto,
} from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  // ── NUTRICIONAL ──────────────────────────────────────────────

  @Roles('super_admin', 'admin', 'trainer', 'nutritionist')
  @Get('nutritional')
  findAllNutritional(@Query('athlete_id') athleteId?: string) {
    return this.assessments.findAllNutritional(athleteId);
  }

  @Roles('super_admin', 'admin', 'trainer', 'nutritionist')
  @Get('nutritional/:id')
  findOneNutritional(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.findOneNutritional(id);
  }

  @Roles('super_admin', 'nutritionist')
  @Post('nutritional')
  createNutritional(@Body() dto: CreateNutritionalAssessmentDto) {
    return this.assessments.createNutritional(dto);
  }

  @Roles('super_admin', 'nutritionist')
  @Patch('nutritional/:id')
  updateNutritional(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNutritionalAssessmentDto,
  ) {
    return this.assessments.updateNutritional(id, dto);
  }

  // ── TÉCNICA ──────────────────────────────────────────────────

  @Roles('super_admin', 'admin', 'trainer', 'nutritionist')
  @Get('technical')
  findAllTechnical(@Query('athlete_id') athleteId?: string) {
    return this.assessments.findAllTechnical(athleteId);
  }

  @Roles('super_admin', 'admin', 'trainer', 'nutritionist')
  @Get('technical/:id')
  findOneTechnical(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.findOneTechnical(id);
  }

  @Roles('super_admin', 'admin', 'trainer')
  @Post('technical')
  createTechnical(@Body() dto: CreateTechnicalAssessmentDto) {
    return this.assessments.createTechnical(dto);
  }

  @Roles('super_admin', 'admin', 'trainer')
  @Patch('technical/:id')
  updateTechnical(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTechnicalAssessmentDto,
  ) {
    return this.assessments.updateTechnical(id, dto);
  }

  // ── FÍSICA ───────────────────────────────────────────────────

  @Roles('super_admin', 'admin', 'trainer', 'nutritionist')
  @Get('physical')
  findAllPhysical(@Query('athlete_id') athleteId?: string) {
    return this.assessments.findAllPhysical(athleteId);
  }

  @Roles('super_admin', 'admin', 'trainer', 'nutritionist')
  @Get('physical/:id')
  findOnePhysical(@Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.findOnePhysical(id);
  }

  @Roles('super_admin', 'admin', 'trainer')
  @Post('physical')
  createPhysical(@Body() dto: CreatePhysicalAssessmentDto) {
    return this.assessments.createPhysical(dto);
  }

  @Roles('super_admin', 'admin', 'trainer')
  @Patch('physical/:id')
  updatePhysical(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePhysicalAssessmentDto,
  ) {
    return this.assessments.updatePhysical(id, dto);
  }
}
