import {
  IsUUID, IsNotEmpty, IsDateString, IsOptional,
  IsString, IsNumber, IsEnum, IsInt, Min, Max,
} from 'class-validator';

export enum PhysicalClassification {
  EXCELENTE        = 'excelente',
  BUENO            = 'bueno',
  PROMEDIO         = 'promedio',
  DEBAJO_PROMEDIO  = 'debajo_promedio',
}

export class CreatePhysicalAssessmentDto {
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

  // ── Movilidad overhead squat (0-3) ────────────────────────────
  @IsInt() @Min(0) @Max(3) @IsOptional()
  movilidad_pies?: number;

  @IsString() @IsOptional()
  movilidad_pies_analisis?: string;

  @IsInt() @Min(0) @Max(3) @IsOptional()
  movilidad_rodillas?: number;

  @IsString() @IsOptional()
  movilidad_rodillas_analisis?: string;

  @IsInt() @Min(0) @Max(3) @IsOptional()
  movilidad_talones?: number;

  @IsString() @IsOptional()
  movilidad_talones_analisis?: string;

  @IsInt() @Min(0) @Max(3) @IsOptional()
  movilidad_cadera?: number;

  @IsString() @IsOptional()
  movilidad_cadera_analisis?: string;

  @IsInt() @Min(0) @Max(3) @IsOptional()
  movilidad_tronco?: number;

  @IsString() @IsOptional()
  movilidad_tronco_analisis?: string;

  @IsInt() @Min(0) @Max(3) @IsOptional()
  movilidad_brazos?: number;

  @IsString() @IsOptional()
  movilidad_brazos_analisis?: string;

  @IsEnum(PhysicalClassification)
  @IsOptional()
  movilidad_clasificacion?: PhysicalClassification;

  @IsString() @IsOptional()
  movilidad_notas?: string;

  @IsString() @IsOptional()
  sentadilla_foto_url?: string;

  // ── Salto vertical ────────────────────────────────────────────
  @IsNumber() @IsOptional()
  salto_vertical_cm?: number;

  @IsEnum(PhysicalClassification)
  @IsOptional()
  salto_vertical_clasificacion?: PhysicalClassification;

  @IsString() @IsOptional()
  salto_vertical_notas?: string;

  // ── Salto horizontal ──────────────────────────────────────────
  @IsNumber() @IsOptional()
  salto_horizontal_cm?: number;

  @IsEnum(PhysicalClassification)
  @IsOptional()
  salto_horizontal_clasificacion?: PhysicalClassification;

  @IsString() @IsOptional()
  salto_horizontal_notas?: string;

  // ── Sprint progresivo (segundos) ──────────────────────────────
  @IsNumber() @IsOptional()
  sprint_5m?: number;

  @IsNumber() @IsOptional()
  sprint_10m?: number;

  @IsNumber() @IsOptional()
  sprint_15m?: number;

  @IsNumber() @IsOptional()
  sprint_20m?: number;
}
