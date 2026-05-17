import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TrainersController } from './trainers.controller';

@Module({
  controllers: [AdminController, TrainersController],
  providers:   [AdminService],
  exports:     [AdminService],
})
export class AdminModule {}
