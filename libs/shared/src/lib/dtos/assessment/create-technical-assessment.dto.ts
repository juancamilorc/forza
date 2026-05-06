import {
  IsUUID, IsNotEmpty, IsDateString, IsOptional,
  IsString, IsNumber, IsEnum, IsInt, Min, Max,
} from 'class-validator';

export enum TechnicalClassification {
  BUENO      = 'bueno',
  ACEPTABLE  = 'aceptable',
  INADECUADO = 'inadecuado',
}

export class CreateTechnicalAssessmentDto {
  @IsUUID()
  @IsNotEmpty()
  athlete_id!: string;

  @IsUUID()
  @IsNotEmpty()
  evaluator_id!: string;

  @IsDateString()
  @IsNotEmpty()
  evaluation_date!: string;

  @IsString()
  @IsOptional()
  period_label?: string;

  // ── Conducción velocidad (segundos) ──────────────────────────
  @IsNumber()
  @IsOptional()
  conduccion_5m?: number;

  @IsNumber()
  @IsOptional()
  conduccion_10m?: number;

  @IsNumber()
  @IsOptional()
  conduccion_20m?: number;

  // ── Cambios de dirección (segundos) ──────────────────────────
  @IsNumber()
  @IsOptional()
  cambios_direccion_derecha?: number;

  @IsNumber()
  @IsOptional()
  cambios_direccion_izquierda?: number;

  // ── Control de balón (0-2 por zona) ──────────────────────────
  @IsInt() @Min(0) @Max(2) @IsOptional()
  control_rastrero_dr?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  control_rastrero_iz?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  control_media_altura_dr?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  control_media_altura_iz?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  control_alto_dr?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  control_alto_iz?: number;

  @IsEnum(TechnicalClassification)
  @IsOptional()
  control_clasificacion?: TechnicalClassification;

  @IsString()
  @IsOptional()
  control_notas?: string;

  // ── Precisión en el pase (0-4 por pierna) ────────────────────
  @IsInt() @Min(0) @Max(4) @IsOptional()
  pase_derecha?: number;

  @IsInt() @Min(0) @Max(4) @IsOptional()
  pase_izquierda?: number;

  @IsEnum(TechnicalClassification)
  @IsOptional()
  pase_clasificacion?: TechnicalClassification;

  @IsString()
  @IsOptional()
  pase_notas?: string;

  // ── Definición (0-2 por carril/pierna) ───────────────────────
  @IsInt() @Min(0) @Max(2) @IsOptional()
  definicion_carril_der_dr?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  definicion_carril_der_iz?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  definicion_carril_cen_dr?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  definicion_carril_cen_iz?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  definicion_carril_izq_dr?: number;

  @IsInt() @Min(0) @Max(2) @IsOptional()
  definicion_carril_izq_iz?: number;

  @IsEnum(TechnicalClassification)
  @IsOptional()
  definicion_clasificacion?: TechnicalClassification;

  @IsString()
  @IsOptional()
  definicion_notas?: string;
}
