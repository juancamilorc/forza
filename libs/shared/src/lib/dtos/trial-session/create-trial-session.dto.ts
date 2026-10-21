import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateTrialSessionDto {
  @IsString()
  @IsNotEmpty()
  child_name!: string;

  @IsString()
  @IsNotEmpty()
  guardian_name!: string;

  @IsString()
  @IsNotEmpty()
  guardian_whatsapp!: string;

  @IsEmail()
  @IsOptional()
  guardian_email?: string;

  @IsDateString()
  trial_date!: string;

  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'trial_time debe tener formato HH:mm' })
  trial_time!: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUUID()
  trainer_id!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
