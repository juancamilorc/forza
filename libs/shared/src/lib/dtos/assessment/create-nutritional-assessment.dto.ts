import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';

export enum NutritionalClassification {
  BAJO      = 'bajo',
  ADECUADO  = 'adecuado',
  ACEPTABLE = 'aceptable',
  ALTO      = 'alto',
}

export class CreateNutritionalAssessmentDto {
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

  @IsString()
  @IsOptional()
  position?: string;

  // ── Medidas crudas ───────────────────────────────────────────
  @IsNumber()
  @IsOptional()
  peso_kg?: number;

  @IsNumber()
  @IsOptional()
  talla_cm?: number;

  @IsNumber()
  @IsOptional()
  perimetro_muneca_cm?: number;

  @IsNumber()
  @IsOptional()
  pliegue_tricipital_mm?: number;

  @IsNumber()
  @IsOptional()
  pliegue_subescapular_mm?: number;

  @IsNumber()
  @IsOptional()
  pliegue_supraespinal_mm?: number;

  @IsNumber()
  @IsOptional()
  pliegue_abdominal_mm?: number;

  @IsNumber()
  @IsOptional()
  pliegue_muslo_mm?: number;

  @IsNumber()
  @IsOptional()
  pliegue_pantorrilla_mm?: number;

  @IsNumber()
  @IsOptional()
  perimetro_pantorrilla_cm?: number;

  @IsNumber()
  @IsOptional()
  perimetro_brazo_tenso_cm?: number;

  @IsNumber()
  @IsOptional()
  perimetro_brazo_cm?: number;

  @IsNumber()
  @IsOptional()
  diametro_humero_cm?: number;

  @IsNumber()
  @IsOptional()
  diametro_femur_cm?: number;

  // ── Meta ─────────────────────────────────────────────────────
  @IsNumber()
  @IsOptional()
  porcentaje_grasa_deseado?: number;

  // ── Clasificaciones manuales ─────────────────────────────────
  @IsEnum(NutritionalClassification)
  @IsOptional()
  clasificacion_grasa?: NutritionalClassification;

  @IsEnum(NutritionalClassification)
  @IsOptional()
  clasificacion_iaks?: NutritionalClassification;

  @IsEnum(NutritionalClassification)
  @IsOptional()
  clasificacion_pliegues?: NutritionalClassification;

  @IsString()
  @IsOptional()
  clasificacion_imc?: string;

  @IsString()
  @IsOptional()
  clasificacion_talla_edad?: string;

  // ── Plan alimenticio ─────────────────────────────────────────
  @IsString()
  @IsOptional()
  horario_entrenamiento?: string;

  @IsString()
  @IsOptional()
  plan_desayuno?: string;

  @IsString()
  @IsOptional()
  plan_media_manana?: string;

  @IsString()
  @IsOptional()
  plan_almuerzo?: string;

  @IsString()
  @IsOptional()
  plan_media_tarde?: string;

  @IsString()
  @IsOptional()
  plan_cena?: string;

  @IsString()
  @IsOptional()
  plan_finde?: string;

  // ── Texto libre ───────────────────────────────────────────────
  @IsString()
  @IsOptional()
  clasificacion_antropometrica?: string;

  @IsString()
  @IsOptional()
  recomendaciones?: string;

  @IsString()
  @IsOptional()
  notas_comparacion?: string;
}
