import { IsUUID, IsNotEmpty, IsBoolean } from 'class-validator';

export class ConfirmSessionDto {
  @IsUUID('all')
  @IsNotEmpty()
  confirmation_token!: string;

  @IsBoolean()
  @IsNotEmpty()
  confirmed!: boolean;
}
