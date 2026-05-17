import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/trainers')
export class TrainersController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/admin/trainers
  @Roles('super_admin', 'admin', 'trainer')
  @Get()
  getTrainers() {
    return this.admin.getTrainers();
  }
}
