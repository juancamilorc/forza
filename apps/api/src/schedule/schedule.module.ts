import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { TrainerAvailabilityModule } from '../trainer-availability/trainer-availability.module';

@Module({
  imports:     [TrainerAvailabilityModule],
  controllers: [ScheduleController],
  providers:   [ScheduleService],
  exports:     [ScheduleService],
})
export class ScheduleModule {}
