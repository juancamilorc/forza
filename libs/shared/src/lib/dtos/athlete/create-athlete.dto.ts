import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';

export enum AthleteStatus {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
  TRIAL    = 'trial',
}

export enum AthleteGender {
  M = 'M',
  F = 'F',
}

export class CreateAthleteDto {
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsDateString()
  birth_date!: string;

  @IsUUID()
  @IsOptional()
  trainer_id?: string;

  @IsEnum(AthleteStatus)
  @IsOptional()
  status?: AthleteStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(AthleteGender)
  @IsNotEmpty()
  gender!: string;
}
