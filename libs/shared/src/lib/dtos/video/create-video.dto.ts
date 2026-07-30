import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateVideoDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUrl()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  uploaded_by?: string;
}
