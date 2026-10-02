import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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

  // GET /api/admin/trainers/overview — FOR-68
  @Roles('super_admin', 'admin', 'trainer')
  @Get('overview')
  async getTrainersOverview(
    @CurrentUser() user: any,
    @Query('trainer_id') trainerId?: string,
  ) {
    if (user.role === 'trainer') {
      const myTrainerId = await this.admin.getTrainerIdByUserId(user.id);
      if (!myTrainerId) return [];
      return this.admin.getTrainersOverview(myTrainerId);
    }
    return this.admin.getTrainersOverview(trainerId);
  }
}
