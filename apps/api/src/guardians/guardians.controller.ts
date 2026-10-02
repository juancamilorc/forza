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
import { GuardiansService } from './guardians.service';
import { CreateGuardianDto, UpdateGuardianDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Get()
  findAll(@Query('athlete_id') athleteId?: string) {
    return this.guardians.findAll(athleteId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.findOne(id);
  }

  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreateGuardianDto) {
    return this.guardians.create(dto);
  }

  @Roles('super_admin', 'admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuardianDto,
  ) {
    return this.guardians.update(id, dto);
  }

  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.guardians.remove(id);
  }
}
