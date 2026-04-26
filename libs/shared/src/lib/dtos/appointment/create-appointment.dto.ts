import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsString,
  IsOptional,
} from 'class-validator';

export enum AppointmentType {
  TRIAL   = 'trial',
  REGULAR = 'regular',
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW   = 'no_show',
}

export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  trainer_id!: string;

  @IsUUID()
  @IsOptional()
  athlete_id?: string;

  @IsEnum(AppointmentType)
  @IsNotEmpty()
  type!: AppointmentType;

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @IsDateString()
  @IsNotEmpty()
  scheduled_date!: string;

  @IsString()
  @IsNotEmpty()
  scheduled_time!: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
