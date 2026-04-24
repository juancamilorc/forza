import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { AthletesModule } from '../athletes/athletes.module';
import { PlansModule } from '../plans/plans.module';
import { SessionsModule } from '../sessions/sessions.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    AuthModule,
    AthletesModule,
    PlansModule,
    SessionsModule
  ],
})
export class AppModule {}
