import { Module } from '@nestjs/common';
import { AthletesService } from './athletes.service';
import { AthletesController } from './athletes.controller';

@Module({
  controllers: [AthletesController],
  providers:   [AthletesService],
  exports:     [AthletesService],
})
export class AthletesModule {}
