import { IsDateString, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class RescheduleSessionDto {
  @IsDateString()
  @IsNotEmpty()
  session_date!: string;

  @IsString()
  @IsNotEmpty()
  session_time!: string;

  @IsString()
  @IsOptional()
  trainer_id?: string | null;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(['cambio_climatico', 'entrenador', 'usuario'])
  @IsOptional()
  cancellation_reason?: string;
}
