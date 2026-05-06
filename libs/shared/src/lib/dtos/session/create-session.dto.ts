import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum SessionStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateSessionDto {
  @IsUUID()
  @IsNotEmpty()
  plan_id!: string;

  @IsUUID()
  @IsNotEmpty()
  trainer_id!: string;

  @IsUUID()
  @IsNotEmpty()
  athlete_id!: string;

  @IsDateString()
  @IsNotEmpty()
  session_date!: string;

  @IsString()
  @IsNotEmpty()
  session_time!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @IsString()
  @IsOptional()
  trainer_notes?: string;

  @IsString()
  @IsOptional()
  session_name?: string;

  @IsEnum(['cambio_climatico', 'entrenador', 'usuario'])
  @IsOptional()
  cancellation_reason?: string;

  @IsUUID()
  @IsOptional()
  rescheduled_from?: string;
}
