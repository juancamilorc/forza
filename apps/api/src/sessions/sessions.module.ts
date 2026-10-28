import { SessionsService } from './sessions.service';
import { Module } from "@nestjs/common";
import { SessionsController } from "./sessions.controller";
import { GuardianConfirmController } from "./guardian-confirm.controller";
import { TrainerAvailabilityModule } from "../trainer-availability/trainer-availability.module";

@Module({
  imports: [TrainerAvailabilityModule],
  controllers: [SessionsController, GuardianConfirmController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
