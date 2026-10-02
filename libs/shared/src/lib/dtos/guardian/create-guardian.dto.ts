import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export class CreateGuardianDto {
  @IsString()
  @IsNotEmpty()
  athlete_id!: string;

  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsString()
  @IsNotEmpty()
  whatsapp_phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
