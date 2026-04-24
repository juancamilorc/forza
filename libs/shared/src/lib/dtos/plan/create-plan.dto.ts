import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsDateString,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export enum PlanType {
  MOMENTUM             = 'momentum',
  MOMENTUM_PRO         = 'momentum_pro',
  MASTER               = 'master',
  MASTER_PRO           = 'master_pro',
  FRZ                  = 'frz',
  FRZ_PRO              = 'frz_pro',
  ELITE                = 'elite',
  ELITE_PRO            = 'elite_pro',
  ADDICTED_TO_FOOTBALL = 'addicted_to_football',
}

export class CreatePlanDto {
  @IsUUID()
  @IsNotEmpty()
  athlete_id!: string;

  @IsEnum(PlanType)
  @IsNotEmpty()
  plan_type!: PlanType;

  @IsInt()
  @Min(1)
  total_sessions!: number;

  @IsDateString()
  @IsNotEmpty()
  start_date!: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
