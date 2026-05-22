import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';

export enum PaymentMethod {
  TRANSFERENCIA = 'transferencia',
  EFECTIVO      = 'efectivo',
  OTRO          = 'otro',
}

export enum PaymentStatus {
  PENDIENTE = 'pendiente',
  PARCIAL   = 'parcial',
  PAGADO    = 'pagado',
}

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  athlete_id!: string;

  @IsString()
  @IsOptional()
  plan_id?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount_paid?: number;

  @IsDateString()
  @IsOptional()
  payment_date?: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @IsString()
  @IsOptional()
  referencia?: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  registered_by?: string;
}
