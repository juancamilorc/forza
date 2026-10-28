import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  Matches,
} from 'class-validator';

export const TRAINER_DAYS = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
] as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Disponibilidad del entrenador (FOR-77). Todos los campos son opcionales:
// sin días/horas configurados el entrenador no tiene restricción.
export class UpdateTrainerDto {
  @IsString()
  @IsOptional()
  coverage_area?: string;

  @IsArray()
  @IsIn(TRAINER_DAYS as unknown as string[], { each: true })
  @IsOptional()
  available_days?: string[];

  @Matches(HHMM, { message: 'available_hours_start debe tener formato HH:mm' })
  @IsOptional()
  available_hours_start?: string;

  @Matches(HHMM, { message: 'available_hours_end debe tener formato HH:mm' })
  @IsOptional()
  available_hours_end?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
