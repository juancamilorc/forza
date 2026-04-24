import { SessionsService } from './sessions.service';
import { Module } from "@nestjs/common";
import { SessionsController } from "./sessions.controller";
import { GuardianConfirmController } from "./guardian-confirm.controller";

@Module({
  controllers: [SessionsController, GuardianConfirmController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
