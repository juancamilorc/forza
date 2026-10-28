import { Module } from '@nestjs/common';
import { TrialSessionsService } from './trial-sessions.service';
import { TrialSessionsController } from './trial-sessions.controller';

@Module({
  controllers: [TrialSessionsController],
  providers:   [TrialSessionsService],
})
export class TrialSessionsModule {}
