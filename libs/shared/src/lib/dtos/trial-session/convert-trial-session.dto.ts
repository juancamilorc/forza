import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { AthleteGender } from '../athlete/create-athlete.dto';

// Datos que la clase de prueba no capturó y que el deportista real sí exige
export class ConvertTrialSessionDto {
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsDateString()
  birth_date!: string;

  @IsEnum(AthleteGender)
  gender!: string;

  @IsUUID()
  @IsOptional()
  trainer_id?: string;
}
