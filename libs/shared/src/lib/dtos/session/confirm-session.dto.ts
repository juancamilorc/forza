import { IsUUID, IsNotEmpty, IsBoolean } from 'class-validator';

export class ConfirmSessionDto {
  @IsUUID()
  @IsNotEmpty()
  confirmation_token!: string;

  @IsBoolean()
  @IsNotEmpty()
  confirmed!: boolean;
}
