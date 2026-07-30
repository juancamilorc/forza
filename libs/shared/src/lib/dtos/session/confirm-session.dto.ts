import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class ConfirmSessionDto {
  @IsString()
  @IsNotEmpty()
  confirmation_token!: string;

  @IsBoolean()
  @IsNotEmpty()
  confirmed!: boolean;
}
