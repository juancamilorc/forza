import { Module } from '@nestjs/common';
import { TrainerAvailabilityService } from './trainer-availability.service';

@Module({
  providers: [TrainerAvailabilityService],
  exports:   [TrainerAvailabilityService],
})
export class TrainerAvailabilityModule {}
